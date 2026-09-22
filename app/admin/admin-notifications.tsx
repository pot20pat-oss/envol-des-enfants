"use client";

import { useMemo, useState } from "react";
import { marketPrice, markets, type Market } from "@/lib/markets";
import type { Row } from "./admin-shared";

type Problem={product:Row;issues:string[];severity:"high"|"medium"};

function text(value:unknown){return String(value||"").trim()}

export function NotificationsSection({products,market,onEdit}:{products:Row[];market:Market;onEdit:(product:Row)=>void}){
 const[filter,setFilter]=useState<"all"|"price"|"description"|"image"|"stock"|"name"|"pending">("all");
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
 return <section className="cms-panel cms-problems">
  <div className="cms-panel-title"><div><h2>À vérifier · {markets[market].label}</h2><p>File de contrôle du catalogue : corrigez uniquement les fiches qui nécessitent une intervention.</p></div><strong>{problems.length} article{problems.length===1?"":"s"} à vérifier</strong></div>
  <div className="cms-problem-stats"><button onClick={()=>setFilter("all")} className={filter==="all"?"active":""}><b>{problems.length}</b><span>Tous</span></button><button onClick={()=>setFilter("price")} className={filter==="price"?"active":""}><b>{counts.price}</b><span>Sans prix</span></button><button onClick={()=>setFilter("description")} className={filter==="description"?"active":""}><b>{counts.description}</b><span>Descriptions</span></button><button onClick={()=>setFilter("image")} className={filter==="image"?"active":""}><b>{counts.image}</b><span>Sans photo</span></button><button onClick={()=>setFilter("stock")} className={filter==="stock"?"active":""}><b>{counts.stock}</b><span>Stock</span></button><button onClick={()=>setFilter("name")} className={filter==="name"?"active":""}><b>{counts.name}</b><span>Noms</span></button><button onClick={()=>setFilter("pending")} className={filter==="pending"?"active":""}><b>{counts.pending}</b><span>En attente</span></button></div>
  <div className="cms-problem-list" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14,alignItems:"stretch"}}>{shown.map(({product,issues,severity})=><article key={String(product.id)} className={`cms-problem ${severity}`} style={{display:"grid",gridTemplateColumns:"110px minmax(0,1fr)",gridTemplateRows:"1fr auto",gap:14,padding:14,borderRadius:12,background:"#fff",minHeight:210,alignItems:"start"}}><div style={{width:110,height:110,display:"grid",placeItems:"center",background:"#fff",border:"1px solid #e2eaee",borderRadius:10,overflow:"hidden"}}>{product.image_url?<img src={String(product.image_url)} alt="" style={{maxWidth:"100%",maxHeight:"100%",width:"auto",height:"auto",objectFit:"contain"}}/>:<span className="cms-problem-noimage">?</span>}</div><div className="cms-problem-body"><small>{String(product.article_number||"Sans no d’article")}</small><h3>{String(product.name_fr||"Produit sans nom")}</h3><div className="cms-problem-tags">{issues.map(issue=><span key={issue}>{issue}</span>)}</div><p>{Number(product[`price_${market}`]||0)>0?marketPrice(product[`price_${market}`],market):"Prix non défini"} · {Boolean(product[`visible_${market}`])?"Visible sur le site":"En attente / masqué"}</p></div><button className="cms-primary" style={{gridColumn:"1 / -1",width:"100%"}} onClick={()=>onEdit(product)}>Corriger la fiche</button></article>)}</div>
  {!shown.length&&<p className="cms-empty">Aucun problème dans cette catégorie.</p>}
 </section>
}
