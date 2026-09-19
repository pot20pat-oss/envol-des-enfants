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
        <a href="/bebe-enfants">{say("Éveil", "Early years")}</a>
        <a href="/jouets">{say("Jouets éducatifs", "Educational toys")}</a>
        <a href="/catalogue?category=montessori">{say("Montessori", "Montessori")}</a>
        <a href="/jouets">{say("Jeux & Jouets", "Games & Toys")}</a>
        <a href="/poupees">{say("Mon Monde de Poupée", "My Doll World")}</a>
        <a href="/catalogue?category=vetements">{say("Vêtements", "Clothing")}</a>
        <a href="/catalogue?category=chaussures">{say("Chaussures", "Shoes")}</a>
        <a href="/catalogue?category=vehicules">{say("Voitures électriques", "Electric vehicles")}</a>
        <a href="/articles-scolaires">{say("Scolaire", "School")}</a>
        <a href="#promotions">{say("Soldes", "Sales")}</a>
      </nav>
    </div>
  );
}
