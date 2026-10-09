"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { type Market, markets } from "@/lib/markets";
import { request, type Row } from "./admin-shared";

type ReturnEntry = {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string | null;
  customer_name?: string | null;
  article_number?: string | null;
  quantity: number;
  inspection_state: string;
  unused_confirmed: number;
  undamaged_confirmed: number;
  packaging_intact_confirmed: number;
  inspection_notes?: string | null;
  stock_posted: number;
  refund_state: string;
  region: Market;
  stock_qc: number | null;
  stock_conakry: number | null;
  created_at: string;
};
type Item = { product_id?: string; article_number?: string; name?: string; quantity?: number };

function orderItems(order: Row): Item[] {
  try {
    const decoded: unknown = JSON.parse(String(order.items_json || "[]"));
    return Array.isArray(decoded) ? decoded as Item[] : [];
  } catch { return []; }
}

const stateLabels: Record<string,string> = {
  awaiting_inspection: "À inspecter (en quarantaine)",
  quarantined: "Quarantaine — vérification nécessaire",
  approved_for_resale: "Neuf vérifié — en attente de remise en stock",
  not_resellable: "Non revendable — hors du stock",
};

export function ReturnsSection({ orders, market }: { orders: Row[]; market: Market }) {
  const [list, setList] = useState<ReturnEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [orderId, setOrderId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [activeReturn, setActiveReturn] = useState("");
  const [unused, setUnused] = useState(false);
  const [undamaged, setUndamaged] = useState(false);
  const [packaging, setPackaging] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [releaseTarget, setReleaseTarget] = useState("");
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);

  const delivered = useMemo(
    () => orders.filter((order) => String(order.region) === market &&
      String(order.status) === "delivered" &&
      orderItems(order).some((item) => item.product_id && Number(item.quantity) > 0)),
    [orders, market],
  );
  const selectedOrder = delivered.find((order) => String(order.id) === orderId);
  const items = selectedOrder ? orderItems(selectedOrder) : [];
  const selectedItem = items.find((item) => item.product_id === productId);
  const remainingMax = Math.max(0, Number(selectedItem?.quantity || 0) -
    list.filter((row) => row.order_id === orderId && row.product_id === productId)
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0));

  async function reload() {
    setLoading(true);
    try {
      const result = await request("/api/admin/returns?region=" + encodeURIComponent(market));
      setList(Array.isArray(result.returns) ? result.returns as ReturnEntry[] : []);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Retours indisponibles.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setList([]);
    setOrderId("");
    setProductId("");
    setActiveReturn("");
    setReleaseTarget("");
    setReleaseConfirmed(false);
    setNotice("");
    void reload();
  }, [market]);

  async function createReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder || !selectedItem || remainingMax < 1) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request("/api/admin/returns", {
        method: "POST",
        body: JSON.stringify({
          order_id: orderId, product_id: productId,
          quantity: Math.min(quantity, remainingMax), request_key: requestKey,
          notes: reason,
        }),
      });
      setNotice(result.already_recorded
        ? "Ce retour était déjà enregistré. Aucun doublon créé."
        : "Retour reçu et placé en quarantaine. Stock vendable inchangé.");
      setRequestKey(crypto.randomUUID());
      setReason("");
      setProductId("");
      await reload();
    } catch (failure) {
      // Keep the same idempotency key when retrying after a network error.
      setError(failure instanceof Error ? failure.message : "Enregistrement impossible.");
    } finally { setBusy(false); }
  }

  async function inspect(id: string, decision: "approve" | "reject" | "quarantine") {
    if (decision === "approve" && !(unused && undamaged && packaging)) return;
    if (decision === "reject" && inspectionNotes.trim().length < 3) {
      setError("Indique la raison du refus de revente."); return;
    }
    const question = decision === "approve"
      ? "Confirmer que ce produit est neuf, jamais utilisé, intact et que l'emballage est conforme ? Le stock vendable ne changera pas."
      : decision === "reject"
        ? "Classer définitivement ce produit hors du stock vendable ?"
        : "Maintenir cet article en quarantaine ?";
    if (!window.confirm(question)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("/api/admin/returns", {
        method: "PATCH",
        body: JSON.stringify({
          id, decision,
          unused_confirmed: unused,
          undamaged_confirmed: undamaged,
          packaging_intact_confirmed: packaging,
          notes: inspectionNotes,
        }),
      });
      setNotice(String(result.message || "Inspection enregistrée, sans ajustement de stock."));
      setActiveReturn("");
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Inspection impossible.");
    } finally { setBusy(false); }
  }

  const pendingRelease = list.find((item) => item.id === releaseTarget);
  const releaseStock = pendingRelease
    ? pendingRelease.region === "qc" ? pendingRelease.stock_qc : pendingRelease.stock_conakry
    : null;

  async function releaseApprovedReturn() {
    if (!pendingRelease || !releaseConfirmed || busy || pendingRelease.stock_posted ||
      pendingRelease.inspection_state !== "approved_for_resale" ||
      !Number.isSafeInteger(releaseStock) || Number(releaseStock) < 0) return;
    if (!window.confirm(`CONFIRMATION FINALE : ajouter ${pendingRelease.quantity} unité(s) de ${pendingRelease.product_name || pendingRelease.product_id} au stock vendable de ${markets[market].label} ? Cette opération modifie réellement le stock du CMS. Aucun remboursement ni ajustement QuickBooks ne sera émis.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("/api/admin/return-stock-release", {
        method: "POST",
        body: JSON.stringify({
          id: pendingRelease.id,
          product_id: pendingRelease.product_id,
          region: pendingRelease.region,
          quantity: pendingRelease.quantity,
          expected_stock: releaseStock,
          confirm_release: true,
        }),
      });
      setNotice(`Remise en stock confirmée : +${String(result.quantity_added)} unité(s). Stock de ${String(result.stock_before)} à ${String(result.stock_after)}. QuickBooks inchangé.`);
      setReleaseTarget(""); setReleaseConfirmed(false);
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Remise en stock impossible.");
      await reload();
    } finally { setBusy(false); }
  }

  return <section className="cms-panel">
    <div className="cms-panel-title"><h2>Retours et inspections · {markets[market].label}</h2>
      <button type="button" className="cms-secondary" onClick={() => void reload()} disabled={loading || busy}>
        Actualiser
      </button></div>
    <p>Un jouet retourné reste <strong>hors du stock vendable</strong>. La cliente doit confirmer
      qu'il est neuf, jamais utilisé, intact et que l'emballage permet une revente comme neuf.
      Le remboursement et la synchronisation QuickBooks seront gérés séparément.</p>
    {error && <p className="cms-error" role="alert">{error}</p>}
    {notice && <p className="cms-notice" role="status">{notice}</p>}
    <div className="cms-panel" style={{padding:18, marginBlock:20}}>
      <h3>Enregistrer un retour reçu</h3>
      {!delivered.length && <p className="cms-notice" role="status">
        Aucune commande livrée contenant des produits identifiés n'est disponible
        pour cette boutique. Le formulaire sera utilisable lorsqu'une commande
        réelle admissible aura été livrée. Ne crée pas de commande fictive ici.
      </p>}
      <form onSubmit={(event) => void createReturn(event)} className="cms-form">
        <label>Commande livrée
          <select required value={orderId} onChange={(event) => {
            setOrderId(event.target.value); setProductId(""); setQuantity(1);
            setRequestKey(crypto.randomUUID());
          }}>
            <option value="">Choisir une commande livrée</option>
            {delivered.map((order) => <option value={String(order.id)} key={String(order.id)}>
              {String(order.customer_name)} — {String(order.id).slice(0,8)}
            </option>)}
          </select>
        </label>
        <label>Produit retourné
          <select required value={productId} disabled={!selectedOrder} onChange={(event) => {
            setProductId(event.target.value); setQuantity(1);
            setRequestKey(crypto.randomUUID());
          }}>
            <option value="">Choisir un produit</option>
            {items.filter((item) => item.product_id).map((item) =>
              <option key={String(item.product_id)} value={String(item.product_id)}>
                {item.name || item.article_number || item.product_id} (vendu : {item.quantity})
              </option>)}
          </select>
        </label>
        <label>Quantité reçue (maximum restant : {remainingMax})
          <input type="number" min={1} max={Math.max(1,remainingMax)} required
            value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}/>
        </label>
        <label>Motif du retour / observations
          <textarea value={reason} onChange={(event) => setReason(event.target.value)}
            placeholder="Raison donnée par le client, état apparent à la réception…" maxLength={1000}/>
        </label>
        <button className="cms-primary" disabled={busy || !selectedItem ||
          !Number.isSafeInteger(quantity) || quantity < 1 || quantity > remainingMax}>
          Enregistrer en quarantaine — aucun stock ajouté
        </button>
      </form>
    </div>
    <h3>Retours enregistrés</h3>
    {loading && <p>Chargement des retours…</p>}
    {!loading && !list.length && <p>Aucun retour enregistré pour cette boutique.</p>}
    <div className="cms-table-wrap"><table><thead><tr>
      <th>Date</th><th>Client / commande</th><th>Produit</th><th>Qté</th>
      <th>Inspection</th><th>Stock</th><th>Action</th>
    </tr></thead><tbody>{list.map((item) =>
      <tr key={item.id}>
        <td>{new Date(item.created_at).toLocaleDateString("fr-CA")}</td>
        <td>{item.customer_name || "Client"}<small>{item.order_id.slice(0,8)}</small></td>
        <td>{item.product_name || item.product_id}<small>{item.article_number || ""}</small></td>
        <td>{item.quantity}</td>
        <td>{stateLabels[item.inspection_state] || item.inspection_state}</td>
        <td>{item.stock_posted ? "Remis en vente" : "Non ajouté"}</td>
        <td>
          {!item.stock_posted && ["awaiting_inspection","quarantined","approved_for_resale"].includes(item.inspection_state) &&
            <button type="button" className="cms-secondary" disabled={busy}
              onClick={() => {
                if (activeReturn === item.id) { setActiveReturn(""); return; }
                setReleaseTarget(""); setReleaseConfirmed(false);
                setActiveReturn(item.id);
                setUnused(Boolean(item.unused_confirmed));
                setUndamaged(Boolean(item.undamaged_confirmed));
                setPackaging(Boolean(item.packaging_intact_confirmed));
                setInspectionNotes(item.inspection_notes || "");
              }}>{item.inspection_state === "approved_for_resale" ? "Revoir l'inspection" : "Inspecter"}</button>}
          {!item.stock_posted && item.inspection_state === "approved_for_resale" &&
            <button type="button" className="cms-primary" disabled={busy}
              style={{marginLeft:8}} onClick={() => {
                setActiveReturn("");
                setReleaseTarget(item.id);
                setReleaseConfirmed(false);
              }}>Préparer remise en stock</button>}
        </td>
      </tr>)}</tbody></table></div>
    {pendingRelease && <div className="cms-panel cms-form" style={{padding:18,marginTop:20}}>
      <h3>Remise en stock — confirmation distincte</h3>
      <p><strong>{pendingRelease.product_name || pendingRelease.product_id}</strong> · {markets[market].label}</p>
      <p>Quantité à ajouter : <strong>+{pendingRelease.quantity}</strong>. Stock vendable actuel :
        <strong> {releaseStock === null ? "indisponible" : releaseStock}</strong>.
        Stock prévu après confirmation : <strong>{releaseStock === null ? "à vérifier" : Number(releaseStock) + Number(pendingRelease.quantity)}</strong>.</p>
      <p>L'inspection a été approuvée comme neuve. La remise en vente demande cette nouvelle confirmation.
        Ce traitement modifie réellement l'inventaire CMS, mais ne crée aucun remboursement ni ajustement QuickBooks.</p>
      <label style={{display:"flex",alignItems:"center",gap:10}}>
        <input style={{width:18,flex:"0 0 18px"}} type="checkbox" checked={releaseConfirmed}
          onChange={(event) => setReleaseConfirmed(event.target.checked)}/>
        Je confirme que ce jouet est neuf, jamais utilisé, intact et revendable, et j'autorise son ajout au stock disponible.
      </label>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button type="button" className="cms-primary"
          disabled={busy || !releaseConfirmed || !Number.isSafeInteger(releaseStock) || Number(releaseStock) < 0}
          onClick={() => void releaseApprovedReturn()}>
          Confirmer la remise en stock
        </button>
        <button type="button" className="cms-secondary" disabled={busy}
          onClick={() => {setReleaseTarget("");setReleaseConfirmed(false);}}>Annuler</button>
      </div>
    </div>}
    {activeReturn && <div className="cms-panel cms-form" style={{padding:18,marginTop:20}}>
      <h3>Inspection manuelle</h3>
      <p>Cocher uniquement les conditions <strong>vérifiées physiquement</strong>.</p>
      <label style={{display:"flex",alignItems:"center",gap:10}}><input style={{width:18,flex:"0 0 18px"}} type="checkbox" checked={unused} onChange={(event)=>setUnused(event.target.checked)}/>
        Jouet neuf, jamais utilisé</label>
      <label style={{display:"flex",alignItems:"center",gap:10}}><input style={{width:18,flex:"0 0 18px"}} type="checkbox" checked={undamaged} onChange={(event)=>setUndamaged(event.target.checked)}/>
        Jouet intact, sans défaut ni dommage</label>
      <label style={{display:"flex",alignItems:"center",gap:10}}><input style={{width:18,flex:"0 0 18px"}} type="checkbox" checked={packaging} onChange={(event)=>setPackaging(event.target.checked)}/>
        Emballage intact et conforme pour la vente comme neuf</label>
      <label>Observations d'inspection
        <textarea value={inspectionNotes} onChange={(event)=>setInspectionNotes(event.target.value)}
          maxLength={1000} placeholder="Décrire l'état du retour et les raisons de la décision"/>
      </label>
      <p><strong>Important :</strong> l'approbation de revente n'augmente pas encore le
        stock et n'émet ni avoir ni remboursement QuickBooks.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
        {list.find((item)=>item.id===activeReturn)?.inspection_state !== "approved_for_resale" &&
          <button type="button" className="cms-primary" disabled={busy || !(unused && undamaged && packaging)}
            onClick={()=>void inspect(activeReturn,"approve")}>Approuver l'état neuf</button>}
        <button type="button" className="cms-danger" disabled={busy || inspectionNotes.trim().length < 3}
          onClick={()=>void inspect(activeReturn,"reject")}>Non revendable</button>
        <button type="button" className="cms-secondary" disabled={busy}
          onClick={()=>void inspect(activeReturn,"quarantine")}>Maintenir en quarantaine</button>
      </div>
    </div>}
  </section>;
}
