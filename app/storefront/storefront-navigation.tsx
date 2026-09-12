"use client";

import type { Translation } from "@/lib/default-catalog";
import type { Market } from "@/lib/markets";
import { PhoneIcon, WhatsAppIcon } from "./product-icons";

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
  say,
  changeLanguage,
}: Props) {
  return (
    <header className="header wrap">
      <a className="brand" href={`/?region=${market}`} aria-label={say("Accueil — Envol des Enfants", "Home — Envol des Enfants")}>
        <span className="brand-picture" aria-hidden="true" />
      </a>
      <div className="header-actions">
        <div className="language-switch" role="group" aria-label={say("Choisir la langue", "Choose language")}>
          <button className={language === "fr" ? "selected" : ""} onClick={() => changeLanguage("fr")}>FR</button>
          <button className={language === "en" ? "selected" : ""} onClick={() => changeLanguage("en")}>EN</button>
        </div>
        {storePhone && <a className="contact-button call-button" href={`tel:${storePhone.replace(/\s/g, "")}`} aria-label={say("Appeler la boutique", "Call the store")}><PhoneIcon/><span>{say("Appeler", "Call")}</span></a>}
        <a className="contact-button whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppIcon/><span>WhatsApp</span></a>
      </div>
    </header>
  );
}
