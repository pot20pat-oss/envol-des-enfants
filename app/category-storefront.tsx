"use client";

import { useEffect, useMemo, useState } from "react";
import { marketPrice, normalizeMarket, type Market } from "@/lib/markets";
import type { Product as CommerceProduct } from "@/lib/default-catalog";
import { useCommerce } from "./commerce/commerce-provider";

type Product = {
  id:string;
  name_fr:string;
  name_en?:string;
  category:string;
  price:number;
  image_url?:string;
  images_json?:string;
  description_fr?:string;
  description_en?:string;
  stock?:number;
  status?:string;
  article_number?:string;
  badge?:string;
};
type CategoryTab = { value:string; labelFr:string; labelEn:string };
type Props = { title:string; subtitle:string; categories?:string[]; categoryTabs?:CategoryTab[] };
type Family = { value:string; labelFr:string; labelEn:string; categories:string[]; children:{value:string;labelFr:string;labelEn:string}[] };

const catalogFamilies: Family[] = [
  {
    value:"jouets", labelFr:"Jouets & jeux", labelEn:"Toys & games",
    categories:["eveil","imitation","dinosaures","animaux"],
    children:[
      {value:"eveil",labelFr:"Jouets éducatifs",labelEn:"Educational toys"},
      {value:"imitation",labelFr:"Métiers & imitation",labelEn:"Pretend play"},
      {value:"dinosaures",labelFr:"Dinosaures & aventures",labelEn:"Dinosaurs & adventures"},
      {value:"animaux",labelFr:"Animaux & compagnons",labelEn:"Animals & companions"},
    ],
  },
  {
    value:"poupees", labelFr:"Poupées & princesses", labelEn:"Dolls & princesses",
    categories:["poupees","princesses","disney","barbie","mylife","miraculous","lol","rainbowhigh","babyalive","hairmazing","karma","mysweetbaby","glamourgirl","autres_poupees"],
    children:[
      {value:"poupees",labelFr:"Toutes les poupées",labelEn:"All dolls"},
      {value:"disney",labelFr:"Disney",labelEn:"Disney"},
      {value:"barbie",labelFr:"Barbie",labelEn:"Barbie"},
      {value:"miraculous",labelFr:"Miraculous",labelEn:"Miraculous"},
      {value:"lol",labelFr:"LOL Surprise & OMG",labelEn:"LOL Surprise & OMG"},
      {value:"rainbowhigh",labelFr:"Rainbow High",labelEn:"Rainbow High"},
      {value:"babyalive",labelFr:"Baby Alive",labelEn:"Baby Alive"},
      {value:"mylife",labelFr:"My Life",labelEn:"My Life"},
      {value:"autres_poupees",labelFr:"Autres poupées",labelEn:"Other dolls"},
    ],
  },
  {
    value:"bebe", labelFr:"Bébé & éveil", labelEn:"Baby & early learning", categories:["bebe"],
    children:[{value:"bebe",labelFr:"Jouets et articles pour bébé",labelEn:"Baby toys & items"}],
  },
  {
    value:"ecole", labelFr:"Articles scolaires", labelEn:"School supplies", categories:["scolaire","sacs"],
    children:[
      {value:"scolaire",labelFr:"Fournitures scolaires",labelEn:"School supplies"},
      {value:"sacs",labelFr:"Sacs & gourdes",labelEn:"Bags & bottles"},
    ],
  },
  {
    value:"pleinair", labelFr:"Véhicules & plein air", labelEn:"Vehicles & outdoor play", categories:["vehicules","piscine"],
    children:[
      {value:"vehicules",labelFr:"Véhicules",labelEn:"Vehicles"},
      {value:"piscine",labelFr:"Piscine & jeux d’eau",labelEn:"Pool & water play"},
    ],
  },
];

const excludedCatalogCategories = new Set(["vetements","chaussures"]);

