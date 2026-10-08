import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cmsEnv } from "@/lib/cms";
import BackToOrigin from "@/app/components/back-to-origin";

type Product = Record<string, unknown>;
async function getProduct(id:string){
  return cmsEnv().DB.prepare("SELECT * FROM products WHERE id=? AND (visible_qc=1 OR visible_conakry=1) LIMIT 1").bind(id).first<Product>();
}
function text(v:unknown){return typeof v==="string"?v.trim():"";}
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params; const p=await getProduct(id); if(!p) return {};
  const name=text(p.name_fr)||"Produit";
  const description=(text(p.description_fr)||`Découvrez ${name} chez L’Envol des Enfants.`).slice(0,160);
  const image=text(p.image_url);
  return {title:`${name} | L’Envol des Enfants`,description,alternates:{canonical:`/produit/${id}`},openGraph:{title:name,description,images:image?[image]:[]}};
}
export default async function ProductPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const p=await getProduct(id); if(!p) notFound();
  const name=text(p.name_fr)||"Produit"; const description=text(p.description_fr); const image=text(p.image_url);
  const brand=text(p.brand); const article=text(p.article_number);
  const offers = (["qc", "conakry"] as const).flatMap((market) => {
    if (Number(p[`visible_${market}`]) !== 1) return [];
    const regular = Number(p[`price_${market}`] ?? 0);
    if (!Number.isFinite(regular) || regular <= 0) return [];
    const promo = Number(p[`promo_price_${market}`] ?? 0);
    const price = promo > 0 && promo < regular ? promo : regular;
    const stock = Number(p[`stock_${market}`] ?? 0);
    return [{
      "@type": "Offer",
      priceCurrency: market === "qc" ? "CAD" : "GNF",
      price: String(price),
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://envoldesenfants.com/produit/${encodeURIComponent(id)}`,
    }];
  });
  const displayedMarket = Number(p.visible_qc) === 1 ? "qc" : "conakry";
  const displayedPrice = Number(p[`price_${displayedMarket}`] ?? 0);
  const displayedStock = Number(p[`stock_${displayedMarket}`] ?? 0);
  const currency = displayedMarket === "qc" ? "CAD" : "GNF";
  const schema={"@context":"https://schema.org","@type":"Product",name,description:description||undefined,image:image||undefined,sku:article||undefined,brand:brand?{"@type":"Brand",name:brand}:undefined,...(offers.length ? {offers: offers.length === 1 ? offers[0] : offers} : {})};
  return <main className="seo-product wrap">
    <div className="seo-product-return"><BackToOrigin fallbackHref="/catalogue" label="Retour"/></div>
    <nav className="seo-product-nav"><a href="/">Accueil</a><span>›</span><a href="/catalogue">Catalogue</a><span>›</span><span>{name}</span></nav>
    <article className="seo-product-card">
      <div className="seo-product-image">{image?<img src={image} alt={name}/>:<div>Envol des Enfants</div>}</div>
      <div className="seo-product-copy">{brand&&<p className="eyebrow">{brand}</p>}<h1>{name}</h1>{article&&<p className="seo-product-sku">No {article}</p>}<p className="seo-product-price">{displayedPrice>0?`${displayedPrice.toLocaleString("fr-CA")} ${currency}`:"Prix à venir"}</p><p className="seo-product-stock">{displayedStock>0?"Disponible":"Rupture de stock"}</p>{description&&<p className="seo-product-description">{description}</p>}<a className="button button-dark" href="/catalogue">Voir dans le catalogue</a></div>
    </article>
    {offers.length>0&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>}
  </main>;
}
