import { useRef, useState } from "react";
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
  const [selectedProducts,setSelectedProducts]=useState<Set<string>>(new Set());
  const [bulkBusy,setBulkBusy]=useState(false);
  const [bulkPrice,setBulkPrice]=useState("");
  const [bulkPriceMode,setBulkPriceMode]=useState<"set"|"percent">("set");
  const [bulkVisibility,setBulkVisibility]=useState("keep");
  const [bulkCategory,setBulkCategory]=useState("keep");
  const [undoStack,setUndoStack]=useState<{label:string;rows:Row[]}[]>([]);
  const [redoStack,setRedoStack]=useState<{label:string;rows:Row[]}[]>([]);
  const [duplicateScan, setDuplicateScan] = useState<{groups: Row[][]; scanned: number} | null>(null);
  const [duplicateScanning, setDuplicateScanning] = useState(false);
  const [duplicateProgress, setDuplicateProgress] = useState({done:0,total:0});
  const duplicateImageHashCache=useRef(new Map<string,string>());
  const reset = () => { setSearch(""); setCategory("all"); setVisibility("all"); setStock("all"); };
  const setProductBoutique=async(product:Row,value:string)=>{setVisibilityBusy(String(product.id));try{await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...product,visible_qc:value==="qc"||value==="both",visible_conakry:value==="conakry"||value==="both",visible:value!=="hidden"})});await reload()}finally{setVisibilityBusy(null)}};
  const toggleSelected=(id:string,checked:boolean)=>setSelectedProducts(prev=>{const next=new Set(prev);checked?next.add(id):next.delete(id);return next});
  const restoreRows=async(rows:Row[])=>{for(const row of rows)await request("/api/admin/products",{method:"PUT",body:JSON.stringify(row)});await reload()};
  const undoLast=async()=>{const action=undoStack[undoStack.length-1];if(!action||bulkBusy)return;setBulkBusy(true);try{const current=products.filter(p=>action.rows.some(r=>String(r.id)===String(p.id))).map(p=>({...p}));await restoreRows(action.rows);setUndoStack(s=>s.slice(0,-1));setRedoStack(s=>[...s,{label:action.label,rows:current}].slice(-10))}catch(error){window.alert(error instanceof Error?error.message:"Annulation impossible.")}finally{setBulkBusy(false)}};
  const redoLast=async()=>{const action=redoStack[redoStack.length-1];if(!action||bulkBusy)return;setBulkBusy(true);try{const current=products.filter(p=>action.rows.some(r=>String(r.id)===String(p.id))).map(p=>({...p}));await restoreRows(action.rows);setRedoStack(s=>s.slice(0,-1));setUndoStack(s=>[...s,{label:action.label,rows:current}].slice(-10))}catch(error){window.alert(error instanceof Error?error.message:"Rétablissement impossible.")}finally{setBulkBusy(false)}};
  const applyBulk=async()=>{const selected=products.filter(p=>selectedProducts.has(String(p.id)));if(!selected.length)return;const priceRaw=bulkPrice.trim()===""?null:Number(bulkPrice);if(priceRaw!==null&&!Number.isFinite(priceRaw)){window.alert("Prix invalide.");return}const changes:string[]=[];if(bulkVisibility!=="keep")changes.push(`visibilité: ${bulkVisibility}`);if(bulkCategory!=="keep")changes.push(`catégorie: ${categories[bulkCategory]||bulkCategory}`);if(priceRaw!==null)changes.push(bulkPriceMode==="percent"?`prix ${market}: ${priceRaw>=0?"+":""}${priceRaw}%`:`prix ${market}: ${priceRaw}`);if(!changes.length){window.alert("Choisis au moins une modification.");return}if(!window.confirm(`${selected.length} produit(s) sélectionné(s)\n\n${changes.join("\n")}\n\nAppliquer ces modifications ?`))return;const snapshot=selected.map(p=>({...p}));setBulkBusy(true);try{for(const product of selected){const patch:Row={...product};if(bulkVisibility!=="keep"){patch.visible_qc=bulkVisibility==="qc"||bulkVisibility==="both";patch.visible_conakry=bulkVisibility==="conakry"||bulkVisibility==="both";patch.visible=bulkVisibility!=="hidden"}if(bulkCategory!=="keep")patch.category=bulkCategory;if(priceRaw!==null){const key=`price_${market}`;const current=Number(product[key]||0);patch[key]=bulkPriceMode==="percent"?Math.max(0,Math.round(current*(1+priceRaw/100)*100)/100):Math.max(0,priceRaw)}await request("/api/admin/products",{method:"PUT",body:JSON.stringify(patch)})}setUndoStack(s=>[...s,{label:`${selected.length} produit(s) · ${changes.join(", ")}`,rows:snapshot}].slice(-10));setRedoStack([]);setSelectedProducts(new Set());setBulkPrice("");await reload()}catch(error){window.alert(error instanceof Error?error.message:"Modification en lot impossible.")}finally{setBulkBusy(false)}};

  const normalizeDuplicate = (value: unknown) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const duplicateWords = (value: unknown) => new Set(normalizeDuplicate(value).split(" ").filter(word => word.length > 2));
  const wordSimilarity = (a: unknown, b: unknown) => {
    const aw = duplicateWords(a), bw = duplicateWords(b);
    if (!aw.size || !bw.size) return 0;
    let same = 0; for (const word of aw) if (bw.has(word)) same++;
    return same / Math.min(aw.size, bw.size);
  };
  const genericDuplicateWords=new Set(["barbie","mattel","ken","poupee","poupees","figurine","figurines","jouet","jouets","disney","princess","princesse","dc","marvel","batman","aquaman","nerf","blaster","xshot","shot"]);
  const distinctiveWords=(value:unknown)=>new Set([...duplicateWords(value)].filter(word=>!genericDuplicateWords.has(word)));
  const distinctiveSimilarity=(a:unknown,b:unknown)=>{
    const aw=distinctiveWords(a),bw=distinctiveWords(b);if(!aw.size||!bw.size)return 0;
    let same=0;for(const word of aw)if(bw.has(word))same++;return same/Math.max(aw.size,bw.size);
  };
  const imageHash = async (url: string) => {
    const cached=duplicateImageHashCache.current.get(url);if(cached)return cached;
    const img=new Image();img.crossOrigin="anonymous";img.src=url;await img.decode();
    const canvas=document.createElement("canvas");canvas.width=32;canvas.height=32;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Canvas indisponible");
    ctx.drawImage(img,0,0,32,32);const data=ctx.getImageData(0,0,32,32).data;
    const gray:number[]=[];for(let i=0;i<data.length;i+=4)gray.push(data[i]*.299+data[i+1]*.587+data[i+2]*.114);
    const avg=gray.reduce((a,b)=>a+b,0)/gray.length;const hash=gray.map(v=>v>=avg?"1":"0").join("");
    duplicateImageHashCache.current.set(url,hash);return hash;
  };
  const imageSimilarity = (a:string,b:string) => {
    if(!a||!b||a.length!==b.length)return 0;let different=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])different++;
    return 1-different/a.length;
  };
  const scanDuplicates = async () => {
    setDuplicateScanning(true);
    try {
      const source=catalogProducts.length?catalogProducts:products;
      const candidates:Array<{a:Row;b:Row;text:number;sameArticle:boolean}>=[];
      for(let i=0;i<source.length;i++)for(let j=i+1;j<source.length;j++){
        const a=source[i],b=source[j];
        const brandA=normalizeDuplicate(a.brand).replace(/\s+/g,""),brandB=normalizeDuplicate(b.brand).replace(/\s+/g,"");
        if(!brandA||brandA!==brandB)continue;
        const articleA=normalizeDuplicate(a.article_number),articleB=normalizeDuplicate(b.article_number);
        const nameTextA=`${a.name_fr||""} ${a.name_en||""}`,nameTextB=`${b.name_fr||""} ${b.name_en||""}`;
        const name=wordSimilarity(nameTextA,nameTextB);const distinctive=distinctiveSimilarity(nameTextA,nameTextB);
        const desc=wordSimilarity(`${a.description_fr||""} ${a.description_en||""}`,`${b.description_fr||""} ${b.description_en||""}`);
        const sameArticle=!!(articleA&&articleA===articleB);
        // Le texte sert uniquement de présélection; l'image doit ensuite confirmer.
        if(sameArticle||(distinctive>=.60&&name>=.82&&desc>=.70)||(distinctive>=.80&&name>=.90))candidates.push({a,b,text:name*.55+desc*.20+distinctive*.25,sameArticle});
      }
      setDuplicateProgress({done:0,total:candidates.length});
      const pairs:Array<[Row,Row]>=[];let done=0;
      for(const candidate of candidates){
        let visual=0;
        const au=String(candidate.a.image_url||""),bu=String(candidate.b.image_url||"");
        if(au&&bu)try{const [ah,bh]=await Promise.all([imageHash(au),imageHash(bu)]);visual=imageSimilarity(ah,bh)}catch{}
        // Hors numéro d'article identique, texte ET image doivent converger fortement.
        if(candidate.sameArticle||(candidate.text>=.88&&visual>=.95)||(candidate.text>=.94&&visual>=.91))pairs.push([candidate.a,candidate.b]);
        done++;if(done%5===0||done===candidates.length){setDuplicateProgress({done,total:candidates.length});await new Promise(resolve=>setTimeout(resolve,0))}
      }
      const groups:Row[][]=pairs.map(([a,b])=>[a,b]);
      groups.sort((a,b)=>String(a[0].brand||"").localeCompare(String(b[0].brand||"")));
      setDuplicateScan({groups,scanned:source.length});
    } finally { setDuplicateScanning(false); }
  };
  return <section className="cms-panel">
    <AiBatchImport market={market} busy={busy} onDone={reload} catalogProducts={catalogProducts} search={search} setSearch={setSearch} synchronize={synchronize} add={add} scanDuplicates={scanDuplicates} duplicateScanning={duplicateScanning} duplicateProgress={duplicateProgress} />
    {duplicateScan&&<section style={{margin:"0 0 18px",padding:16,border:"1px solid #b9cbd5",borderRadius:12,background:"#f8fbfc"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><strong>Scanner de doublons · {duplicateScan.scanned} produits vérifiés · {duplicateScan.groups.length} groupe(s) suspect(s)</strong><button className="cms-secondary" onClick={()=>setDuplicateScan(null)}>Fermer</button></div>{duplicateScan.groups.length===0?<p>Aucun doublon potentiel détecté avec les critères actuels.</p>:<div style={{display:"grid",gap:10,marginTop:12}}>{duplicateScan.groups.map((group,index)=><div key={index} style={{display:"grid",gridTemplateColumns:"140px minmax(0,1fr)",gap:12,padding:14,border:"1px solid #dce6eb",borderRadius:12,background:"#fff"}}><b style={{paddingTop:8}}>Paire de doublons</b><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,220px))",gap:12}}>{group.map(product=><button key={String(product.id)} type="button" onClick={()=>edit(product)} style={{display:"grid",gridTemplateRows:"190px auto",padding:8,border:"2px solid #cbd9df",borderRadius:10,background:"#fff",textAlign:"left",cursor:"pointer",overflow:"hidden"}}><div style={{width:"100%",height:190,display:"grid",placeItems:"center",background:"#fff",borderRadius:7,overflow:"hidden",padding:8,boxSizing:"border-box"}}>{product.image_url?<img src={String(product.image_url)} alt={String(product.name_fr||"Produit")} loading="lazy" style={{display:"block",maxWidth:"100%",maxHeight:"100%",width:"auto",height:"auto",objectFit:"contain",objectPosition:"center"}}/>:<span style={{fontWeight:800,color:"#7b8990"}}>AUCUNE IMAGE</span>}</div><div style={{padding:"8px 2px 2px"}}><strong style={{display:"block",fontSize:13,lineHeight:1.25}}>{String(product.name_fr||product.article_number||"Produit")}</strong><small style={{display:"block",marginTop:4}}>{String(product.brand||"")} · No {String(product.article_number||"—")}</small></div></button>)} </div><div style={{gridColumn:"2",display:"flex",gap:8,flexWrap:"wrap"}}>{group.map(product=><button key={`delete-${String(product.id)}`} type="button" className="cms-danger" onClick={()=>{if(!window.confirm(`Supprimer définitivement « ${String(product.name_fr||product.article_number||"ce produit")} » ?`))return;remove(String(product.id));setDuplicateScan(current=>current?{...current,groups:current.groups.map(g=>g.filter(p=>String(p.id)!==String(product.id))).filter(g=>g.length>1)}:current)}}>🗑 Supprimer {String(product.article_number||"article")}</button>)}</div></div>)}</div>}</section>}
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"10px 14px",marginBottom:10,border:"1px solid #d7e2e7",borderRadius:12,background:"#fff"}}><strong>Historique</strong><button type="button" className="cms-secondary" disabled={bulkBusy||undoStack.length===0} onClick={()=>void undoLast()}>↶ Annuler{undoStack.length?` · ${undoStack[undoStack.length-1].label}`:""}</button><button type="button" className="cms-secondary" disabled={bulkBusy||redoStack.length===0} onClick={()=>void redoLast()}>↷ Rétablir</button><span style={{color:"#667b87",fontSize:12}}>10 dernières actions en lot conservées pendant cette session</span></div><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"12px 14px",marginBottom:12,border:"1px solid #b9cbd5",borderRadius:12,background:selectedProducts.size?"#f4f9fc":"#fff"}}><strong>Actions en lot · {selectedProducts.size} sélectionné(s)</strong><button type="button" className="cms-secondary" onClick={()=>setSelectedProducts(new Set(products.map(p=>String(p.id))))}>Tout sélectionner ({products.length})</button><button type="button" className="cms-secondary" disabled={!selectedProducts.size} onClick={()=>setSelectedProducts(new Set())}>Désélectionner</button><select value={bulkVisibility} onChange={e=>setBulkVisibility(e.target.value)}><option value="keep">Visibilité — ne pas modifier</option><option value="hidden">Masqué partout</option><option value="qc">Québec seulement</option><option value="conakry">Conakry seulement</option><option value="both">Québec + Conakry</option></select><select value={bulkCategory} onChange={e=>setBulkCategory(e.target.value)}><option value="keep">Catégorie — ne pas modifier</option>{Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select value={bulkPriceMode} onChange={e=>setBulkPriceMode(e.target.value as "set"|"percent")}><option value="set">Prix fixe · {markets[market].label}</option><option value="percent">Variation % · {markets[market].label}</option></select><input type="number" step="0.01" placeholder={bulkPriceMode==="percent"?"Ex. 10 ou -5":"Nouveau prix"} value={bulkPrice} onChange={e=>setBulkPrice(e.target.value)} style={{width:130}}/><button type="button" className="cms-primary" disabled={bulkBusy||!selectedProducts.size} onClick={()=>void applyBulk()}>{bulkBusy?"⌛ Modification…":"Appliquer à la sélection"}</button></div>
    <div className="cms-product-filters">
      <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Toutes les catégories</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Visibilité<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="all">Tous</option><option value="visible">Visibles</option><option value="hidden">Masqués</option><option value="qc">Québec seulement</option><option value="conakry">Conakry seulement</option><option value="both">Québec + Conakry</option></select></label>
      <label>Stock<select value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">Tous</option><option value="available">En stock</option><option value="low">Stock faible</option><option value="empty">Épuisés</option></select></label>
      <span className="cms-filter-count">{products.length} résultat(s)</span><button type="button" className="cms-secondary" onClick={reset}>Réinitialiser</button>
    </div>
    <div style={{display:"grid",gap:18,marginTop:20}}>
      {products.map((product) => <article key={String(product.id)} style={{position:"relative",display:"grid",gridTemplateColumns:"360px minmax(300px,1fr) auto",gap:24,alignItems:"center",padding:18,border:selectedProducts.has(String(product.id))?"3px solid #2676a8":"1px solid #dce6eb",borderRadius:14,background:"#fff"}}><label style={{position:"absolute",left:28,top:28,zIndex:3,padding:"7px 9px",borderRadius:8,background:"rgba(255,255,255,.95)",fontWeight:800}}><input type="checkbox" checked={selectedProducts.has(String(product.id))} onChange={e=>toggleSelected(String(product.id),e.target.checked)}/> Sélectionner</label>
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
          <button className="cms-primary" onClick={() => edit(product)}>Modifier</button>
          <button className="cms-danger" onClick={() => remove(String(product.id))}>Supprimer</button>
        </div>
      </article>)}
    </div>
    {!products.length && <p className="cms-empty">Aucun produit trouvé.</p>}
    {zoomImage && createPortal(<div style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:20,background:"rgba(11,23,36,.94)"}} role="dialog" aria-modal="true" onClick={() => setZoomImage(null)}><button type="button" onClick={() => setZoomImage(null)} style={{position:"fixed",top:20,right:24,width:52,height:52,border:0,borderRadius:"50%",background:"#fff",fontSize:32,cursor:"pointer"}}>×</button><img src={zoomImage} alt="Aperçu agrandi" style={{maxWidth:"96vw",maxHeight:"94vh",width:"auto",height:"auto",objectFit:"contain",background:"#fff"}} onClick={(event) => event.stopPropagation()} /></div>, document.body)}
  </section>;
}
