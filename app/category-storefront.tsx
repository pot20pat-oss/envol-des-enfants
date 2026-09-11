"use client";

import { useEffect, useMemo, useState } from "react";
import { marketPrice, normalizeMarket, type Market } from "@/lib/markets";

type Product = { id:string; name_fr:string; name_en?:string; category:string; price:number; image_url?:string; images_json?:string; description_fr?:string; description_en?:string; stock?:number; status?:string; article_number?:string; };
type CategoryTab = { value:string; labelFr:string; labelEn:string };
type Props = { title:string; subtitle:string; categories?:string[]; categoryTabs?:CategoryTab[] };

const catalogFamilies = [
  { value:"jouets", labelFr:"Jouets & jeux", labelEn:"Toys & games", categories:["eveil","imitation","dinosaures","animaux"] },
  { value:"poupees", labelFr:"Poupées & princesses", labelEn:"Dolls & princesses", categories:["poupees","princesses","disney","barbie","mylife","miraculous","lol","rainbowhigh","babyalive","hairmazing","karma","mysweetbaby","glamourgirl","autres_poupees"] },
  { value:"bebe", labelFr:"Bébé & éveil", labelEn:"Baby & early learning", categories:["bebe"] },
  { value:"ecole", labelFr:"Articles scolaires", labelEn:"School supplies", categories:["scolaire","sacs"] },
  { value:"pleinair", labelFr:"Véhicules & plein air", labelEn:"Vehicles & outdoor play", categories:["vehicules","piscine"] },
];

