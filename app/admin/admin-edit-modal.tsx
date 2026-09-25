import type { Market } from "@/lib/markets";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { OrderEditor } from "./admin-order-editor";
import { ProductEditor } from "./admin-product-editor";
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
  return (
    <div
      className="cms-overlay"
      style={{position:"fixed",inset:0,zIndex:12000,display:"flex",alignItems:"stretch",justifyContent:"flex-end",padding:"18px",background:"rgba(11,23,36,.38)",overflow:"hidden"}}
      onClick={(event) => {
        if (event.target === event.currentTarget) setEditing(null);
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
          {editingType==="order"&&editing.id&&deleteOrder&&<button type="button" className="cms-danger" disabled={busy} onClick={()=>void deleteOrder(editing)}>Supprimer</button>}
          <button type="button" className="cms-secondary" onClick={() => setEditing(null)}>Annuler</button>
          <button className="cms-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          <button type="button" className="cms-close" aria-label="Fermer" onClick={() => setEditing(null)} style={{position:"static",flex:"0 0 auto"}}>×</button>
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
