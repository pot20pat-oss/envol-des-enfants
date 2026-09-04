"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id:string; name_fr:string; name_en?:string; category:string; price:number; image_url?:string; images_json?:string;
  description_fr?:string; description_en?:string; stock?:number; status?:string; article_number?:string;
};

type Props = { title:string; subtitle:string; categories?:string[] };

export default function CategoryStorefront({ title, subtitle, categories }: Props) {
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [language,setLanguage]=useState<"fr"|"en">("fr");

  useEffect(()=>{
    const saved=window.localStorage.getItem("envol-language");
    if(saved==="en") setLanguage("en");
    const region=new URLSearchParams(window.location.search).get("region");
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/catalog?${region?`region=${encodeURIComponent(region)}&`:""}timezone=${encodeURIComponent(timezone)}`)
      .then(r=>r.json())
      .then(data=>setProducts(Array.isArray(data.products)?data.products:[]))
      .finally(()=>setLoading(false));
  },[]);

  const visible=useMemo(()=>products.filter(p=>(!categories?.length||categories.includes(p.category))&&(!query.trim()||`${p.name_fr} ${p.name_en||""} ${p.description_fr||""}`.toLowerCase().includes(query.toLowerCase()))),[products,categories,query]);
  const money=(n:number)=>new Intl.NumberFormat(language==="fr"?"fr-CA":"en-CA",{maximumFractionDigits:0}).format(n);

  return <main className="category-page">
    <header className="category-header wrap">
      <a href="/" className="category-brand"><img src="/envol-logo-officiel.svg" alt="Envol des Enfants"/></a>
      <a href="/" className="category-back">← {language==="fr"?"Accueil":"Home"}</a>
    </header>
    <section className="category-hero wrap">
      <p className="eyebrow">Envol des Enfants</p>
      <h1>{title}</h1><p>{subtitle}</p>
      <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={language==="fr"?"Rechercher dans cette catégorie…":"Search this category…"}/>
    </section>
    <section className="category-products wrap">
      {loading?<p>Chargement…</p>:visible.length===0?<p>{language==="fr"?"Aucun article dans cette catégorie pour le moment.":"No items in this category right now."}</p>:<div className="category-grid">{visible.map(p=><article className="category-card" key={p.id}>
        <div className="category-image">{p.image_url?<img src={p.image_url} alt={language==="fr"?p.name_fr:(p.name_en||p.name_fr)}/>:<span>Envol</span>}</div>
        <div className="category-copy"><p className="category-kicker">{p.category}</p><h2>{language==="fr"?p.name_fr:(p.name_en||p.name_fr)}</h2><strong>{money(Number(p.price||0))}</strong><p>{language==="fr"?(p.description_fr||""):(p.description_en||p.description_fr||"")}</p>{p.article_number&&<small>No {p.article_number}</small>}</div>
      </article>)}</div>}
    </section>
  </main>;
}
