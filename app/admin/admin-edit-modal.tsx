import type { Market } from "@/lib/markets";
import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { OrderEditor } from "./admin-order-editor";
import { ProductEditor } from "./admin-product-editor";
import { request } from "./admin-shared";
import { PromotionEditor } from "./admin-promotion-editor";
import type { Row } from "./admin-shared";

export type EditingType = "product" | "promotion" | "order";

export function AdminEditModal({ editing, editingType, setEditing, save, update, upload, busy, market, products, deleteOrder }: {
  editing: Row;
  editingType: EditingType;
  setEditing: Dispatch<SetStateAction<Row | null>>;
  save: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  update: (field: string, value: string | number | boolean) => void;
  upload: (files?: FileList | File[]) => Promise<string[]>;
  busy: boolean;
  market: Market;
  products: Row[];
  deleteOrder?: (order: Row) => void | Promise<void>;
}) {
  const [selectedPhotoCount, setSelectedPhotoCount] = useState(0);
  const originalEditing = useRef<Row>({ ...editing });
  const cancelling = useRef(false);

  const cancelEditing = async () => {
    if (cancelling.current || busy) return;
    cancelling.current = true;
    try {
      const original = originalEditing.current;
      if (editingType === "product" && original.id) {
        await request("/api/admin/products", {
          method: "PUT",
          body: JSON.stringify(original),
        });
      }
      setEditing(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Impossible d’annuler les modifications.");
    } finally {
      cancelling.current = false;
    }
  };

  useEffect(() => {
    const onSelection = (event: Event) => {
      const custom = event as CustomEvent<{ count?: number }>;
      setSelectedPhotoCount(Number(custom.detail?.count || 0));
    };
    window.addEventListener("cms-photo-selection", onSelection);
    return () => window.removeEventListener("cms-photo-selection", onSelection);
  }, []);

  const scrollToPhotoActions = () => {
    document.querySelector<HTMLElement>("[data-cms-selected-photo-actions]")?.scrollIntoView({block:"center",behavior:"smooth"});
  };

  const analyzeProduct = async () => {
    const imageUrl = String(editing.image_url || "").trim();
    if (!imageUrl || busy) return;
    try {
      const result = await request("/api/admin/analyze-product", {
        method: "POST",
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const suggestion = result.suggestion;
      if (!suggestion || typeof suggestion !== "object" || Array.isArray(suggestion)) return;
      const fields = suggestion as Record<string, unknown>;
      for (const field of ["name_fr", "name_en", "description_fr", "description_en", "category", "brand", "ages"]) {
        if (typeof fields[field] === "string" && fields[field]) update(field, fields[field] as string);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Analyse IA impossible.");
    }
  };

  const duplicateAsNewProduct = () => {
    if (!editing.id) return;
    if (!window.confirm("Créer une nouvelle fiche à partir de cet article ? L’article actuel ne sera pas modifié tant que la nouvelle fiche n’est pas enregistrée.")) return;
    setEditing((current) => current ? {
      ...current,
      id: undefined,
      article_number: undefined,
      name_fr: `${String(current.name_fr || "")} — nouveau produit`,
      stock_qc: 1,
      stock_conakry: 1,
      visible_qc: false,
      visible_conakry: false,
      visible: false,
      featured: false,
    } : current);
  };

  return (
    <div
      className="cms-overlay"
      style={{position:"fixed",inset:0,zIndex:12000,display:"flex",alignItems:"stretch",justifyContent:"flex-end",padding:"18px",background:"rgba(11,23,36,.38)",overflow:"hidden"}}
      onClick={(event) => {
        if (event.target === event.currentTarget) void cancelEditing();
      }}
    >
      <form
        className="cms-editor cms-form"
        onSubmit={save}
        style={{position:"relative",width:"min(760px,calc(100vw - 36px))",maxWidth:"100%",height:"calc(100dvh - 36px)",maxHeight:"calc(100dvh - 36px)",overflow:"hidden",borderRadius:16,background:"#fff",boxShadow:"0 18px 60px rgba(0,0,0,.24)",boxSizing:"border-box",display:"flex",flexDirection:"column"}}
      >
        <div
          className="cms-editor-actions"
          style={{position:"relative",zIndex:100,flex:"0 0 auto",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"#fff",borderBottom:"2px solid #b9cbd5",boxShadow:"0 6px 16px rgba(20,45,60,.14)"}}
        >
          <h2 style={{margin:0,fontSize:18,flex:1}}>
            {editing.id ? "Modifier" : "Ajouter"}{" "}
            {editingType === "product" ? "un produit" : editingType === "promotion" ? "une promotion" : "une commande"}
          </h2>
          {editingType==="product"&&selectedPhotoCount>0&&<button type="button" className="cms-primary" onClick={scrollToPhotoActions}>📷 {selectedPhotoCount} sélectionnée{selectedPhotoCount>1?"s":""} · Actions</button>}
          {editingType==="product"&&<button type="button" className="cms-secondary" disabled={busy||!editing.image_url} onClick={()=>void analyzeProduct()}>✨ IA</button>}
          {editingType==="product"&&editing.id&&<button type="button" className="cms-secondary" disabled={busy} onClick={duplicateAsNewProduct}>＋ Nouveau produit</button>}
          {editingType==="order"&&editing.id&&deleteOrder&&<button type="button" className="cms-danger" disabled={busy} onClick={()=>void deleteOrder(editing)}>Supprimer</button>}
          <button type="button" className="cms-secondary" disabled={busy} onClick={() => void cancelEditing()}>Annuler</button>
          <button className="cms-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          <button type="button" className="cms-close" aria-label="Fermer" disabled={busy} onClick={() => void cancelEditing()} style={{position:"static",flex:"0 0 auto"}}>×</button>
        </div>
        <div style={{flex:"1 1 auto",minHeight:0,overflowY:"auto",overflowX:"hidden",overscrollBehavior:"contain",padding:"16px 24px 96px"}}>
          {editingType === "product" && <ProductEditor editing={editing} setEditing={setEditing} update={update} upload={upload} />}
          {editingType === "promotion" && <PromotionEditor editing={editing} market={market} update={update} />}
          {editingType === "order" && <OrderEditor editing={editing} market={market} products={products} update={update} />}
        </div>
      </form>
    </div>
  );
}
