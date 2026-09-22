"use client";

import type { Translation } from "@/lib/default-catalog";
import type { Market } from "@/lib/markets";
import { useCommerce } from "../commerce/commerce-provider";

type Language = "fr" | "en";
type Category = { label: Translation; value: string };
function HeaderIcon({ kind }: { kind: "account" | "heart" | "cart" | "search" | "truck" | "phone" }) {
  const paths = {
    account: "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8",
    cart: "M2 3h3l3 12h11l3-9H6M10 20h.01M18 20h.01",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    truck: "M1 4h13v13H1zM14 8h4l4 5v4h-8M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    phone: "M7 3H4c-1 0-1 2-1 3 0 8 7 15 15 15 1 0 3 0 3-1v-4l-5-2-2 2c-3-1-5-3-6-6l2-2-3-5z",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
type Props = {
  language: Language; market: Market; storePhone: string; whatsappUrl: string;
  availableCategories: Category[]; say: (fr:string,en:string)=>string;
  sectionVisible: (id:string)=>boolean; changeLanguage:(language:Language)=>void;
  chooseCategory:(category:string)=>void;
};

export default function StorefrontNavigation({ market, whatsappUrl, say }: Props) {
  const commerce = useCommerce();
  return <div className="ref-header">
    <div className="ref-top wrap"><span className="ref-canadian-business"><span aria-hidden="true" className="ref-maple-leaf">🍁</span> {say("Entreprise canadienne","Canadian business")}</span><b>{say("Des enfants heureux aujourd’hui, un meilleur demain !","Happy children today, a better tomorrow!")}</b>
      <div className="ref-commerce"><button type="button" onClick={()=>commerce.open("account")}><HeaderIcon kind="account"/><small>{say("Mon compte","Account")}</small></button><button type="button" onClick={()=>commerce.open("favorites")}><HeaderIcon kind="heart"/><small>{say("Mes favoris","Favorites")}</small></button><button type="button" onClick={()=>commerce.open("cart")}><HeaderIcon kind="cart"/><small>{say("Mon panier","Cart")}</small></button></div>
    </div>
    <header className="ref-head wrap">
      <a className="ref-logo" href={`/?region=${market}`}><img src="/envol-logo-officiel.svg" alt="Envol des Enfants"/></a>
      <a className="ref-search" href="#catalogue"><span>{say("Que cherchez-vous aujourd’hui ?","What are you looking for today?")}</span><b><HeaderIcon kind="search"/></b></a>
      <div className="ref-service"><span><HeaderIcon kind="truck"/><b>{say("Livraison rapide","Fast delivery")}</b><small>{say("au Canada et ailleurs","across Canada and beyond")}</small></span><a href={whatsappUrl}><HeaderIcon kind="phone"/><b>{say("Contact WhatsApp","Contact WhatsApp")}</b><small>{say("Une question ?","A question?")}</small></a></div>
    </header>
  </div>;
}
