"use client";

import type { Translation } from "@/lib/default-catalog";
import type { Market } from "@/lib/markets";
import { useCommerce } from "../commerce/commerce-provider";

type Language = "fr" | "en";
type Category = { label: Translation; value: string };
type Props = {
  language: Language; market: Market; storePhone: string; whatsappUrl: string;
  availableCategories: Category[]; say: (fr:string,en:string)=>string;
  sectionVisible: (id:string)=>boolean; changeLanguage:(language:Language)=>void;
  chooseCategory:(category:string)=>void;
};

export default function StorefrontNavigation({ market, whatsappUrl, availableCategories, say, chooseCategory }: Props) {
  const commerce = useCommerce();
  const nav = availableCategories.filter(x => ["eveil","poupees","vetements","chaussures","scolaire","vehicules"].includes(x.value));
  return <div className="ref-header">
    <div className="ref-top wrap"><span>🇨🇦 {say("Entreprise canadienne","Canadian business")}</span><b>{say("Des enfants heureux aujourd’hui, un meilleur demain !","Happy children today, a better tomorrow!")}</b></div>
    <header className="ref-head wrap">
      <a className="ref-logo" href={`/?region=${market}`}><img src="/envol-logo-officiel.svg" alt="Envol des Enfants"/></a>
      <a className="ref-search" href="#catalogue"><span>{say("Que cherchez-vous aujourd’hui ?","What are you looking for today?")}</span><b>⌕</b></a>
      <div className="ref-service"><span>🚚 <b>{say("Livraison rapide","Fast delivery")}</b><small>{say("au Canada et ailleurs","across Canada and beyond")}</small></span><a href={whatsappUrl}>● <b>WhatsApp</b><small>{say("Une question ?","A question?")}</small></a></div>
      <div className="ref-commerce"><button onClick={()=>commerce.open("account")}>♙<small>{say("Mon compte","Account")}</small></button><button onClick={()=>commerce.open("favorites")}>♡<small>{say("Mes favoris","Favorites")}</small></button><button onClick={()=>commerce.open("cart")}>🛒<small>{say("Mon panier","Cart")}</small></button></div>
    </header>
    <nav className="ref-nav"><div className="wrap"><a href={`/?region=${market}`}>⌂ {say("Accueil","Home")}</a>{nav.map(x=><a key={x.value} href="#catalogue" onClick={()=>chooseCategory(x.value)}>{say(x.label.fr,x.label.en)}</a>)}<a href={`/jouets?region=${market}`}>{say("Jeux & Jouets","Games & Toys")}</a><a className="sale" href={`/promotions?region=${market}`}>{say("Soldes","Sale")}</a></div></nav>
  </div>;
}