export default function CategoryStorefront({ title, subtitle, categories, categoryTabs }: Props) {
  const isFullCatalog=!categories?.length&&!categoryTabs?.length;
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [language,setLanguage]=useState<"fr"|"en">("fr");
  const [market,setMarket]=useState<Market>("conakry");
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null);
  const [selectedImageIndex,setSelectedImageIndex]=useState(0);
  const [activeCategory,setActiveCategory]=useState("all");
  const [availability,setAvailability]=useState("all");
  const [sort,setSort]=useState("newest");
  const [minPrice,setMinPrice]=useState("");
  const [maxPrice,setMaxPrice]=useState("");
  const commerce=useCommerce();
  const themeCategory = activeCategory !== "all" && activeCategory !== "new" ? activeCategory : (categories?.[0] || "all");

  useEffect(()=>{
    const saved=window.localStorage.getItem("envol-language");
    if(saved==="en") setLanguage("en");
    const region=new URLSearchParams(window.location.search).get("region");
    const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`/api/catalog?${region?`region=${encodeURIComponent(region)}&`:""}timezone=${encodeURIComponent(timezone)}`)
      .then(r=>r.json())
      .then(data=>{setProducts(Array.isArray(data.products)?data.products:[]);setMarket(normalizeMarket(data.region));})
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    if(!selectedProduct) return;
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape") setSelectedProduct(null);};
    document.addEventListener("keydown",onKeyDown);
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.removeEventListener("keydown",onKeyDown);document.body.style.overflow=previousOverflow;};
  },[selectedProduct]);

  const visible=useMemo(()=>{
    const min=minPrice.trim()===""?null:Number(minPrice);
    const max=maxPrice.trim()===""?null:Number(maxPrice);
    const family=catalogFamilies.find(item=>item.value===activeCategory);
    const filtered=products.filter(p=>{
      if(isFullCatalog&&excludedCatalogCategories.has(p.category)) return false;
      if(categories?.length&&!categories.includes(p.category)) return false;
      if(activeCategory==="new"&&p.badge!=="new") return false;
      if(activeCategory!=="all"&&activeCategory!=="new") {
        if(family) { if(!family.categories.includes(p.category)) return false; }
        else if(p.category!==activeCategory) return false;
      }
      if(availability!=="all"&&p.status!==availability) return false;
      if(min!==null&&Number.isFinite(min)&&p.price<min) return false;
      if(max!==null&&Number.isFinite(max)&&p.price>max) return false;
      if(query.trim()&&!`${p.name_fr} ${p.name_en||""} ${p.description_fr||""} ${p.description_en||""} ${p.article_number||""}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
    return [...filtered].sort((a,b)=>{
      if(sort==="price-asc") return a.price-b.price;
      if(sort==="price-desc") return b.price-a.price;
      if(sort==="name") return (language==="fr"?a.name_fr:(a.name_en||a.name_fr)).localeCompare(language==="fr"?b.name_fr:(b.name_en||b.name_fr));
      if(sort==="newest") return (b.badge==="new"?1:0)-(a.badge==="new"?1:0);
      return 0;
    });
  },[products,categories,isFullCatalog,activeCategory,availability,minPrice,maxPrice,query,sort,language]);

  const productImages=(product:Product)=>{
    let extras:string[]=[];
    try { const parsed=JSON.parse(product.images_json||"[]"); if(Array.isArray(parsed)) extras=parsed.filter((image):image is string=>typeof image==="string"&&image.trim().length>0); } catch {}
    return [product.image_url,...extras].filter((image,index,array):image is string=>Boolean(image)&&array.indexOf(image)===index);
  };
  const openProduct=(product:Product)=>{setSelectedImageIndex(0);setSelectedProduct(product);};
  const selectCategory=(value:string)=>setActiveCategory(value);
  const label=(fr:string,en:string)=>language==="fr"?fr:en;
  const commerceProduct=(product:Product):CommerceProduct=>({
    id:product.id, articleNumber:product.article_number,
    name:{fr:product.name_fr,en:product.name_en||product.name_fr}, category:product.category,
    price:product.price, ages:"3+", sheet:"17", position:0, imageUrl:product.image_url,
    stock:product.stock, status:(product.status||"available") as CommerceProduct["status"],
    badge:product.badge as CommerceProduct["badge"],
    detail:{fr:product.description_fr||"",en:product.description_en||product.description_fr||""},
  });

  return <main className={`category-page${isFullCatalog?" catalog-marketplace":""} theme-${themeCategory}`}>
    <header className="category-header wrap">
      <a href={`/?region=${market}`} className="category-brand"><img src="/envol-logo-officiel.svg" alt="Envol des Enfants"/></a>
      <label className="category-header-search"><span className="sr-only">{label("Rechercher", "Search")}</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={label("Que recherchez-vous? (ex. Barbie, LEGO, Montessori…)","What are you looking for? (e.g. Barbie, LEGO, Montessori…)")}/><b aria-hidden="true">⌕</b></label>
      <div className="commerce-actions"><a href={`/?region=${market}`} className="category-back">← {label("Accueil","Home")}</a><button className="commerce-action" onClick={()=>commerce.open("account")}>♙ <span>{label("Compte","Account")}</span></button><button className="commerce-action" onClick={()=>commerce.open("favorites")}>♡ <span>{label("Favoris","Favorites")}</span>{commerce.favorites.length>0&&<b>{commerce.favorites.length}</b>}</button><button className="commerce-action" onClick={()=>commerce.open("cart")}>🛒 <span>{label("Panier","Cart")}</span>{commerce.cartCount>0&&<b>{commerce.cartCount}</b>}</button></div>
    </header>
    <nav className="category-main-nav">
      <a href={`/?region=${market}`}>⌂ {label("Accueil","Home")}</a><a href={`/bebe-enfants?region=${market}`}>{label("Éveil 0–3 ans","Early years")}</a><a href={`/jouets?region=${market}`}>{label("Jouets éducatifs","Educational toys")}</a><a href={`/poupees?region=${market}`}>{label("Mon monde de poupées","World of dolls")}</a><a href={`/catalogue?region=${market}`}>{label("Véhicules et jeux","Vehicles and games")}</a><a href={`/articles-scolaires?region=${market}`}>{label("Articles scolaires","School supplies")}</a><a href={`/promotions?region=${market}`}>{label("Soldes","Sales")}</a>
    </nav>

    <section className="category-hero wrap">
      <div className="category-hero-copy"><p className="eyebrow">Envol des Enfants</p><h1>{title}</h1><p>{subtitle}</p></div>
      {!isFullCatalog&&visible.slice(0,3).some(p=>p.image_url)&&<div className="category-hero-products" aria-hidden="true">{visible.slice(0,3).filter(p=>p.image_url).map(p=><img key={p.id} src={p.image_url} alt=""/>)}</div>}
    </section>

    {isFullCatalog&&<section className="catalog-command wrap" aria-label={label("Navigation et filtres du catalogue","Catalog navigation and filters")}>
      <div className="catalog-searchbar">
        <span aria-hidden="true">⌕</span>
        <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={label("Rechercher un jouet, une poupée, un numéro d’article…","Search a toy, doll or item number…")}/>
        <button type="button" onClick={()=>setQuery(query.trim())}>{label("Rechercher","Search")}</button>
      </div>

      <nav className="catalog-menu" aria-label={label("Familles du catalogue","Catalog families")}>
        <button type="button" className={activeCategory==="new"?"active":""} onClick={()=>selectCategory("new")}>{label("Nouveautés","New arrivals")}</button>
        <button type="button" className={activeCategory==="all"?"active":""} onClick={()=>selectCategory("all")}>{label("Tout voir","View all")}</button>
        {catalogFamilies.map(family=><details className="catalog-menu-group" key={family.value} onMouseLeave={event=>event.currentTarget.removeAttribute("open")}>
          <summary className={family.categories.includes(activeCategory)||family.value===activeCategory?"active":""}>{label(family.labelFr,family.labelEn)} <span>⌄</span></summary>
          <div className="catalog-menu-panel">
            <button type="button" onClick={event=>{selectCategory(family.value);event.currentTarget.closest("details")?.removeAttribute("open");}}>{label("Voir toute la famille","View all in this family")}</button>
            {family.children.map(child=><button type="button" className={activeCategory===child.value?"active":""} key={child.value} onClick={event=>{selectCategory(child.value);event.currentTarget.closest("details")?.removeAttribute("open");}}>{label(child.labelFr,child.labelEn)}</button>)}
          </div>
        </details>)}
      </nav>

      <div className="catalog-filters">
        <label><span>{label("Disponibilité","Availability")}</span><select value={availability} onChange={e=>setAvailability(e.target.value)}><option value="all">{label("Toutes","All")}</option><option value="available">{label("Disponible","Available")}</option><option value="reserved">{label("Réservé","Reserved")}</option><option value="sold">{label("Vendu","Sold out")}</option></select></label>
        <label><span>{label("Prix min.","Min price")}</span><input inputMode="numeric" type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="0"/></label>
        <label><span>{label("Prix max.","Max price")}</span><input inputMode="numeric" type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="∞"/></label>
        <label><span>{label("Trier par","Sort by")}</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">{label("Nouveautés d’abord","Newest first")}</option><option value="price-asc">{label("Prix croissant","Price: low to high")}</option><option value="price-desc">{label("Prix décroissant","Price: high to low")}</option><option value="name">{label("Nom A–Z","Name A–Z")}</option></select></label>
        <button className="catalog-reset" type="button" onClick={()=>{setActiveCategory("all");setAvailability("all");setMinPrice("");setMaxPrice("");setQuery("");setSort("newest");}}>{label("Réinitialiser","Reset")}</button>
      </div>
      <div className="catalog-result-line"><strong>{visible.length}</strong> {label("articles affichés","items shown")} · {market==="qc"?label("Québec","Quebec"):"Conakry"}</div>
    </section>}

    {!isFullCatalog&&<section className="wrap category-local-tools">
      <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={label("Rechercher dans cette catégorie…","Search this category…")}/>
      {categoryTabs?.length?<div className="category-tabs" role="tablist"><button type="button" className={activeCategory==="all"?"active":""} onClick={()=>selectCategory("all")}>{label("Toutes","All")}</button>{categoryTabs.map(tab=><button type="button" className={activeCategory===tab.value?"active":""} key={tab.value} onClick={()=>selectCategory(tab.value)}>{label(tab.labelFr,tab.labelEn)}</button>)}</div>:null}
    </section>}

    <div className="category-shop-layout wrap">
      {!isFullCatalog&&<aside className="category-sidebar"><h3>{label("Catégories","Categories")}</h3><button className={activeCategory==="all"?"active":""} onClick={()=>selectCategory("all")}>{label("Tout voir","View all")}</button>{categoryTabs?.map(tab=><button key={tab.value} className={activeCategory===tab.value?"active":""} onClick={()=>selectCategory(tab.value)}>{label(tab.labelFr,tab.labelEn)}</button>)}<h3>{label("Disponibilité","Availability")}</h3><button className={availability==="all"?"active":""} onClick={()=>setAvailability("all")}>{label("Tous les articles","All items")}</button><button className={availability==="available"?"active":""} onClick={()=>setAvailability("available")}>{label("Disponible","Available")}</button><button className={availability==="reserved"?"active":""} onClick={()=>setAvailability("reserved")}>{label("Réservé","Reserved")}</button></aside>}
    <section className="category-products">
      {loading?<p>{label("Chargement…","Loading…")}</p>:visible.length===0?<p>{label("Aucun article ne correspond à ces filtres.","No items match these filters.")}</p>:<div className="category-grid">{visible.map(p=><article className="category-card" key={p.id}>
        <button type="button" className="category-image-button" onClick={()=>openProduct(p)} aria-label={`${label("Agrandir l’image de","Enlarge image of")} ${language==="fr"?p.name_fr:(p.name_en||p.name_fr)}`}><div className="category-image">{p.image_url?<img src={p.image_url} alt={language==="fr"?p.name_fr:(p.name_en||p.name_fr)}/>:<span>Envol</span>}</div></button>
        <div className="category-copy" onClick={()=>openProduct(p)} role="button" tabIndex={0} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openProduct(p);}}}>
          <p className="category-kicker">{p.badge==="new"?label("Nouveauté","New arrival"):p.category}</p>
          <h2>{language==="fr"?p.name_fr:(p.name_en||p.name_fr)}</h2>
          <strong>{marketPrice(p.price,market,language)}</strong>
          <p>{language==="fr"?(p.description_fr||""):(p.description_en||p.description_fr||"")}</p>
          {p.article_number&&<small>No {p.article_number}</small>}
          {p.status!=="sold"&&Number(p.price||0)>0&&<div className="product-commerce-buttons"><button type="button" className="product-cart" onClick={(event)=>{event.stopPropagation();commerce.addToCart(commerceProduct(p));}}>{label("Ajouter au panier","Add to cart")}</button><button type="button" className="product-favorite" onClick={(event)=>{event.stopPropagation();commerce.toggleFavorite(commerceProduct(p));}}>{commerce.isFavorite(commerceProduct(p))?"♥":"♡"}</button></div>}
        </div>
      </article>)}</div>}
    </section>
    </div>

    {selectedProduct&&(()=>{ const images=productImages(selectedProduct); const currentImage=images[selectedImageIndex]||selectedProduct.image_url; return <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)} onClick={()=>setSelectedProduct(null)}><div className="product-lightbox-card" onClick={event=>event.stopPropagation()}><button type="button" className="product-lightbox-close" aria-label={label("Fermer","Close")} onClick={()=>setSelectedProduct(null)}>×</button><div className="product-lightbox-image">{currentImage?<img src={currentImage} alt={language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)}/>:<div className="category-image"><span>Envol</span></div>}{images.length>1&&<div className="product-lightbox-thumbnails">{images.map((image,index)=><button type="button" className={selectedImageIndex===index?"active":""} key={`${image}-${index}`} onClick={()=>setSelectedImageIndex(index)}><img src={image} alt=""/></button>)}</div>}</div><div className="product-lightbox-info"><p className="eyebrow">{label("Fiche article","Product details")}</p><h2>{language==="fr"?selectedProduct.name_fr:(selectedProduct.name_en||selectedProduct.name_fr)}</h2><div className="product-lightbox-meta"><div><span>{label("No de commande","Order number")}</span><strong>{selectedProduct.article_number||"—"}</strong></div><div><span>{label("Catégorie","Category")}</span><strong>{selectedProduct.category}</strong></div><div><span>{label("Stock","Stock")}</span><strong>{selectedProduct.stock??"—"}</strong></div><div><span>{label("Disponibilité","Availability")}</span><strong>{selectedProduct.status==="sold"?label("Vendu","Sold"):selectedProduct.status==="reserved"?label("Réservé","Reserved"):label("Disponible","Available")}</strong></div></div><p className="product-lightbox-price">{marketPrice(selectedProduct.price,market,language)}</p><p className="product-lightbox-description">{language==="fr"?(selectedProduct.description_fr||""):(selectedProduct.description_en||selectedProduct.description_fr||"")}</p></div></div></div>; })()}
  </main>;
}
