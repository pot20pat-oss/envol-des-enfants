import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cmsEnv } from "@/lib/cms";

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
  const brand=text(p.brand); const article=text(p.article_number); const price=Number(p.price_qc||p.price||0); const stock=Number(p.stock_qc||0);
  const schema={"@context":"https://schema.org","@type":"Product",name,description:description||undefined,image:image||undefined,sku:article||undefined,brand:brand?{"@type":"Brand",name:brand}:undefined,offers:price>0?{"@type":"Offer",priceCurrency:"CAD",price:String(price),availability:stock>0?"https://schema.org/InStock":"https://schema.org/OutOfStock",url:`https://envoldesenfants.com/produit/${id}`}:undefined};
  return <main className="seo-product wrap">
    <nav className="seo-product-nav"><a href="/">Accueil</a><span>›</span><a href="/catalogue">Catalogue</a><span>›</span><span>{name}</span></nav>
    <article className="seo-product-card">
      <div className="seo-product-image">{image?<img src={image} alt={name}/>:<div>Envol des Enfants</div>}</div>
      <div className="seo-product-copy">{brand&&<p className="eyebrow">{brand}</p>}<h1>{name}</h1>{article&&<p className="seo-product-sku">No {article}</p>}<p className="seo-product-price">{price>0?`${price.toLocaleString("fr-CA")} $`:"Prix en boutique"}</p><p className="seo-product-stock">{stock>0?"Disponible":"Rupture de stock"}</p>{description&&<p className="seo-product-description">{description}</p>}<a className="button button-dark" href="/catalogue">Voir dans le catalogue</a></div>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
  </main>;
}
