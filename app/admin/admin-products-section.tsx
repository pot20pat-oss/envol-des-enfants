import { useState } from "react";
import { createPortal } from "react-dom";
import { marketPrice, markets, type Market } from "@/lib/markets";
import { categories, request, type Row } from "./admin-shared";
import { AiBatchImport } from "./admin-ai-batch-import";

export function ProductsSection({ products, catalogProducts, market, busy, search, setSearch, category, setCategory, visibility, setVisibility, stock, setStock, synchronize, add, edit, adjustStock, remove, reload }: {
  products: Row[]; catalogProducts: Row[]; market: Market; busy: boolean; search: string; setSearch: (value: string) => void;
  category: string; setCategory: (value: string) => void; visibility: string; setVisibility: (value: string) => void;
  stock: string; setStock: (value: string) => void; synchronize: () => void; add: () => void;
  edit: (product: Row) => void; adjustStock: (product: Row) => void; remove: (id: string) => void; reload: () => Promise<void>;
}) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [visibilityBusy, setVisibilityBusy] = useState<string | null>(null);
  const setProductBoutique = async (product: Row, availability: string) => { const id=String(product.id||""); if(!id)return; setVisibilityBusy(id); try { const visible_qc=availability==="qc"||availability==="both"; const visible_conakry=availability==="conakry"||availability==="both"; await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...product,visible_qc,visible_conakry,visible:visible_qc||visible_conakry})}); await reload(); } finally { setVisibilityBusy(null); } };
  const reset = () => { setSearch(""); setCategory("all"); setVisibility("all"); setStock("all"); };
  return <section className="cms-panel">
    <AiBatchImport market={market} busy={busy} onDone={reload} catalogProducts={catalogProducts} />
    <div className="cms-panel-title"><input className="cms-search" placeholder="Nom, marque ou numéro d’article…" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="cms-product-actions"><button className="cms-secondary" disabled={busy} onClick={synchronize}>↻ Synchroniser la boutique</button><button className="cms-primary" onClick={add}>+ Ajouter manuellement</button></div></div>
    <div className="cms-product-filters">
      <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Toutes les catégories</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Visibilité<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="all">Tous</option><option value="visible">Visibles</option><option value="hidden">Masqués</option><option value="qc">Québec seulement</option><option value="conakry">Conakry seulement</option><option value="both">Québec + Conakry</option></select></label>
      <label>Stock<select value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">Tous</option><option value="available">En stock</option><option value="low">Stock faible</option><option value="empty">Épuisés</option></select></label>
      <span className="cms-filter-count">{products.length} résultat(s)</span><button type="button" className="cms-secondary" onClick={reset}>Réinitialiser</button>
    </div>
    <div style={{display:"grid",gap:18,marginTop:20}}>
      {products.map((product) => <article key={String(product.id)} style={{display:"grid",gridTemplateColumns:"360px minmax(300px,1fr) auto",gap:24,alignItems:"center",padding:18,border:"1px solid #dce6eb",borderRadius:14,background:"#fff"}}>
        <button type="button" onClick={() => product.image_url && setZoomImage(String(product.image_url))} title="Agrandir l’image" style={{width:360,height:360,padding:0,border:"1px solid #dfe7ea",borderRadius:12,background:"#fff",overflow:"hidden",cursor:product.image_url?"zoom-in":"default"}}>
          {product.image_url ? <img src={String(product.image_url)} alt={String(product.name_fr||"")} style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}} /> : <span style={{fontSize:48,color:"#9aa8ae"}}>□</span>}
        </button>
        <div style={{display:"grid",gap:10,alignContent:"center"}}>
          <strong style={{fontSize:20}}>{String(product.name_fr)}</strong>
          <span>{String(product.name_en || "")}</span>
          <span><b>No d’article :</b> {String(product.article_number || "—")}</span>
          <span><b>Catégorie :</b> {categories[String(product.category)] || String(product.category)}</span>
          <span><b>Prix · {markets[market].label} :</b> {marketPrice(product[`price_${market}`], market)}</span>
          <span><b>Stock :</b> {String(product[`stock_${market}`] || 0)} <button className="cms-inline" onClick={() => adjustStock(product)}>Ajuster</button></span>
          <span style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><b>Visibilité :</b><select aria-label="Boutique où afficher le produit" disabled={visibilityBusy===String(product.id)} value={product.visible_qc&&product.visible_conakry?"both":product.visible_qc?"qc":product.visible_conakry?"conakry":"hidden"} onChange={e=>void setProductBoutique(product,e.target.value)} style={{padding:"7px 10px",border:"1px solid #b9cbd5",borderRadius:8,fontWeight:700}}><option value="hidden">🔒 Masqué partout</option><option value="qc">🇨🇦 Québec seulement</option><option value="conakry">🇬🇳 Conakry seulement</option><option value="both">👁 Québec + Conakry</option></select>{visibilityBusy===String(product.id)&&<span>Enregistrement…</span>}</span>
        </div>
        <div style={{display:"grid",gap:10,minWidth:120}}>
          <button className="cms-primary" onClick={() => edit(product)}>Modifier</button>
          <button className="cms-danger" onClick={() => remove(String(product.id))}>Supprimer</button>
        </div>
      </article>)}
    </div>
    {!products.length && <p className="cms-empty">Aucun produit trouvé.</p>}
    {zoomImage && createPortal(<div style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:20,background:"rgba(11,23,36,.94)"}} role="dialog" aria-modal="true" onClick={() => setZoomImage(null)}><button type="button" onClick={() => setZoomImage(null)} style={{position:"fixed",top:20,right:24,width:52,height:52,border:0,borderRadius:"50%",background:"#fff",fontSize:32,cursor:"pointer"}}>×</button><img src={zoomImage} alt="Aperçu agrandi" style={{maxWidth:"96vw",maxHeight:"94vh",width:"auto",height:"auto",objectFit:"contain",background:"#fff"}} onClick={(event) => event.stopPropagation()} /></div>, document.body)}
  </section>;
}
