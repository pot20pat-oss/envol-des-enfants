import { useEffect, useState } from "react";
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
  const [backgroundFilter, setBackgroundFilter] = useState<"all" | "nonwhite">("all");
  const [nonWhiteBackgroundIds, setNonWhiteBackgroundIds] = useState<Set<string>>(new Set());
  const [backgroundScanBusy, setBackgroundScanBusy] = useState(false);
  const [validatedBackgroundIds, setValidatedBackgroundIds] = useState<Set<string>>(new Set());
  const setProductBoutique = async (product: Row, availability: string) => { const id=String(product.id||""); if(!id)return; setVisibilityBusy(id); try { const visible_qc=availability==="qc"||availability==="both"; const visible_conakry=availability==="conakry"||availability==="both"; await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...product,visible_qc,visible_conakry,visible:visible_qc||visible_conakry})}); await reload(); } finally { setVisibilityBusy(null); } };
  useEffect(() => {
    if (backgroundFilter !== "nonwhite") return;
    let cancelled = false;
    setBackgroundScanBusy(true);

    const scanImage = (product: Row) => new Promise<string | null>((resolve) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 64;
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) return resolve(null);
          context.drawImage(image, 0, 0, size, size);
          const data = context.getImageData(0, 0, size, size).data;

          // Mesure plusieurs bandes près des quatre bords. Un vrai fond blanc
          // reste clair et neutre; les fonds gris, crème, colorés ou décorés
          // sont signalés même si les coins seuls sont blancs.
          let tested = 0;
          let suspicious = 0;
          const edge = 12;
          for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (x >= edge && x < size - edge && y >= edge && y < size - edge) continue;
            const i = (y * size + x) * 4;
            const alpha = data[i + 3];
            if (alpha < 32) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            tested++;
            // Un fond est considéré blanc seulement si ses trois canaux
            // restent très élevés. On tolère les ombres JPEG légères.
            const isWhite = r >= 232 && g >= 232 && b >= 232;
            if (!isWhite) suspicious++;
          }
          // Un objet peut toucher un bord; on ne classe donc la photo comme
          // "fond pas blanc" que si une part importante de la bordure ne l'est pas.
          return resolve(tested > 0 && suspicious / tested >= 0.35 ? String(product.id) : null);
        } catch {
          return resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      // Les images du site et de R2 passent par /api/images : pas besoin de
      // crossOrigin, qui pouvait faire échouer silencieusement le canvas.
      image.src = String(product.image_url);
    });

    const scan = async () => {
      const detected = new Set<string>();
      const candidates = catalogProducts.filter((product) => product.image_url);
      for (let i = 0; i < candidates.length; i += 12) {
        const results = await Promise.all(candidates.slice(i, i + 12).map(scanImage));
        results.forEach((id) => { if (id) detected.add(id); });
        if (cancelled) return;
      }
      if (!cancelled) {
        setNonWhiteBackgroundIds(detected);
        setBackgroundScanBusy(false);
      }
    };
    void scan();
    return () => { cancelled = true; };
  }, [backgroundFilter, catalogProducts]);

  const visibleProducts = backgroundFilter === "nonwhite" ? products.filter((product) => nonWhiteBackgroundIds.has(String(product.id))) : products;
  const validateBackground = (id: string, valid: boolean) => {
    setValidatedBackgroundIds((current) => {
      const next = new Set(current);
      if (valid) next.add(id); else next.delete(id);
      return next;
    });
    if (!valid) {
      setNonWhiteBackgroundIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };
  const reset = () => { setSearch(""); setCategory("all"); setVisibility("all"); setStock("all"); setBackgroundFilter("all"); };
  return <section className="cms-panel">
    <AiBatchImport market={market} busy={busy} onDone={reload} catalogProducts={catalogProducts} />
    <div className="cms-panel-title"><input className="cms-search" placeholder="Nom, marque ou numéro d’article…" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="cms-product-actions"><button className="cms-secondary" disabled={busy} onClick={synchronize}>↻ Synchroniser la boutique</button><button className="cms-primary" onClick={add}>+ Ajouter manuellement</button></div></div>
    <div className="cms-product-filters">
      <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Toutes les catégories</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Visibilité<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="all">Tous</option><option value="visible">Visibles</option><option value="hidden">Masqués</option><option value="qc">Québec seulement</option><option value="conakry">Conakry seulement</option><option value="both">Québec + Conakry</option></select></label>
      <label>Stock<select value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">Tous</option><option value="available">En stock</option><option value="low">Stock faible</option><option value="empty">Épuisés</option></select></label>
      <label>Fond photo<select value={backgroundFilter} onChange={(event) => setBackgroundFilter(event.target.value as "all" | "nonwhite")}><option value="all">Tous les fonds</option><option value="nonwhite">⚠ Fond pas blanc</option></select></label>
      <span className="cms-filter-count">{backgroundScanBusy ? "Analyse des fonds…" : `${visibleProducts.length} résultat(s)`}</span><button type="button" className="cms-secondary" onClick={reset}>Réinitialiser</button>
    </div>
    <div style={{display:"grid",gap:18,marginTop:20}}>
      {visibleProducts.map((product) => <article key={String(product.id)} style={{display:"grid",gridTemplateColumns:"360px minmax(300px,1fr) auto",gap:24,alignItems:"center",padding:18,border:"1px solid #dce6eb",borderRadius:14,background:"#fff"}}>
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
        <div style={{display:"grid",gap:10,minWidth:150}}>
          {backgroundFilter === "nonwhite" && (
            validatedBackgroundIds.has(String(product.id)) ? (
              <div style={{padding:"9px 10px",borderRadius:8,background:"#edf8f1",fontWeight:700,textAlign:"center"}}>✓ Fond validé</div>
            ) : (
              <>
                <button type="button" className="cms-primary" onClick={() => validateBackground(String(product.id), true)}>✓ Oui, fond à corriger</button>
                <button type="button" className="cms-secondary" onClick={() => validateBackground(String(product.id), false)}>✕ Faux positif</button>
              </>
            )
          )}
          <button className="cms-primary" onClick={() => edit(product)}>Modifier</button>
          <button className="cms-danger" onClick={() => remove(String(product.id))}>Supprimer</button>
        </div>
      </article>)}
    </div>
    {backgroundFilter === "nonwhite" && !backgroundScanBusy && visibleProducts.length > 0 && <div style={{position:"sticky",bottom:16,zIndex:10,marginTop:18,padding:"14px 16px",border:"1px solid #cbdbe4",borderRadius:12,background:"rgba(255,255,255,.96)",boxShadow:"0 8px 24px rgba(20,50,70,.12)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><strong>{validatedBackgroundIds.size} photo(s) validée(s) pour correction</strong><span>La création du fond blanc sera disponible uniquement pour les photos que vous avez confirmées.</span></div>}
    {!visibleProducts.length && !backgroundScanBusy && <p className="cms-empty">Aucun produit trouvé.</p>}
    {zoomImage && createPortal(<div style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:20,background:"rgba(11,23,36,.94)"}} role="dialog" aria-modal="true" onClick={() => setZoomImage(null)}><button type="button" onClick={() => setZoomImage(null)} style={{position:"fixed",top:20,right:24,width:52,height:52,border:0,borderRadius:"50%",background:"#fff",fontSize:32,cursor:"pointer"}}>×</button><img src={zoomImage} alt="Aperçu agrandi" style={{maxWidth:"96vw",maxHeight:"94vh",width:"auto",height:"auto",objectFit:"contain",background:"#fff"}} onClick={(event) => event.stopPropagation()} /></div>, document.body)}
  </section>;
}
