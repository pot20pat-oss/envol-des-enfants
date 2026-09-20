"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { categories, request, type Row } from "./admin-shared";
import type { Market } from "@/lib/markets";

type Match={product:Row;score:number};
type Item={id:string;file:File;preview:string;hash:string;visualHash:string;duplicate:boolean;duplicateKind?:"exact"|"visual";url?:string;suggestion?:Row;group?:string;catalogMatch?:Row;catalogScore?:number;catalogMatches?:Match[];matchRejected?:boolean;matchAccepted?:boolean;state:"ready"|"uploading"|"analyzing"|"done"|"error";error?:string};

async function sha256(file:File){const d=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function visualHash(file:File){const bitmap=await createImageBitmap(file);const canvas=document.createElement("canvas");canvas.width=16;canvas.height=16;const ctx=canvas.getContext("2d")!;ctx.drawImage(bitmap,0,0,16,16);bitmap.close();const data=ctx.getImageData(0,0,16,16).data;const lum:number[]=[];for(let i=0;i<data.length;i+=4)lum.push(Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114));const avg=lum.reduce((a,b)=>a+b,0)/lum.length;return lum.map(v=>v>=avg?"1":"0").join("")}
async function prepareUpload(file:File){
 const target=900*1024,max=1600;
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const ctx=canvas.getContext("2d");if(!ctx){bitmap.close();throw new Error("Impossible de préparer cette image.")}
 ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let quality=.82,blob:Blob|null=null;
 do{blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));quality-=.08}while(blob&&blob.size>target&&quality>=.42);
 if(!blob)throw new Error("Impossible de compresser cette image.");
 if(blob.size>target)throw new Error("Cette image reste trop volumineuse après compression.");
 return new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()});
}
function distance(a:string,b:string){let n=0;for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])n++;return n+Math.abs(a.length-b.length)}
function visualSimilarity(a:string,b:string){if(!a||!b)return 0;return Math.max(0,1-distance(a,b)/Math.max(a.length,b.length))}
async function visualHashUrl(url:string){const res=await fetch(url);if(!res.ok)throw new Error("image");const blob=await res.blob();return visualHash(new File([blob],"catalog-image",{type:blob.type||"image/jpeg"}))}
function norm(v:unknown){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function groupKey(s:Row){const brand=norm(s.brand);const name=norm(s.name_fr).split(" ").filter(x=>x.length>2).slice(0,5).join("-");return `${norm(s.category)}|${brand}|${name}`}
function setScore(a:Set<string>,b:Set<string>){if(!a.size||!b.size)return 0;let same=0;for(const x of a)if(b.has(x))same++;return same/Math.min(a.size,b.size)}
function productSimilarity(a:Row,b:Row){const aw=words(`${a.name_fr||""} ${a.name_en||""} ${a.brand||""} ${a.description_fr||""}`),bw=words(`${b.name_fr||""} ${b.name_en||""} ${b.brand||""} ${b.description_fr||""}`);let s=setScore(aw,bw);if(norm(a.brand)&&norm(a.brand)===norm(b.brand))s+=.15;if(norm(a.category)&&norm(a.category)===norm(b.category))s+=.12;return Math.min(s,1)}
function regroup(items:Item[]){const done=items.filter(x=>x.state==="done"&&x.suggestion&&!x.duplicate);const assigned=new Set<string>();const groups=new Map<string,string>();for(const a of done){if(assigned.has(a.id))continue;const gid=a.id;groups.set(a.id,gid);assigned.add(a.id);for(const b of done){if(assigned.has(b.id)||a.id===b.id)continue;const score=productSimilarity(a.suggestion!,b.suggestion!);if(score>=.62){groups.set(b.id,gid);assigned.add(b.id)}}}return items.map(x=>groups.has(x.id)?{...x,group:groups.get(x.id)}:x)}
function words(v:unknown){return new Set(norm(v).split(" ").filter(x=>x.length>2))}
function overlap(a:Set<string>,b:Set<string>){if(!a.size||!b.size)return 0;let same=0;for(const x of a)if(b.has(x))same++;return same/Math.min(a.size,b.size)}
const genericWords=new Set(["barbie","poupee","doll","jouet","toy","enfant","children","kids","girl","fille","garcon","boy","produit","product"]);
function usefulWords(v:unknown){return new Set([...words(v)].filter(x=>!genericWords.has(x)))}
function catalogMatches(s:Row,products:Row[]){
 const found:Match[]=[];
 const sn=words(`${s.name_fr||""} ${s.name_en||""}`),sd=words(`${s.description_fr||""} ${s.description_en||""}`),su=usefulWords(`${s.name_fr||""} ${s.name_en||""} ${s.description_fr||""} ${s.description_en||""}`);
 for(const p of products){
  const pn=words(`${p.name_fr||""} ${p.name_en||""}`),pd=words(`${p.description_fr||""} ${p.description_en||""}`),pu=usefulWords(`${p.name_fr||""} ${p.name_en||""} ${p.description_fr||""} ${p.description_en||""}`);
  const name=overlap(sn,pn),desc=overlap(sd,pd),distinctive=overlap(su,pu);
  const brand=norm(s.brand)&&norm(s.brand)===norm(p.brand)?1:0,category=norm(s.category)&&norm(s.category)===norm(p.category)?1:0;
  const article=norm(s.article_number)&&norm(s.article_number)===norm(p.article_number);
  let n=article?1:(distinctive*.50+name*.22+desc*.18+brand*.06+category*.04);
  if(!su.size||!pu.size)n=Math.min(n,.64);
  if(distinctive===0)n*=.62;
  // Keep every catalog candidate with at least one meaningful signal.
  // The reviewer needs the full visual shortlist, not only candidates above an arbitrary score.
  if(article||name>0||desc>0||distinctive>0||brand||category)found.push({product:p,score:Math.min(n,1)});
 }
 return found.sort((a,b)=>b.score-a.score).slice(0,40)
}

export function AiBatchImport({market,busy,onDone,catalogProducts}:{market:Market;busy:boolean;onDone:()=>Promise<void>;catalogProducts:Row[]}){
 const[items,setItems]=useState<Item[]>([]);const[matchSearch,setMatchSearch]=useState("");const[selectedDuplicates,setSelectedDuplicates]=useState<Set<string>>(new Set());const visualHashCache=useRef<Map<string,string>>(new Map());const[working,setWorking]=useState(false);const[standby,setStandby]=useState(true);const[zoomImage,setZoomImage]=useState<string|null>(null);const unique=useMemo(()=>items.filter(i=>!i.duplicate),[items]);
 async function choose(files:FileList|null){const selected=Array.from(files||[]).filter(f=>f.type.startsWith("image/"));const seen=new Set<string>();const visual:string[]=[];const next:Item[]=[];
  for(const file of selected){const hash=await sha256(file),vh=await visualHash(file);const exact=seen.has(hash);const near=!exact&&visual.some(x=>distance(x,vh)<=18);seen.add(hash);if(!exact&&!near)visual.push(vh);next.push({id:crypto.randomUUID(),file,preview:URL.createObjectURL(file),hash,visualHash:vh,duplicate:exact||near,duplicateKind:exact?"exact":near?"visual":undefined,state:"ready"})}setItems(next)}
 async function rankCatalogVisually(item:Item,suggestion:Row){
  const textMatches=catalogMatches(suggestion,catalogProducts);
  const scored:Match[]=[];
  const batchSize=12;
  for(let i=0;i<catalogProducts.length;i+=batchSize){
   const batch=catalogProducts.slice(i,i+batchSize);
   const rows=await Promise.all(batch.map(async p=>{
    const url=String(p.image_url||"");if(!url)return null;
    try{
     let vh=visualHashCache.current.get(url);
     if(!vh){vh=await visualHashUrl(url);visualHashCache.current.set(url,vh)}
     const visual=visualSimilarity(item.visualHash,vh);
     const text=textMatches.find(m=>String(m.product.id)===String(p.id))?.score||0;
     // Visual evidence dominates. Text helps separate visually similar packaging.
     let score=visual*.78+text*.22;
     if(visual>=.965)score=1;
     else if(visual>=.90)score=Math.max(score,.90);
     else if(visual>=.82)score=Math.max(score,.76);
     return {product:p,score,visual,text};
    }catch{return null}
   }));
   for(const row of rows)if(row&&(row.visual>=.58||row.text>=.38))scored.push({product:row.product,score:row.score});
  }
  return scored.sort((a,b)=>b.score-a.score).slice(0,40)
 }
 async function analyzeAll(){setWorking(true);for(const item of unique){try{setItems(a=>a.map(x=>x.id===item.id?{...x,state:"uploading"}:x));const prepared=await prepareUpload(item.file);const data=new FormData();data.append("file",prepared);const uploaded=await request("/api/admin/upload",{method:"POST",body:data});const url=String(uploaded.url||"");setItems(a=>a.map(x=>x.id===item.id?{...x,url,state:"analyzing"}:x));const result=await request("/api/admin/analyze-product",{method:"POST",body:JSON.stringify({image_url:url})});const suggestion=result.suggestion as Row;const matches=await rankCatalogVisually(item,suggestion);const match=matches[0];const done={...item,url,suggestion,group:groupKey(suggestion),catalogMatch:match?.product,catalogScore:match?.score,catalogMatches:matches,state:"done" as const};setItems(a=>regroup(a.map(x=>x.id===item.id?done:x)))}catch(error){setItems(a=>a.map(x=>x.id===item.id?{...x,state:"error",error:error instanceof Error?error.message:"Erreur"}:x))}}setWorking(false)}
 function update(id:string,field:string,value:string){setItems(a=>a.map(i=>i.id===id&&i.suggestion?{...i,suggestion:{...i.suggestion,[field]:value},group:groupKey({...i.suggestion,[field]:value})}:i))}
 function removeItem(id:string){setItems(a=>{const item=a.find(x=>x.id===id);if(item?.preview)URL.revokeObjectURL(item.preview);return a.filter(x=>x.id!==id)})}
 function cancelBatch(){if(!window.confirm("Annuler cette analyse et retirer toutes les photos sélectionnées ?"))return;items.forEach(item=>URL.revokeObjectURL(item.preview));setItems([])}
 async function deleteSelectedDuplicates(){
  const ids=[...selectedDuplicates];if(!ids.length)return;
  if(!window.confirm(`Supprimer définitivement ${ids.length} doublon(s) sélectionné(s) du catalogue ?`))return;
  setWorking(true);try{for(const id of ids)await request(`/api/admin/products?id=${encodeURIComponent(id)}`,{method:"DELETE"});await onDone();setItems(a=>a.map(x=>({...x,catalogMatches:(x.catalogMatches||[]).filter(m=>!selectedDuplicates.has(String(m.product.id))),...(x.catalogMatch&&selectedDuplicates.has(String(x.catalogMatch.id))?{catalogMatch:undefined,catalogScore:undefined,matchAccepted:false,matchRejected:false}:{})})));setSelectedDuplicates(new Set())}finally{setWorking(false)}
 }
 async function deleteMatchedProduct(item:Item){
  const p=item.catalogMatch;if(!p?.id)return;
  if(!window.confirm(`Supprimer définitivement « ${String(p.name_fr||p.article_number||"ce produit")} » du catalogue ?`))return;
  setWorking(true);try{await request(`/api/admin/products?id=${encodeURIComponent(String(p.id))}`,{method:"DELETE"});await onDone();setItems(a=>a.map(x=>x.id===item.id?{...x,catalogMatch:undefined,catalogScore:undefined,catalogMatches:(x.catalogMatches||[]).filter(m=>String(m.product.id)!==String(p.id)),matchAccepted:false,matchRejected:false}:x))}finally{setWorking(false)}
 }
 async function replaceMatchedImage(item:Item){
  const p=item.catalogMatch;if(!p?.id||!item.url)return;
  if(!window.confirm(`Remplacer l’image principale de « ${String(p.name_fr||p.article_number||"ce produit")} » par la photo analysée ?`))return;
  setWorking(true);try{await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...p,image_url:item.url})});await onDone();setItems(a=>a.map(x=>x.id===item.id?{...x,catalogMatch:{...p,image_url:item.url},matchAccepted:true,matchRejected:false}:x))}finally{setWorking(false)}
 }
 async function createAll(){setWorking(true);try{const done=items.filter(x=>!x.duplicate&&(!x.catalogMatch||x.matchRejected)&&x.state==="done"&&x.suggestion&&x.url);const groups=new Map<string,Item[]>();for(const item of done){const key=item.group||item.id;groups.set(key,[...(groups.get(key)||[]),item])}for(const group of groups.values()){const first=group[0];const existing=group.find(x=>x.catalogMatch&&!x.matchRejected)?.catalogMatch;const urls=group.map(x=>x.url!).filter(Boolean);if(existing){continue}await request("/api/admin/products",{method:"POST",body:JSON.stringify({...first.suggestion,image_url:urls[0],images_json:JSON.stringify(urls.slice(1)),price_qc:0,price_conakry:0,stock_qc:0,stock_conakry:0,visible_qc:!standby&&market==="qc",visible_conakry:!standby&&market==="conakry",status:"available"})})}await onDone();setItems([])}finally{setWorking(false)}}
 const duplicates=items.filter(i=>i.duplicate).length,ready=items.filter(i=>!i.duplicate&&i.state==="done").length,groups=new Set(items.filter(i=>i.group).map(i=>i.group)).size;
 return <section className="cms-ai-batch">
  <div className="cms-ai-batch-head">
    <div><h3>Analyse des produits par IA</h3><p>Balancez un lot de photos : l’IA détecte les doublons, regroupe les vues d’un même produit et prépare des fiches FR/EN complètes à vérifier avant enregistrement.</p></div>
    <label className="cms-primary cms-ai-file">Choisir des photos<input type="file" accept="image/*" multiple disabled={busy||working} onChange={e=>void choose(e.target.files)}/></label>
  </div>
  {items.length>0&&<>
    <div className="cms-ai-summary"><strong>{items.length}</strong> image(s) · <strong>{duplicates}</strong> doublon(s) éliminé(s) · <strong>{unique.length}</strong> à analyser · <strong>{groups}</strong> produit(s) regroupé(s) · <strong>{ready}</strong> image(s) prête(s)</div>
    <div style={{display:"grid",gap:24,marginTop:18}}>
      {items.map(item=><article key={item.id} className={item.duplicate?"is-duplicate":""} style={{display:"grid",gridTemplateColumns:"420px minmax(0,1fr)",gap:24,padding:18,border:"1px solid #dce6eb",borderRadius:12,background:"#fff"}}>
        <button type="button" onClick={()=>setZoomImage(item.preview)} title="Agrandir la photo analysée" style={{width:420,height:420,padding:0,border:"1px solid #dfe7ea",borderRadius:12,background:"#fff",overflow:"hidden",cursor:"zoom-in"}}>
          <img src={item.preview} alt="Photo analysée" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}}/>
        </button>
        <div style={{display:"grid",alignContent:"start",gap:10,minWidth:0}}>
          <strong>{item.file.name}</strong>
          {item.duplicate?<span>{item.duplicateKind==="exact"?"Doublon exact":"Doublon visuel probable"} — ignoré</span>:item.suggestion?<>
            <input value={String(item.suggestion.name_fr||"")} onChange={e=>update(item.id,"name_fr",e.target.value)}/>
            <select value={String(item.suggestion.category||"eveil")} onChange={e=>update(item.id,"category",e.target.value)}>{Object.entries(categories).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select>
            <textarea value={String(item.suggestion.description_fr||"")} onChange={e=>update(item.id,"description_fr",e.target.value)}/>
            {item.catalogMatch?<><section style={{display:"grid",gridTemplateColumns:"300px minmax(0,1fr)",gap:24,alignItems:"start",padding:20,marginTop:6,border:"3px solid #5b9fc7",borderRadius:12,background:"#eef7fc"}}>
              <button type="button" onClick={()=>setZoomImage(String(item.catalogMatch!.image_url||item.preview))} style={{width:300,height:300,padding:0,border:"1px solid #bdd5e3",borderRadius:10,background:"#fff",overflow:"hidden",cursor:"zoom-in"}}>
                {item.catalogMatch.image_url?<img src={String(item.catalogMatch.image_url)} alt="Produit déjà présent" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}}/>:<span>Aucune image existante</span>}
              </button>
              <div style={{display:"grid",alignContent:"center",gap:10,fontSize:15,color:"#17364a"}}>
                <strong style={{fontSize:20}}>{(item.catalogScore||0)>=.85?"DOUBLON TRÈS PROBABLE":(item.catalogScore||0)>=.60?"PRODUIT SIMILAIRE TROUVÉ — À VÉRIFIER":"CORRESPONDANCE POSSIBLE — À VÉRIFIER"}</strong>
                <b style={{fontSize:18}}>{String(item.catalogMatch.name_fr||"Produit existant")}</b>
                <span>{String(item.catalogMatch.name_en||"")}</span>
                <span><b>No {String(item.catalogMatch.article_number||"—")}</b></span>
                <span>{categories[String(item.catalogMatch.category)]||String(item.catalogMatch.category||"")}</span>
                <span>Boutique : {item.catalogMatch.visible_qc?"Québec ":""}{item.catalogMatch.visible_conakry?"Conakry":""}</span>
                <span>Confiance : {Math.round((item.catalogScore||0)*100)} % · {(item.catalogScore||0)>=.85?"forte":(item.catalogScore||0)>=.60?"moyenne":"faible"}</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:8}}>
                  <button type="button" className="cms-primary" onClick={()=>setZoomImage(String(item.catalogMatch!.image_url||item.preview))}>Voir en grand</button>
                  <button type="button" className="cms-secondary" onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,matchAccepted:true,matchRejected:false}:x))}>✓ C’est le même produit</button>
                  <button type="button" className="cms-danger" onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,matchRejected:true,matchAccepted:false}:x))}>✕ Ce n’est PAS le même produit</button>
                  <button type="button" className="cms-secondary" disabled={working||!item.url} onClick={()=>void replaceMatchedImage(item)}>↻ Remplacer l’image du doublon</button>
                  <button type="button" className="cms-danger" disabled={working} onClick={()=>void deleteMatchedProduct(item)}>🗑 Supprimer le doublon du catalogue</button>
                </div>
                {item.matchRejected&&<strong style={{color:"#a33"}}>Correspondance refusée — cette photo pourra être créée comme nouveau produit.</strong>}
                {item.matchAccepted&&<strong>Correspondance confirmée manuellement.</strong>}
              </div>
            </section>{(item.catalogMatches?.length||0)>1&&<div style={{marginTop:18,padding:16,border:"2px solid #cbdbe4",borderRadius:12,background:"#f8fbfd"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><strong style={{fontSize:18}}>Toutes les correspondances possibles ({item.catalogMatches!.length})</strong>{selectedDuplicates.size>0&&<button type="button" className="cms-danger" disabled={working} onClick={()=>void deleteSelectedDuplicates()}>🗑 Supprimer les doublons sélectionnés ({selectedDuplicates.size})</button>}</div><div style={{display:"flex",gap:10,alignItems:"center",margin:"10px 0 12px",flexWrap:"wrap"}}><input type="search" value={matchSearch} onChange={e=>setMatchSearch(e.target.value)} placeholder="Rechercher : nom, article, marque, catégorie…" style={{minWidth:360,maxWidth:620,width:"100%",padding:"11px 13px",border:"1px solid #b9cbd5",borderRadius:9,fontSize:15}}/>{matchSearch&&<button type="button" className="cms-secondary" onClick={()=>setMatchSearch("")}>Effacer</button>}</div><p style={{margin:"5px 0 12px"}}>Clique sur une image pour la comparer en grand avec la photo importée.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:14}}>{item.catalogMatches!.filter(m=>{const q=norm(matchSearch);if(!q)return true;return norm(String(m.product.name_fr||"")+" "+String(m.product.name_en||"")+" "+String(m.product.article_number||"")+" "+String(m.product.brand||"")+" "+String(m.product.category||"")+" "+String(m.product.description_fr||"")+" "+String(m.product.description_en||"")).includes(q)}).map((m,i)=><div key={String(m.product.id||i)} style={{position:"relative"}}><label style={{position:"absolute",zIndex:2,left:10,top:10,display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,.94)",fontWeight:700,cursor:"pointer"}}><input type="checkbox" checked={selectedDuplicates.has(String(m.product.id))} onChange={e=>setSelectedDuplicates(prev=>{const next=new Set(prev);const id=String(m.product.id);e.target.checked?next.add(id):next.delete(id);return next})}/> Sélectionner</label><button type="button" title="Supprimer ce doublon" aria-label="Supprimer ce doublon" disabled={working} onClick={e=>{e.stopPropagation();void deleteMatchedProduct({...item,catalogMatch:m.product,catalogScore:m.score})}} style={{position:"absolute",zIndex:3,right:10,top:10,width:38,height:38,padding:0,border:"1px solid #d8b3b3",borderRadius:9,background:"#fff",fontSize:20,lineHeight:1,cursor:"pointer"}}>🗑</button><button type="button" key={String(m.product.id||i)} onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,catalogMatch:m.product,catalogScore:m.score,matchRejected:false,matchAccepted:false}:x))} style={{display:"grid",gap:8,padding:10,textAlign:"left",border:m.product.id===item.catalogMatch?.id?"3px solid #2676a8":"1px solid #cbdbe4",borderRadius:10,background:"#fff",cursor:"pointer"}}>{m.product.image_url?<img src={String(m.product.image_url)} alt={String(m.product.name_fr||"")} style={{width:"100%",height:210,objectFit:"contain",background:"#fff"}}/>:<div style={{height:210,display:"grid",placeItems:"center"}}>Aucune image</div>}<b>{String(m.product.name_fr||m.product.article_number||"Produit")}</b><span>No {String(m.product.article_number||"—")}</span><span>Correspondance : {Math.round(m.score*100)} %</span></button></div>)}</div></div>}</>:<span>{item.group&&items.filter(x=>x.group===item.group).length>1?`Même produit : ${items.filter(x=>x.group===item.group).length} photos`:"Produit unique"}</span>}
            <span>EN : {String(item.suggestion.description_en||"")}</span>
          </>:<span>{item.state==="error"?item.error:item.state==="ready"?"Prête à analyser":"Analyse en cours…"}</span>}
          <button type="button" className="cms-danger" disabled={working} onClick={()=>removeItem(item.id)}>Supprimer</button>
        </div>
      </article>)}
    </div>
    <label className="cms-ai-standby"><input type="checkbox" checked={standby} onChange={e=>setStandby(e.target.checked)}/><span><strong>Mettre les nouveaux produits en attente</strong><small>Les fiches seront enregistrées dans le CMS, mais resteront masquées du site jusqu’à leur activation.</small></span></label>
    <div className="cms-ai-actions"><button type="button" className="cms-danger" disabled={working} onClick={cancelBatch}>Annuler</button><button className="cms-secondary" disabled={working||unique.length===0} onClick={()=>void analyzeAll()}>Analyser avec l’IA</button><button className="cms-primary" disabled={working||ready===0} onClick={()=>void createAll()}>{standby?"Enregistrer les fiches en attente":"Enregistrer et afficher les produits"}</button></div>
    {zoomImage&&createPortal(<div style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:20,background:"rgba(11,23,36,.94)"}} onClick={()=>setZoomImage(null)}><button type="button" onClick={()=>setZoomImage(null)} style={{position:"fixed",right:24,top:20,width:50,height:50,border:0,borderRadius:"50%",fontSize:32,cursor:"pointer"}}>×</button><img src={zoomImage} alt="Aperçu agrandi" style={{maxWidth:"96vw",maxHeight:"94vh",objectFit:"contain",background:"#fff"}} onClick={e=>e.stopPropagation()}/></div>,document.body)}
  </>}
 </section>
}
