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
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null);
  const [selectedImageIndex,setSelectedImageIndex]=useState(0);

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

  useEffect(()=>{
    if(!selectedProduct) return;
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape") setSelectedProduct(null);
    };
    document.addEventListener("keydown",onKeyDown);
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{
      document.removeEventListener("keydown",onKeyDown);
      document.body.style.overflow=previousOverflow;
    };
  },[selectedProduct]);

  const visible=useMemo(()=>products.filter(p=>(!categories?.length||categories.includes(p.category))&&(!query.trim()||`${p.name_fr} ${p.name_en||""} ${p.description_fr||""}`.toLowerCase().includes(query.toLowerCase()))),[products,categories,query]);
  const money=(n:number)=>new Intl.NumberFormat(language==="fr"?"fr-CA":"en-CA",{maximumFractionDigits:0}).format(n);
  const productImages=(product:Product)=>{
    let extras:string[]=[];
    try {
      const parsed=JSON.parse(product.images_json||"[]");
      if(Array.isArray(parsed)) extras=parsed.filter((image):image is string=>typeof image==="string"&&image.trim().length>0);
    } catch {}
    return [product.image_url,...extras].filter((image,index,array):image is string=>Boolean(image)&&array.indexOf(image)===index);
  };

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
      {loading?<p>Chargement…</p>:visible.length===0?<p>{language==="fr"?"Aucun article dans cette catégorie pour le moment.":"No items in this category right now."}</p>:<div className="category-grid">{visible.map(p=><article
        className="category-card"
        key={p.id}
        role="button"
        tabIndex={0}
        aria-label={`${language==="fr"?"Voir la fiche de":"View details for"} ${language==="fr"?p.name_fr:(p.name_en||p.name_fr)}`}
        onClick={()=>{setSelectedImageIndex(0);setSelectedProduct(p);}}
        onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setSelectedImageIndex(0);setSelectedProduct(p);}}}
      >
        <div className="category-image">{p.image_url?<img src={p.image_url} alt={language==="fr"?p.name_fr:(p.name_en||p.name_fr)}/>:<span>Envol</span>}</div>
        <div className="category-copy"><p className="category-kicker">{p.category}</p><h2>{language==="fr"?p.name_fr:(p.name_en||p.name_fr)}</h2><strong>{money(Number(p.price||0))}</strong><p>{language==="fr"?(p.description_fr||""):(p.description_en||p.description_fr||"")}</p>{p.article_number&&<small>No {p.article_number}</small>}</div>
      </article>)}</div>}
    </section>

    {selectedProduct&&(()=>{
      const images=productImages(selectedProduct);
      const currentImage=images[selectedImageIndex]||selectedProduct.image_url;
      return <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)} onClick={()=>setSelectedProduct(null)}>
        <div className="product-lightbox-card" onClick={event=>event.stopPropagation()}>
          <button type="button" className="product-lightbox-close" aria-label={language==="fr"?"Fermer":"Close"} onClick={()=>setSelectedProduct(null)}>×</button>
          <div className="product-lightbox-image">
            {currentImage?<img src={currentImage} alt={language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)}/>:<div className="category-image"><span>Envol</span></div>}
            {images.length>1&&<div className="product-lightbox-thumbnails" aria-label={language==="fr"?"Photos du produit":"Product photos"}>{images.map((image,index)=><button type="button" className={selectedImageIndex===index?"active":""} key={`${image}-${index}`} onClick={()=>setSelectedImageIndex(index)} aria-label={`${language==="fr"?"Afficher la photo":"Show photo"} ${index+1}`}><img src={image} alt=""/></button>)}</div>}
          </div>
          <div className="product-lightbox-info">
            <p className="eyebrow">{language==="fr"?"Fiche article":"Product details"}</p>
            <h2>{language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)}</h2>
            <div className="product-lightbox-meta">
              <div><span>{language==="fr"?"No de commande":"Order number"}</span><strong>{selectedProduct.article_number||"—"}</strong></div>
              <div><span>{language==="fr"?"Catégorie":"Category"}</span><strong>{selectedProduct.category}</strong></div>
              <div><span>{language==="fr"?"Stock":"Stock"}</span><strong>{selectedProduct.stock??"—"}</strong></div>
              <div><span>{language==="fr"?"Disponibilité":"Availability"}</span><strong>{selectedProduct.status==="sold"?(language==="fr"?"Vendu":"Sold"):selectedProduct.status==="reserved"?(language==="fr"?"Réservé":"Reserved"):(language==="fr"?"Disponible":"Available")}</strong></div>
            </div>
            <p className="product-lightbox-price">{money(Number(selectedProduct.price||0))}</p>
            <p className="product-lightbox-description">{language==="fr"?(selectedProduct.description_fr||""):(selectedProduct.description_en||selectedProduct.description_fr||"")}</p>
          </div>
        </div>
      </div>;
    })()}
  </main>;
}
