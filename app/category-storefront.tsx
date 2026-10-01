"use client";

import { useEffect, useMemo, useState } from "react";
import { marketPrice, normalizeMarket, type Market } from "@/lib/markets";
import type { Product as CommerceProduct } from "@/lib/default-catalog";
import { useCommerce } from "./commerce/commerce-provider";
import { matchesProductSearch } from "@/lib/product-search";

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
  brand?:string;
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
  const [availability,setAvailability]=useState("all");
  const [brand,setBrand]=useState("all");
  const [age,setAge]=useState("all");
  const [sort,setSort]=useState("newest");
  const [minPrice,setMinPrice]=useState("");
  const [maxPrice,setMaxPrice]=useState("");
  const commerce=useCommerce();
  const themeCategory = categories?.[0] || "all";

  useEffect(()=>{
    const saved=window.localStorage.getItem("envol-language");
    if(saved==="en") setLanguage("en");
    const params=new URLSearchParams(window.location.search);
    const region=params.get("region");
    const initialQuery=params.get("q")?.trim()||"";
    if(initialQuery) setQuery(initialQuery);
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

  const availableBrands=useMemo(()=>Array.from(new Set(products.map(p=>p.brand?.trim()).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,"fr")),[products]);
  const availableAges=useMemo(()=>Array.from(new Set(products.map(p=>p.ages?.trim()).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,"fr")),[products]);

  const visible=useMemo(()=>{
    const min=minPrice.trim()===""?null:Number(minPrice);
    const max=maxPrice.trim()===""?null:Number(maxPrice);
    const filtered=products.filter(p=>{ 
      if(isFullCatalog&&excludedCatalogCategories.has(p.category)) return false;
      if(categories?.length&&!categories.includes(p.category)) return false;
      if(availability!=="all"&&p.status!==availability) return false;
      if(brand!=="all"&&p.brand!==brand) return false;
      if(age!=="all"&&p.ages!==age) return false;
      if(min!==null&&Number.isFinite(min)&&p.price<min) return false;
      if(max!==null&&Number.isFinite(max)&&p.price>max) return false;
      if(!matchesProductSearch(p, query)) return false;
      return true;
    });
    return [...filtered].sort((a,b)=>{
      if(sort==="price-asc") return a.price-b.price;
      if(sort==="price-desc") return b.price-a.price;
      if(sort==="name") return (language==="fr"?a.name_fr:(a.name_en||a.name_fr)).localeCompare(language==="fr"?b.name_fr:(b.name_en||b.name_fr));
      if(sort==="newest") return (b.badge==="new"?1:0)-(a.badge==="new"?1:0);
      return 0;
    });
  },[products,categories,isFullCatalog,availability,brand,age,minPrice,maxPrice,query,sort,language]);

