"use client";

import { useMemo, useState } from "react";
import { marketPrice, markets, type Market } from "@/lib/markets";
import type { Row } from "./admin-shared";

type Problem={product:Row;issues:string[];severity:"high"|"medium"};

function text(value:unknown){return String(value||"").trim()}

export function NotificationsSection({products,market,onEdit,reload}:{products:Row[];market:Market;onEdit:(product:Row)=>void;reload:()=>Promise<void>}){
 const[aiBusy,setAiBusy]=useState<string|null>(null);const[aiNotice,setAiNotice]=useState("");const[selected,setSelected]=useState<Set<string>>(new Set());const[batchBusy,setBatchBusy]=useState(false);const[batchProgress,setBatchProgress]=useState({done:0,total:0});
 const[filter,setFilter]=useState<"all"|"price"|"description"|"image"|"stock"|"name"|"pending">("all");
 async function repairWithAi(product:Row){
  const id=String(product.id||"");if(!id||!text(product.image_url))return;
  setAiBusy(id);setAiNotice("");
  try{
   const analyzed=await fetch("/api/admin/analyze-product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:String(product.image_url)})});
   const payload=await analyzed.json() as {suggestion?:Record<string,unknown>;error?:string};
   if(!analyzed.ok||!payload.suggestion)throw new Error(payload.error||"Analyse IA impossible.");
   const s=payload.suggestion;
   const patched={...product,
    name_fr:text(product.name_fr)||text(s.name_fr),
    name_en:text(product.name_en)||text(s.name_en),
    description_fr:text(product.description_fr)||text(s.description_fr),
    description_en:text(product.description_en)||text(s.description_en),
    category:text(product.category)||text(s.category),
    brand:text(product.brand)||text(s.brand),
    ages:text(product.ages)||text(s.ages),
   };
   const saved=await fetch("/api/admin/products",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(patched)});
   const savedPayload=await saved.json() as {error?:string};if(!saved.ok)throw new Error(savedPayload.error||"Enregistrement impossible.");
   setAiNotice(`✓ ${text(product.name_fr)||text(s.name_fr)} : champs manquants complétés par l’IA.`);await reload();
  }catch(error){setAiNotice(error instanceof Error?`Erreur IA : ${error.message}`:"Erreur IA.");}finally{setAiBusy(null)}
 }
 async function repairBatch(){
  const queue=shown.filter(({product})=>selected.has(String(product.id))&&text(product.image_url));if(!queue.length)return;
  if(!window.confirm(`Corriger avec l’IA ${queue.length} fiche(s) sélectionnée(s) ?\n\nSeuls les champs manquants seront complétés. Les prix et stocks ne seront pas inventés.`))return;
  setBatchBusy(true);setAiNotice("");setBatchProgress({done:0,total:queue.length});let ok=0,failed=0;
  for(const {product} of queue){try{setAiBusy(String(product.id));const analyzed=await fetch("/api/admin/analyze-product",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_url:String(product.image_url)})});const payload=await analyzed.json() as {suggestion?:Record<string,unknown>;error?:string};if(!analyzed.ok||!payload.suggestion)throw new Error(payload.error||"Analyse IA impossible.");const s=payload.suggestion;const patched={...product,name_fr:text(product.name_fr)||text(s.name_fr),name_en:text(product.name_en)||text(s.name_en),description_fr:text(product.description_fr)||text(s.description_fr),description_en:text(product.description_en)||text(s.description_en),category:text(product.category)||text(s.category),brand:text(product.brand)||text(s.brand),ages:text(product.ages)||text(s.ages)};const saved=await fetch("/api/admin/products",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(patched)});if(!saved.ok)throw new Error("Enregistrement impossible.");ok++}catch{failed++}finally{setBatchProgress(p=>({...p,done:p.done+1}))}}
  setAiBusy(null);setBatchBusy(false);setSelected(new Set());setAiNotice(`✓ Correction IA en lot terminée : ${ok} corrigée(s)${failed?`, ${failed} échec(s)`:""}.`);await reload();
 }
 const problems=useMemo<Problem[]>(()=>products.map(product=>{
  const issues:string[]=[];
  const visible=Boolean(product[`visible_${market}`]);
  if(Number(product[`price_${market}`]||0)<=0)issues.push("Sans prix");
  if(!text(product.description_fr))issues.push("Description FR manquante");
  if(!text(product.description_en))issues.push("Description EN manquante");
  if(!text(product.image_url))issues.push("Sans photo");
  if(!text(product.name_fr))issues.push("Nom FR manquant");
  if(!text(product.name_en))issues.push("Nom EN manquant");
  if(!text(product.category))issues.push("Catégorie manquante");
  if(visible&&Number(product[`stock_${market}`]||0)<=0)issues.push("Visible mais sans stock");
  if(!visible)issues.push("Produit en attente");
  return issues.length?{product,issues,severity:visible&&(issues.includes("Sans prix")||issues.includes("Sans photo")||issues.includes("Nom FR manquant"))?"high":"medium"} as Problem:null;
 }).filter((x):x is Problem=>Boolean(x)),[products,market]);
 const shown=problems.filter(p=>filter==="all"||p.issues.some(i=>filter==="price"?i==="Sans prix":filter==="description"?i.includes("Description"):filter==="image"?i==="Sans photo":filter==="stock"?i.includes("stock"):filter==="pending"?i==="Produit en attente":i.includes("Nom")));
 const counts={price:problems.filter(p=>p.issues.includes("Sans prix")).length,description:problems.filter(p=>p.issues.some(i=>i.includes("Description"))).length,image:problems.filter(p=>p.issues.includes("Sans photo")).length,stock:problems.filter(p=>p.issues.some(i=>i.includes("stock"))).length,pending:problems.filter(p=>p.issues.includes("Produit en attente")).length,name:problems.filter(p=>p.issues.some(i=>i.includes("Nom"))).length};
 return <section className="cms-panel cms-problems">{aiNotice&&<div className={aiNotice.startsWith("✓")?"cms-notice":"cms-error"} style={{marginBottom:12}}>{aiNotice}</div>}
  <div className="cms-panel-title"><div><h2>À vérifier · {markets[market].label}</h2><p>File de contrôle du catalogue : corrigez uniquement les fiches qui nécessitent une intervention.</p></div><strong>{problems.length} article{problems.length===1?"":"s"} à vérifier</strong></div>
  <div className="cms-problem-stats"><button onClick={()=>setFilter("all")} className={filter==="all"?"active":""}><b>{problems.length}</b><span>Tous</span></button><button onClick={()=>setFilter("price")} className={filter==="price"?"active":""}><b>{counts.price}</b><span>Sans prix</span></button><button onClick={()=>setFilter("description")} className={filter==="description"?"active":""}><b>{counts.description}</b><span>Descriptions</span></button><button onClick={()=>setFilter("image")} className={filter==="image"?"active":""}><b>{counts.image}</b><span>Sans photo</span></button><button onClick={()=>setFilter("stock")} className={filter==="stock"?"active":""}><b>{counts.stock}</b><span>Stock</span></button><button onClick={()=>setFilter("name")} className={filter==="name"?"active":""}><b>{counts.name}</b><span>Noms</span></button><button onClick={()=>setFilter("pending")} className={filter==="pending"?"active":""}><b>{counts.pending}</b><span>En attente</span></button></div>
  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",margin:"0 0 14px",padding:12,border:"1px solid #d8e4e9",borderRadius:12,background:"#fff"}}><strong>Correction en lot · {selected.size} sélectionné(s)</strong><button className="cms-secondary" disabled={batchBusy} onClick={()=>setSelected(new Set(shown.map(p=>String(p.product.id))))}>Tout sélectionner ({shown.length})</button><button className="cms-secondary" disabled={batchBusy||!selected.size} onClick={()=>setSelected(new Set())}>Désélectionner</button><button className="cms-primary" disabled={batchBusy||!selected.size} onClick={()=>void repairBatch()}>{batchBusy?`⌛ IA ${batchProgress.done}/${batchProgress.total}`:`✦ Corriger la sélection avec l’IA`}</button>{batchBusy&&<progress max={batchProgress.total||1} value={batchProgress.done} style={{minWidth:180}}/>}</div>
  <div className="cms-problem-list" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14,alignItems:"stretch"}}>{shown.map(({product,issues,severity})=><article key={String(product.id)} className={`cms-problem ${severity}`} style={{position:"relative",display:"grid",gridTemplateColumns:"110px minmax(0,1fr)",gridTemplateRows:"1fr auto",gap:14,padding:14,borderRadius:12,background:"#fff",minHeight:210,alignItems:"start"}}><label style={{position:"absolute",top:8,left:8,zIndex:2,background:"#fff",padding:"5px 7px",borderRadius:7,fontWeight:700}}><input type="checkbox" checked={selected.has(String(product.id))} disabled={batchBusy} onChange={e=>setSelected(prev=>{const next=new Set(prev);e.target.checked?next.add(String(product.id)):next.delete(String(product.id));return next})}/> Sélectionner</label><div style={{width:110,height:110,display:"grid",placeItems:"center",background:"#fff",border:"1px solid #e2eaee",borderRadius:10,overflow:"hidden"}}>{product.image_url?<img src={String(product.image_url)} alt="" style={{maxWidth:"100%",maxHeight:"100%",width:"auto",height:"auto",objectFit:"contain"}}/>:<span className="cms-problem-noimage">?</span>}</div><div className="cms-problem-body"><small>{String(product.article_number||"Sans no d’article")}</small><h3>{String(product.name_fr||"Produit sans nom")}</h3><div className="cms-problem-tags">{issues.map(issue=><span key={issue}>{issue}</span>)}</div><p>{Number(product[`price_${market}`]||0)>0?marketPrice(product[`price_${market}`],market):"Prix non défini"} · {Boolean(product[`visible_${market}`])?"Visible sur le site":"En attente / masqué"}</p></div><div style={{gridColumn:"1 / -1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button className="cms-secondary" disabled={aiBusy!==null||!text(product.image_url)} title={!text(product.image_url)?"Une photo est nécessaire pour la correction IA":undefined} onClick={()=>void repairWithAi(product)}>{aiBusy===String(product.id)?"⌛ Correction IA…":"✦ Corriger avec l’IA"}</button><button className="cms-primary" onClick={()=>onEdit(product)}>Corriger la fiche</button></div></article>)}</div>
  {!shown.length&&<p className="cms-empty">Aucun problème dans cette catégorie.</p>}
 </section>
}
