"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { marketPrice, markets, type Market } from "@/lib/markets";
import { request, type Row } from "./admin-shared";

type Suggestion = {
  product_id: string; article_number: string; name: string; current_price: number;
  suggested_price: number; change: number; reason: string; confidence: number;
};

export function AiAdvisorSection({ market, products, settings, setSettings, reload }: {
  market: Market; products: Row[]; settings: Record<string,string>;
  setSettings: Dispatch<SetStateAction<Record<string,string>>>; reload: () => Promise<void>;
}) {
  const [suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const prefix="ai_";
  const visibleCount=useMemo(()=>products.filter((p)=>Boolean(p[`visible_${market}`])).length,[products,market]);

  const saveRules=async()=>{
    setBusy(true); setMessage("");
    try { await request("/api/admin/settings",{method:"POST",body:JSON.stringify(settings)}); setMessage("Paramètres généraux des prix enregistrés."); }
    catch(e){ setMessage(e instanceof Error?e.message:"Enregistrement impossible."); } finally{setBusy(false);}
  };
  const audit=async()=>{
    setBusy(true); setMessage("");
    try { const r=await request("/api/admin/price-advisor",{method:"POST",body:JSON.stringify({region:market})}); setSuggestions((r.suggestions||[]) as Suggestion[]); setMessage(`${(r.suggestions as unknown[]||[]).length} produit(s) analysé(s).`); }
    catch(e){setMessage(e instanceof Error?e.message:"Audit impossible.");} finally{setBusy(false);}
  };
  const apply=async(s:Suggestion)=>{
    const product=products.find((p)=>String(p.id)===s.product_id); if(!product)return;
    if(!window.confirm(`Appliquer ${marketPrice(s.suggested_price,market)} à ${s.name} ?`))return;
    setBusy(true);
    try { await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...product,[`price_${market}`]:s.suggested_price})}); await reload(); setSuggestions((x)=>x.filter((i)=>i.product_id!==s.product_id)); setMessage("Prix appliqué. Les autres suggestions restent inchangées."); }
    catch(e){setMessage(e instanceof Error?e.message:"Modification impossible.");} finally{setBusy(false);}
  };

  return <div className="cms-ai-advisor">
    <section className="cms-panel cms-form">
      <div className="cms-panel-title"><div><h2>Paramètres généraux des prix</h2><p>Ces règles sont indépendantes des boutiques Québec et Conakry. Elles servent de cadre commercial commun; l’audit applique ensuite le prix et la devise propres à la boutique sélectionnée.</p></div></div>
      <div className="cms-form-grid">
        <label>Marge cible (%)<input type="number" min="0" max="90" value={settings[prefix+"target_margin"]||"40"} onChange={e=>setSettings(x=>({...x,[prefix+"target_margin"]:e.target.value}))}/></label>
        <label>Ajustement commercial souhaité (%)<input type="number" min="-100" max="100" value={settings[prefix+"adjustment"]||"0"} onChange={e=>setSettings(x=>({...x,[prefix+"adjustment"]:e.target.value}))}/></label>
        <label>Variation maximale autorisée (%)<input type="number" min="1" max="100" value={settings[prefix+"max_change"]||"20"} onChange={e=>setSettings(x=>({...x,[prefix+"max_change"]:e.target.value}))}/></label>
        <label>Produits actuellement auditables<input value={`${visibleCount} · ${markets[market].label}`} readOnly/></label>
      </div>
      <div className="cms-ai-advisor-actions"><button type="button" className="cms-secondary" disabled={busy} onClick={()=>void saveRules()}>Enregistrer les paramètres</button><button type="button" className="cms-primary" disabled={busy} onClick={()=>void audit()}>{busy?"Analyse…":"Audit IA des prix"}</button></div>
      {message&&<p className="cms-ai-advisor-message">{message}</p>}
    </section>
    {suggestions.length>0&&<section className="cms-panel">
      <div className="cms-panel-title"><h2>Recommandations</h2><span>{suggestions.length} à examiner</span></div>
      <div className="cms-ai-price-grid">{suggestions.map(s=><article key={s.product_id}>
        <div><small>{s.article_number||"Sans no d’article"}</small><h3>{s.name}</h3></div>
        <div className="cms-ai-price-values"><span>Actuel <strong>{marketPrice(s.current_price,market)}</strong></span><span>Suggéré <strong>{marketPrice(s.suggested_price,market)}</strong></span><b>{s.change>0?"+":""}{s.change}%</b></div>
        <p>{s.reason}</p><div className="cms-ai-price-actions"><button className="cms-primary" disabled={busy} onClick={()=>void apply(s)}>Appliquer</button><button className="cms-secondary" onClick={()=>setSuggestions(x=>x.filter(i=>i.product_id!==s.product_id))}>Ignorer</button></div>
      </article>)}</div>
    </section>}
  </div>;
}
