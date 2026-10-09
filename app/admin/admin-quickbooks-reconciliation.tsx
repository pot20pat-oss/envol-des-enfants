"use client";

import { Fragment, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createNameCandidateSearch, type NameCandidate } from "@/lib/quickbooks-name-candidates";
import { markets, type Market } from "@/lib/markets";
import { type Row } from "./admin-shared";

type CsvSheet = { headers: string[]; rows: string[][]; filename: string };
type ReviewDecision = "review" | "rejected";
type ReviewDecisions = Record<string, ReviewDecision>;
const reviewKey = (cmsId: string, rowNumber: number) => cmsId + "::" + rowNumber;
const reviewLabel = (decision?: ReviewDecision) =>
  decision === "review" ? "Piste retenue (non vérifiée)" :
  decision === "rejected" ? "Piste écartée" : "Non examiné";
type Comparison = {
  id: string;
  article: string;
  productName: string;
  sameCmsNameCount: number;
  cmsPrice: number;
  cmsStock: number;
  visible: boolean;
  sku: string;
  qboName: string;
  qboSku: string;
  qboStock: string;
  qboItemId: string;
  qboType: string;
  nameCandidates: NameCandidate[];
  status: "exact_sku" | "duplicate_cms" | "duplicate_quickbooks" |
    "not_found" | "missing_article" | "not_inventory";
};
const normalized = (value: unknown) => String(value ?? "").trim().toLocaleUpperCase("en");
const cleanHeader = (s: string) => s.trim().toLocaleLowerCase("fr")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

