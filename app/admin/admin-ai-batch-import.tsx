"use client";

import { useMemo, useState } from "react";
import { categories, request, type Row } from "./admin-shared";
import type { Market } from "@/lib/markets";

type Item = { id:string; file:File; preview:string; hash:string; duplicate:boolean; url?:string; suggestion?:Row; state:"ready"|"uploading"|"analyzing"|"done"|"error"; error?:string };

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2,"0")).join("");
}

export function AiBatchImport({ market, busy, onDone }: { market:Market; busy:boolean; onDone:()=>Promise<void> }) {
  const [items,setItems]=useState<Item[]>([]);
  const [working,setWorking]=useState(false);
  const unique=useMemo(()=>items.filter((i)=>!i.duplicate),[items]);

  async function choose(files:FileList|null) {
    const selected=Array.from(files||[]).filter((f)=>f.type.startsWith("image/"));
    const seen=new Set<string>(); const next:Item[]=[];
    for (const file of selected) {
      const hash=await sha256(file); const duplicate=seen.has(hash); seen.add(hash);
      next.push({id:crypto.randomUUID(),file,preview:URL.createObjectURL(file),hash,duplicate,state:"ready"});
    }
    setItems(next);
  }

  async function analyzeAll() {
    setWorking(true);
    for (const item of unique) {
      try {
        setItems((a)=>a.map((x)=>x.id===item.id?{...x,state:"uploading"}:x));
        const data=new FormData(); data.append("file",item.file);
        const uploaded=await request("/api/admin/upload",{method:"POST",body:data});
        const url=String(uploaded.url||"");
        setItems((a)=>a.map((x)=>x.id===item.id?{...x,url,state:"analyzing"}:x));
        const analyzed=await request("/api/admin/analyze-product",{method:"POST",body:JSON.stringify({image_url:url})});
        setItems((a)=>a.map((x)=>x.id===item.id?{...x,url,suggestion:analyzed.suggestion as Row,state:"done"}:x));
      } catch(error) {
        setItems((a)=>a.map((x)=>x.id===item.id?{...x,state:"error",error:error instanceof Error?error.message:"Erreur"}:x));
      }
    }
    setWorking(false);
  }

  function update(id:string,field:string,value:string) {
    setItems((a)=>a.map((i)=>i.id===id&&i.suggestion?{...i,suggestion:{...i.suggestion,[field]:value}}:i));
  }

  async function createAll() {
    setWorking(true);
    try {
      for (const item of items.filter((x)=>!x.duplicate&&x.state==="done"&&x.suggestion&&x.url)) {
        await request("/api/admin/products",{method:"POST",body:JSON.stringify({...item.suggestion,image_url:item.url,images_json:"[]",price_qc:0,price_conakry:0,stock_qc:0,stock_conakry:0,visible_qc:market==="qc",visible_conakry:market==="conakry"})});
      }
      await onDone(); setItems([]);
    } finally { setWorking(false); }
  }

  const duplicates=items.filter((i)=>i.duplicate).length;
  const ready=items.filter((i)=>!i.duplicate&&i.state==="done").length;
  return <section className="cms-ai-batch">
    <div className="cms-ai-batch-head"><div><h3>Importation intelligente par IA</h3><p>Déposez un lot de photos. Les fichiers identiques sont éliminés avant l’analyse; l’IA prépare les fiches FR/EN à valider.</p></div><label className="cms-primary cms-ai-file">Choisir des photos<input type="file" accept="image/*" multiple disabled={busy||working} onChange={(e)=>void choose(e.target.files)}/></label></div>
    {items.length>0&&<><div className="cms-ai-summary"><strong>{items.length}</strong> image(s) · <strong>{duplicates}</strong> doublon(s) éliminé(s) · <strong>{unique.length}</strong> à analyser · <strong>{ready}</strong> fiche(s) prête(s)</div>
    <div className="cms-ai-grid">{items.map((item)=><article key={item.id} className={item.duplicate?"is-duplicate":""}><img src={item.preview} alt=""/><div><strong>{item.file.name}</strong>{item.duplicate?<span>Doublon exact — ignoré</span>:item.suggestion?<><input value={String(item.suggestion.name_fr||"")} onChange={(e)=>update(item.id,"name_fr",e.target.value)}/><select value={String(item.suggestion.category||"eveil")} onChange={(e)=>update(item.id,"category",e.target.value)}>{Object.entries(categories).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><textarea value={String(item.suggestion.description_fr||"")} onChange={(e)=>update(item.id,"description_fr",e.target.value)}/><small>EN : {String(item.suggestion.description_en||"")}</small></>:<span>{item.state==="error"?item.error:item.state==="ready"?"Prête à analyser":"Analyse en cours…"}</span>}</div></article>)}</div>
    <div className="cms-ai-actions"><button className="cms-secondary" disabled={working||unique.length===0} onClick={()=>void analyzeAll()}>Analyser avec l’IA</button><button className="cms-primary" disabled={working||ready===0} onClick={()=>void createAll()}>Créer les {ready} produit(s) validés</button></div></>}
  </section>;
}