export default function CategoryStorefront({ title, subtitle, categories, categoryTabs }: Props) {
  const [products,setProducts]=useState<Product[]>([]); const [loading,setLoading]=useState(true); const [query,setQuery]=useState("");
  const [language,setLanguage]=useState<"fr"|"en">("fr"); const [market,setMarket]=useState<Market>("conakry");
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null); const [selectedImageIndex,setSelectedImageIndex]=useState(0); const [activeCategory,setActiveCategory]=useState("all");
  const isFullCatalog=!categories?.length&&!categoryTabs?.length;

  useEffect(()=>{ const saved=window.localStorage.getItem("envol-language"); if(saved==="en") setLanguage("en"); const region=new URLSearchParams(window.location.search).get("region"); const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone; fetch(`/api/catalog?${region?`region=${encodeURIComponent(region)}&`:""}timezone=${encodeURIComponent(timezone)}`).then(r=>r.json()).then(data=>{setProducts(Array.isArray(data.products)?data.products:[]);setMarket(normalizeMarket(data.region));}).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ if(!selectedProduct) return; const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape") setSelectedProduct(null);}; document.addEventListener("keydown",onKeyDown); const previousOverflow=document.body.style.overflow; document.body.style.overflow="hidden"; return ()=>{document.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow;}; },[selectedProduct]);

  const visible=useMemo(()=>products.filter(p=>{
    const family=catalogFamilies.find(item=>item.value===activeCategory);
    const categoryMatch=activeCategory==="all"||(family?family.categories.includes(p.category):p.category===activeCategory);
    return (!categories?.length||categories.includes(p.category))&&categoryMatch&&(!query.trim()||`${p.name_fr} ${p.name_en||""} ${p.description_fr||""}`.toLowerCase().includes(query.toLowerCase()));
  }),[products,categories,activeCategory,query]);
  const productImages=(product:Product)=>{ let extras:string[]=[]; try { const parsed=JSON.parse(product.images_json||"[]"); if(Array.isArray(parsed)) extras=parsed.filter((image):image is string=>typeof image==="string"&&image.trim().length>0); } catch {} return [product.image_url,...extras].filter((image,index,array):image is string=>Boolean(image)&&array.indexOf(image)===index); };
  const openProduct=(product:Product)=>{setSelectedImageIndex(0);setSelectedProduct(product);};

  return <main className="category-page">
    <header className="category-header wrap"><a href={`/?region=${market}`} className="category-brand"><img src="/envol-logo-officiel.svg" alt="Envol des Enfants"/></a><a href={`/?region=${market}`} className="category-back">← {language==="fr"?"Accueil":"Home"}</a></header>
    <section className="category-hero wrap">
      <p className="eyebrow">Envol des Enfants</p><h1>{title}</h1><p>{subtitle}</p>
      <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={language==="fr"?"Rechercher un jouet, une poupée, un article scolaire…":"Search for a toy, doll or school item…"}/>
      {(categoryTabs?.length||isFullCatalog)?<div className="category-tabs" role="tablist" aria-label={language==="fr"?"Familles du catalogue":"Catalog families"}>
        <button type="button" className={activeCategory==="all"?"active":""} onClick={()=>setActiveCategory("all")}>{language==="fr"?"Tout voir":"View all"}</button>
        {(categoryTabs?.length?categoryTabs:catalogFamilies).map(tab=><button type="button" role="tab" aria-selected={activeCategory===tab.value} className={activeCategory===tab.value?"active":""} key={tab.value} onClick={()=>setActiveCategory(tab.value)}>{language==="fr"?tab.labelFr:tab.labelEn}</button>)}
      </div>:null}
    </section>
    <section className="category-products wrap">
      {loading?<p>Chargement…</p>:visible.length===0?<p>{language==="fr"?"Aucun article dans cette catégorie pour le moment.":"No items in this category right now."}</p>:<div className="category-grid">{visible.map(p=><article className="category-card" key={p.id}>
        <button type="button" className="category-image-button" onClick={()=>openProduct(p)} aria-label={`${language==="fr"?"Agrandir l’image de":"Enlarge image of"} ${language==="fr"?p.name_fr:(p.name_en||p.name_fr)}`}><div className="category-image">{p.image_url?<img src={p.image_url} alt={language==="fr"?p.name_fr:(p.name_en||p.name_fr)}/>:<span>Envol</span>}</div></button>
        <div className="category-copy" onClick={()=>openProduct(p)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openProduct(p);}}}><p className="category-kicker">{p.category}</p><h2>{language==="fr"?p.name_fr:(p.name_en||p.name_fr)}</h2><strong>{marketPrice(p.price,market,language)}</strong><p>{language==="fr"?(p.description_fr||""):(p.description_en||p.description_fr||"")}</p>{p.article_number&&<small>No {p.article_number}</small>}</div>
      </article>)}</div>}
    </section>
    {selectedProduct&&(()=>{ const images=productImages(selectedProduct); const currentImage=images[selectedImageIndex]||selectedProduct.image_url; return <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)} onClick={()=>setSelectedProduct(null)}><div className="product-lightbox-card" onClick={event=>event.stopPropagation()}><button type="button" className="product-lightbox-close" aria-label={language==="fr"?"Fermer":"Close"} onClick={()=>setSelectedProduct(null)}>×</button><div className="product-lightbox-image">{currentImage?<img src={currentImage} alt={language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)}/>:<div className="category-image"><span>Envol</span></div>}{images.length>1&&<div className="product-lightbox-thumbnails">{images.map((image,index)=><button type="button" className={selectedImageIndex===index?"active":""} key={`${image}-${index}`} onClick={()=>setSelectedImageIndex(index)}><img src={image} alt=""/></button>)}</div>}</div><div className="product-lightbox-info"><p className="eyebrow">{language==="fr"?"Fiche article":"Product details"}</p><h2>{language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)}</h2><div className="product-lightbox-meta"><div><span>{language==="fr"?"No de commande":"Order number"}</span><strong>{selectedProduct.article_number||"—"}</strong></div><div><span>{language==="fr"?"Catégorie":"Category"}</span><strong>{selectedProduct.category}</strong></div><div><span>{language==="fr"?"Stock":"Stock"}</span><strong>{selectedProduct.stock??"—"}</strong></div><div><span>{language==="fr"?"Disponibilité":"Availability"}</span><strong>{selectedProduct.status==="sold"?(language==="fr"?"Vendu":"Sold"):selectedProduct.status==="reserved"?(language==="fr"?"Réservé":"Reserved"):(language==="fr"?"Disponible":"Available")}</strong></div></div><p className="product-lightbox-price">{marketPrice(selectedProduct.price,market,language)}</p><p className="product-lightbox-description">{language==="fr"?(selectedProduct.description_fr||""):(selectedProduct.description_en||selectedProduct.description_fr||"")}</p></div></div></div>; })()}
  </main>;
}
