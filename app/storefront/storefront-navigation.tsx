"use client";

import type { Translation } from "@/lib/default-catalog";
import type { Market } from "@/lib/markets";
import { PhoneIcon, WhatsAppIcon } from "./product-icons";
import { useCommerce } from "../commerce/commerce-provider";

type Language = "fr" | "en";
type Category = { label: Translation; value: string };

type Props = {
  language: Language;
  market: Market;
  storePhone: string;
  whatsappUrl: string;
  availableCategories: Category[];
  say: (french: string, english: string) => string;
  sectionVisible: (id: string) => boolean;
  changeLanguage: (language: Language) => void;
  chooseCategory: (category: string) => void;
};

export default function StorefrontNavigation({
  language,
  market,
  storePhone,
  whatsappUrl,
  availableCategories,
  say,
  changeLanguage,
  chooseCategory,
}: Props) {
  const commerce = useCommerce();
  return (
    <div className="storefront-header-shell">
      <div className="store-trust-bar">
        <span>🇨🇦 {say("Entreprise canadienne", "Canadian business")}</span>
        <strong>{say("Des enfants heureux aujourd’hui, un meilleur demain!", "Happy children today, a brighter tomorrow!")}</strong>
        <span>{say("Livraison rapide", "Fast delivery")}</span>
      </div>

      <header className="header wrap">
        <a className="brand" href={`/?region=${market}`} aria-label={say("Accueil — Envol des Enfants", "Home — Envol des Enfants")}>
          <img className="brand-logo-official" src="/envol-logo-officiel.svg" alt="Envol des Enfants" />
        </a>

        <a className="store-search-box" href="#catalogue">
          <span>{say("Que cherchez-vous aujourd’hui?", "What are you looking for today?")}</span><b>⌕</b>
        </a>

        <div className="header-actions">
          <div className="commerce-actions">
            <button className="commerce-action" onClick={() => commerce.open("account")}>♙ <span>{say("Mon compte", "My account")}</span></button>
            <button className="commerce-action" onClick={() => commerce.open("favorites")}>♡ <span>{say("Mes favoris", "Favorites")}</span>{commerce.favorites.length > 0 && <b>{commerce.favorites.length}</b>}</button>
            <button className="commerce-action" onClick={() => commerce.open("cart")}>🛒 <span>{say("Mon panier", "My cart")}</span>{commerce.cartCount > 0 && <b>{commerce.cartCount}</b>}</button>
          </div>
        </div>

        <div className="header-service-links">
          <span className="store-fast-delivery">🚚 <span><strong>{say("Livraison rapide", "Fast delivery")}</strong><small>{say("au Canada et ailleurs", "across Canada and beyond")}</small></span></span>
          <a className="store-whatsapp-link" href={whatsappUrl} target="_blank" rel="noreferrer">● <span><strong>{say("Contact WhatsApp", "WhatsApp contact")}</strong><small>{say("Une question?", "A question?")}</small></span></a>
        </div>
      </header>

      <nav className="store-category-nav">
        <a href={`/?region=${market}`}>⌂ {say("Accueil", "Home")}</a>
        {availableCategories.filter((category)=>category.value!=="all"&&!['vetements','chaussures'].includes(category.value)).slice(0,9).map((category)=>
          <a href="#catalogue" key={category.value} onClick={()=>chooseCategory(category.value)}>{category.label[language].replace("↳ ","")}</a>
        )}
        <a href="#promotions">{say("Soldes", "Sales")}</a>
      </nav>
    </div>
  );
}