/** RFC 4180-style CSV parser with UTF-8 BOM, quotes, newlines and ; / tab support. */
function parseCsv(contents: string): string[][] {
  const text = contents.replace(/^\uFEFF/, "");
  const firstLine = text.slice(0, text.indexOf("\n") >= 0 ? text.indexOf("\n") : 4000);
  const count = (separator: string) => {
    let amount = 0, quoted = false;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (quoted && firstLine[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && firstLine[i] === separator) amount++;
    }
    return amount;
  };
  const delimiter = ["\t", ";", ","].sort((a, b) => count(b) - count(a))[0];
  const result: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(field); field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(cell => cell.trim())) result.push(row);
      if (result.length > 20001) throw new Error("Export trop volumineux (maximum 20 000 lignes).");
      row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV incomplet : guillemet non fermé.");
  row.push(field);
  if (row.some(cell => cell.trim())) result.push(row);
  if (result.length < 2) throw new Error("Le fichier doit contenir une ligne d'en-têtes et des produits.");
  return result;
}
function suggestedColumn(headers: string[], variants: string[]): number {
  return headers.findIndex(header => variants.includes(cleanHeader(header)));
}
function exportCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function downloadCsv(records: Comparison[], region: Market, reviews: ReviewDecisions) {
  const labels = ["Région", "Produit CMS ID", "Article CMS", "Nom CMS",
    "SKU CMS proposé", "Stock CMS", "Prix CMS", "Visible CMS",
    "État du rapprochement", "SKU QuickBooks", "Nom QuickBooks",
    "Stock QuickBooks (lecture seulement)", "Identifiant QuickBooks", "Type QuickBooks",
    "Fiches CMS partageant le nom", "Nom suggéré 1", "UGS suggérée 1", "Score 1", "Décision 1",
    "Nom suggéré 2", "UGS suggérée 2", "Score 2", "Décision 2",
    "Nom suggéré 3", "UGS suggérée 3", "Score 3", "Décision 3"];
  const body = records.map(row => [
    region, row.id, row.article, row.productName, row.sku, row.cmsStock,
    row.cmsPrice, row.visible ? "oui" : "non", row.status,
    row.qboSku, row.qboName, row.qboStock, row.qboItemId, row.qboType,
    row.sameCmsNameCount, ...[0,1,2].flatMap(i => {
      const suggested = row.nameCandidates[i];
      return suggested ? [suggested.name,suggested.sku,suggested.score,
        reviewLabel(reviews[reviewKey(row.id,suggested.rowNumber)])] : ["","","",""];
    }),
  ]);
  const csv = [labels, ...body].map(line => line.map(exportCell).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "rapprochement-quickbooks-" + region + ".csv";
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(url);
}

export function QuickBooksReconciliationSection({
  products, market,
}: { products: Row[]; market: Market }) {
  const [sheet, setSheet] = useState<CsvSheet | null>(null);
  const [error, setError] = useState("");
  const [skuIndex, setSkuIndex] = useState(-1);
  const [nameIndex, setNameIndex] = useState(-1);
  const [stockIndex, setStockIndex] = useState(-1);
  const [idIndex, setIdIndex] = useState(-1);
  const [typeIndex, setTypeIndex] = useState(-1);
  const [filter, setFilter] = useState("all");
  const [expandedCandidates, setExpandedCandidates] = useState("");
  const [reviewDecisions, setReviewDecisions] = useState<ReviewDecisions>({});
  // Browser-session only; no review decisions are sent to CMS or QuickBooks.
  useEffect(() => {
    setReviewDecisions({});
    setExpandedCandidates("");
  }, [market]);
  function markCandidate(cmsId: string, rowNumber: number, decision: ReviewDecision) {
    setReviewDecisions(previous => {
      const updated = { ...previous };
      const key = reviewKey(cmsId,rowNumber);
      if (updated[key] === decision) {
        delete updated[key];
      } else {
        // Keep at most one provisional candidate per CMS record. This is NOT
        // an association and does not validate the QuickBooks item identity.
        if (decision === "review") {
          for (const oldKey of Object.keys(updated)) {
            if (oldKey.startsWith(cmsId + "::") && updated[oldKey] === "review")
              delete updated[oldKey];
          }
        }
        updated[key] = decision;
      }
      return updated;
    });
  }

  async function openCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(""); setSheet(null); setReviewDecisions({}); setExpandedCandidates("");
    if (!file) return;
    if (file.size > 5_000_000) { setError("Fichier trop volumineux (maximum 5 Mo)."); return; }
    if (!/\.csv$/i.test(file.name)) { setError("Enregistre d'abord l'export QuickBooks au format CSV UTF-8."); return; }
    try {
      const rows = parseCsv(await file.text());
      const headers = rows[0].map(header => header.trim());
      if (headers.length < 2) throw new Error("En-têtes CSV insuffisants.");
      setSheet({ headers, rows: rows.slice(1), filename: file.name });
      setSkuIndex(suggestedColumn(headers,
        ["sku", "ugs", "reference", "referenceduproduit", "numerodarticle", "codedarticle", "itemsku"]));
      setNameIndex(suggestedColumn(headers,
        ["name", "nom", "productservice", "produitservice", "produitservicenom", "productname", "nomduproduit"]));
      setStockIndex(suggestedColumn(headers,
        ["qtyonhand", "quantityonhand", "quantiteenstock", "quantite", "quantity"]));
      setIdIndex(suggestedColumn(headers,
        ["id", "itemid", "productid", "identifiant", "identifiantarticle"]));
      setTypeIndex(suggestedColumn(headers,
        ["type","itemtype","producttype","typedarticle","typeduproduit"]));
      setFilter("all");
      setExpandedCandidates("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fichier CSV invalide.");
    }
  }

  const { comparisons, totals } = useMemo(() => {
    const rows: Comparison[] = [];
    const cmsCounts = new Map<string,number>();
    const cmsNameCounts = new Map<string,number>();
    for (const product of products) {
      const article = normalized(product.article_number);
      if (article) cmsCounts.set(article, (cmsCounts.get(article) || 0) + 1);
      const productName = normalized(product.name_fr);
      if (productName) cmsNameCounts.set(productName, (cmsNameCounts.get(productName) || 0) + 1);
    }
    const importedBySku = new Map<string, string[][]>();
    if (sheet && skuIndex >= 0) for (const record of sheet.rows) {
      const sku = normalized(record[skuIndex]);
      if (sku) importedBySku.set(sku, [...(importedBySku.get(sku) || []), record]);
    }
    const searchByName = sheet && nameIndex >= 0
      ? createNameCandidateSearch(sheet.rows.map((record,i)=>({
          name: String(record[nameIndex] ?? ""),
          sku: skuIndex >= 0 ? String(record[skuIndex] ?? "") : "",
          stock: stockIndex >= 0 ? String(record[stockIndex] ?? "") : "",
          type: typeIndex >= 0 ? String(record[typeIndex] ?? "") : "",
          itemId: idIndex >= 0 ? String(record[idIndex] ?? "") : "",
          rowNumber: i + 2,
        }))) : null;
    for (const product of products) {
      const article = String(product.article_number ?? "").trim();
      const id = String(product.id ?? "");
      const candidate = (market === "qc" ? "ENV-QC-" : "ENV-CN-") + article;
      const possible = article
        ? [...new Set([normalized(article), normalized(candidate)])]
          .flatMap(key => importedBySku.get(key) || [])
        : [];
      const deduplicated = [...new Set(possible)];
      const lone = deduplicated.length === 1 ? deduplicated[0] : null;
      const qbType = lone && typeIndex >= 0 ? normalized(lone[typeIndex]) : "";
      const nonInventory = !!qbType && !["INVENTORY", "INVENTAIRE", "STOCK", "PRODUIT EN STOCK", "PRODUIT STOCKE", "PRODUIT STOCKÉ"].includes(qbType);
      const status: Comparison["status"] = !article ? "missing_article"
        : (cmsCounts.get(normalized(article)) || 0) > 1 ? "duplicate_cms"
        : deduplicated.length > 1 ? "duplicate_quickbooks"
        : deduplicated.length === 1 && nonInventory ? "not_inventory"
        : deduplicated.length === 1 ? "exact_sku" : "not_found";
      const match = status === "exact_sku" ? deduplicated[0] : null;
      const nameCandidates = status === "not_found" && searchByName
        ? searchByName(String(product.name_fr || ""),3) : [];
      rows.push({
        id, article, productName: String(product.name_fr || ""),
        sameCmsNameCount: cmsNameCounts.get(normalized(product.name_fr)) || 1,
        cmsPrice: Number(product[market === "qc" ? "price_qc" : "price_conakry"] || 0),
        cmsStock: Number(product[market === "qc" ? "stock_qc" : "stock_conakry"] || 0),
        visible: Number(product[market === "qc" ? "visible_qc" : "visible_conakry"]) === 1 ||
          product[market === "qc" ? "visible_qc" : "visible_conakry"] === true,
        sku: article ? candidate : "",
        qboName: match && nameIndex >= 0 ? String(match[nameIndex] || "") : "",
        qboSku: match && skuIndex >= 0 ? String(match[skuIndex] || "") : "",
        qboStock: match && stockIndex >= 0 ? String(match[stockIndex] || "") : "",
        qboItemId: match && idIndex >= 0 ? String(match[idIndex] || "") : "",
        qboType: match && typeIndex >= 0 ? String(match[typeIndex] || "") : "",
        nameCandidates,
        status,
      });
    }
    return {
      comparisons: rows,
      totals: {
        exact: rows.filter(r => r.status === "exact_sku").length,
        unmatched: rows.filter(r => r.status === "not_found").length,
        duplicates: rows.filter(r => r.status === "duplicate_cms" ||
          r.status === "duplicate_quickbooks").length,
        noArticle: rows.filter(r => r.status === "missing_article").length,
        withNameSuggestions: rows.filter(r => r.nameCandidates.length > 0).length,
      },
    };
  }, [products, market, sheet, skuIndex, nameIndex, stockIndex, idIndex, typeIndex]);

  const reviewCounts = {
    kept: Object.values(reviewDecisions).filter(v => v === "review").length,
    rejected: Object.values(reviewDecisions).filter(v => v === "rejected").length,
  };
  const displayed = comparisons.filter(item => filter === "all" ||
    (filter === "has_name_candidate" ? item.nameCandidates.length > 0 : item.status === filter)).slice(0, 80);
  const columnSelector = (label: string, index: number, change: (value: number) => void) =>
    <label style={{display:"grid",gap:6,flex:"1 1 190px"}}>{label}
      <select value={index} onChange={event=>change(Number(event.target.value))}>
        <option value={-1}>Non disponible</option>
        {sheet?.headers.map((head,i)=><option key={i} value={i}>{head || "Colonne " + (i+1)}</option>)}
      </select>
    </label>;
  return <section className="cms-panel">
    <div className="cms-panel-title"><h2>Rapprochement QuickBooks · {markets[market].label}</h2></div>
    <p><strong>Lecture seule :</strong> cet outil sert à comparer un export CSV de la
      véritable compagnie QuickBooks avec le catalogue du CMS. Aucune donnée du fichier
      QuickBooks n'est envoyée au serveur : le traitement se fait dans ce navigateur.
      Il ne crée ni association, ni facture, ni écriture de stock.</p>
    <p>Dans QuickBooks, exporte la liste des <strong>produits et services</strong>, incluant
      idéalement SKU / référence, nom, quantité en stock et identifiant de l'article.
      Si QuickBooks fournit un fichier Excel, enregistre une copie au format CSV UTF-8.</p>
    <div className="cms-panel cms-form" style={{padding:18,marginTop:18}}>
      <h3>1. Importer l'export QuickBooks pour comparaison</h3>
      <label>Fichier CSV (reste dans le navigateur)
        <input type="file" accept=".csv,text/csv" onChange={event=>void openCsv(event)} />
      </label>
      {error && <p className="cms-error" role="alert">{error}</p>}
      {sheet && <>
        <p>Fichier : <strong>{sheet.filename}</strong> · {sheet.rows.length} lignes lues</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {columnSelector("Colonne SKU / référence",skuIndex,setSkuIndex)}
          {columnSelector("Colonne nom",nameIndex,setNameIndex)}
          {columnSelector("Colonne quantité",stockIndex,setStockIndex)}
          {columnSelector("Colonne ID QuickBooks (facultative)",idIndex,setIdIndex)}
          {columnSelector("Colonne type d’article (Inventory)",typeIndex,setTypeIndex)}
        </div>
        {skuIndex < 0 && <p className="cms-error">
          Sélectionne la colonne SKU / référence. Aucun rapprochement n'est autorisé par le seul nom du produit.
        </p>}
      </>}
    </div>
    <div className="cms-panel" style={{padding:18,marginTop:18}}>
      <h3>2. Résultat — {markets[market].label}</h3>
      <p>Produits CMS examinés : <strong>{comparisons.length}</strong> · SKU exacts (non vérifiés) :
        <strong> {sheet && skuIndex >= 0 ? totals.exact : "—"}</strong> ·
        Doublons : <strong>{totals.duplicates}</strong> · Références absentes :
        <strong> {totals.noArticle}</strong></p>
      <p>Suggestions par nom (non vérifiées) : <strong>{sheet && nameIndex >= 0 ? totals.withNameSuggestions : "—"}</strong> produits.
        Ce compteur ne signifie pas que ces produits sont identiques.
      </p>
      <p>Un SKU identique n'est qu'un indice : il faut vérifier manuellement le produit,
        son marché, son type Inventory, son identifiant QuickBooks et sa valorisation
        avant toute association.</p>
      <p><strong>Décisions provisoires :</strong> {reviewCounts.kept} piste(s) retenue(s)
        pour vérification, {reviewCounts.rejected} écartée(s). Ces choix restent
        dans ce navigateur jusqu'à l'exportation du rapport; ils ne constituent
        <strong> aucune association QuickBooks confirmée</strong>.</p>
      <p><strong>Attention :</strong> le CSV exporté par QuickBooks ne contient pas
        d'identifiant stable d'article. Il faudra le récupérer et vérifier
        individuellement avant de créer des correspondances dans D1.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",marginBlock:12}}>
        <label>Filtre
          <select value={filter} onChange={event=>setFilter(event.target.value)}>
            <option value="all">Tous les produits</option>
            <option value="exact_sku">SKU exacts non vérifiés</option>
            <option value="not_found">Sans correspondance SKU</option>
            <option value="has_name_candidate">Suggestions par nom à examiner</option>
            <option value="duplicate_cms">Références CMS en double</option>
            <option value="duplicate_quickbooks">SKU QuickBooks en double</option>
            <option value="missing_article">Sans référence CMS</option>
            <option value="not_inventory">Type QuickBooks non admissible</option>
          </select>
        </label>
        <button type="button" className="cms-secondary" disabled={!sheet || skuIndex < 0}
          onClick={()=>downloadCsv(comparisons,market,reviewDecisions)}>Exporter le rapport CSV avec décisions</button>
      </div>
      <div className="cms-table-wrap"><table>
        <thead><tr><th>Article CMS</th><th>Produit CMS</th><th>SKU proposé</th>
          <th>Correspondance</th><th>Article QuickBooks</th><th>Stock CMS / QB</th></tr></thead>
        <tbody>{displayed.map(item=><Fragment key={item.id}>
          <tr>
            <td>{item.article || "—"}</td>
            <td>{item.productName}<small>{item.visible ? "Visible" : "Masqué"}</small>
              {item.sameCmsNameCount>1 && <small style={{fontWeight:700}}>
                {item.sameCmsNameCount} fiches CMS portent ce nom : vérifier les références séparément
              </small>}
            </td>
            <td>{item.sku || "—"}</td>
            <td>
              {sheet && skuIndex >= 0 ? ({
                exact_sku:"SKU identique — à vérifier", duplicate_cms:"Doublon CMS",
                duplicate_quickbooks:"Doublon QuickBooks", not_found:"SKU non trouvé",
                missing_article:"Référence absente",
                not_inventory:"SKU présent, mais type non Inventory",
              })[item.status] : "Importer un CSV"}
              {item.nameCandidates.length>0 && <div style={{marginTop:8}}>
                <button type="button" className="cms-secondary"
                  aria-expanded={expandedCandidates===item.id}
                  onClick={()=>setExpandedCandidates(expandedCandidates===item.id?"":item.id)}>
                  {item.nameCandidates.length} proposition(s) par nom ▾
                </button>
              </div>}
            </td>
            <td>{item.qboName || "—"}{item.qboItemId&&<small>ID : {item.qboItemId}</small>}</td>
            <td>{item.cmsStock} / {item.qboStock || "—"}</td>
          </tr>
          {expandedCandidates===item.id && item.nameCandidates.length>0 &&
            <tr><td colSpan={6} style={{padding:16,background:"rgba(120,150,165,.08)"}}>
              <strong>Articles QuickBooks suggérés pour : {item.productName}</strong>
              <p style={{marginBlock:8}}>Suggestions non vérifiées fondées uniquement sur les noms.
                Comparer manuellement le produit, sa référence fabricant, la couleur, la taille,
                la photo et la boutique. Ne pas modifier le stock.</p>
              <div className="cms-table-wrap"><table>
                <thead><tr><th>Nom QuickBooks</th><th>UGS QuickBooks</th>
                  <th>Score indicatif</th><th>Type</th><th>Stock QB</th><th>Vérification</th><th>Décision provisoire</th></tr></thead>
                <tbody>{item.nameCandidates.map(suggestion=>
                  <tr key={suggestion.rowNumber}>
                    <td>{suggestion.name}</td>
                    <td>{suggestion.sku || "—"}</td>
                    <td>{suggestion.score}/100 · {suggestion.reason==="exact_name"?"Nom identique":"Nom similaire"}</td>
                    <td>{suggestion.type || "Inconnu"}</td>
                    <td>{suggestion.stock || "—"}</td>
                    <td>{suggestion.caution}</td>
                    <td style={{minWidth:205}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:6}}>
                        <strong>{reviewLabel(reviewDecisions[reviewKey(item.id,suggestion.rowNumber)])}</strong>
                        <button type="button" className="cms-secondary"
                          aria-pressed={reviewDecisions[reviewKey(item.id,suggestion.rowNumber)] === "review"}
                          onClick={()=>markCandidate(item.id,suggestion.rowNumber,"review")}>
                          {reviewDecisions[reviewKey(item.id,suggestion.rowNumber)] === "review"
                            ? "Retirer de la liste" : "Retenir pour vérification"}
                        </button>
                        <button type="button" className="cms-secondary"
                          aria-pressed={reviewDecisions[reviewKey(item.id,suggestion.rowNumber)] === "rejected"}
                          onClick={()=>markCandidate(item.id,suggestion.rowNumber,"rejected")}>
                          {reviewDecisions[reviewKey(item.id,suggestion.rowNumber)] === "rejected"
                            ? "Annuler le rejet" : "Écarter cette piste"}
                        </button>
                      </div>
                    </td>
                  </tr>)}</tbody>
              </table></div>
            </td></tr>}
        </Fragment>)}</tbody>
      </table></div>
      {comparisons.length > displayed.length &&
        <p>Affichage limité à 80 lignes. Le rapport exporté contient les {comparisons.length} produits.</p>}
    </div>
    <p><strong>État :</strong> associations QuickBooks désactivées, écritures CMS et QuickBooks
      désactivées. Le Québec et Conakry doivent être rapprochés séparément.</p>
  </section>;
}
