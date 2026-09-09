"use client";

import { useEffect, useMemo, useState } from "react";
import type { Translation } from "@/lib/default-catalog";
import type { Market } from "@/lib/markets";
import { markets } from "@/lib/markets";
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

type MenuItem = {
  value: string;
  label: (say: Props["say"]) => string;
  className?: string;
  route?: string;
};

const toyItems: MenuItem[] = [
  { value: "eveil", label: (say) => say("Jouets éducatifs", "Educational toys") },
  { value: "poupees", label: (say) => say("Mon monde de poupées et princesses", "My world of dolls and princesses"), className: "nav-dolls-link", route: "/poupees" },
  { value: "disney", label: () => "↳ Disney", className: "nav-princesses-link" },
  { value: "barbie", label: () => "↳ Barbie", className: "nav-princesses-link" },
  { value: "piscine", label: (say) => say("Piscine & jeux d’eau", "Pool & water play") },
  { value: "imitation", label: (say) => say("Métiers & imitation", "Pretend play") },
  { value: "dinosaures", label: (say) => say("Dinosaures & aventures", "Dinosaurs & adventures") },
  { value: "animaux", label: (say) => say("Animaux & compagnons", "Animals & companions") },
  { value: "vehicules", label: (say) => say("Véhicules", "Vehicles") },
];

const kidsItems: MenuItem[] = [
  { value: "bebe", label: (say) => say("Bébé", "Baby") },
  { value: "vetements", label: (say) => say("Vêtements", "Clothing") },
  { value: "chaussures", label: (say) => say("Chaussures", "Shoes") },
];

export default function StorefrontNavigation({
  language,
  market,
  storePhone,
  whatsappUrl,
  availableCategories,
  say,
  sectionVisible,
  changeLanguage,
  chooseCategory,
}: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const availableValues = useMemo(
    () => new Set(availableCategories.map((category) => category.value)),
    [availableCategories],
  );

  const visibleToyItems = toyItems.filter((item) => availableValues.has(item.value));
  const visibleKidsItems = kidsItems.filter((item) => availableValues.has(item.value));
  const hasDolls = availableValues.has("poupees");

  useEffect(() => {
    if (!openMenu) return;
    const closeMenu = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".nav-dropdown")) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  function selectCategory(category: string) {
    chooseCategory(category);
    setOpenMenu(null);
  }

  function goTo(route: string) {
    window.location.assign(route);
  }

  function renderMenuItems(items: MenuItem[]) {
    return items.map((item) => item.route ? (
      <a href={item.route} key={item.value} className={item.className}>{item.label(say)}</a>
    ) : (
      <a href="#catalogue" key={item.value} className={item.className} onClick={() => selectCategory(item.value)}>
        {item.label(say)}
      </a>
    ));
  }

  return (
    <>
      <header className="header wrap">
        <a className="brand" href="/" aria-label="Envol des Enfants, accueil">
          <span className="brand-picture"><img src="/envol-reference.png" alt="Logo officiel Envol des Enfants" /></span>
        </a>
        <p className="header-location">{markets[market].label} <span>•</span> {say("Des jouets qui font grandir", "Toys that help little ones grow")}</p>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label={say("Choisir la langue", "Choose language")}>
            <button className={language === "fr" ? "selected" : ""} onClick={() => changeLanguage("fr")}>FR</button>
            <button className={language === "en" ? "selected" : ""} onClick={() => changeLanguage("en")}>EN</button>
          </div>
          {storePhone && <a className="contact-button call-button" href={`tel:${storePhone.replace(/\s/g, "")}`} aria-label={say("Appeler la boutique", "Call the store")}><PhoneIcon/><span>{say("Appeler", "Call")}</span></a>}
          <a className="contact-button whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppIcon/><span>WhatsApp</span></a>
        </div>
      </header>

      <nav className="shop-nav" aria-label={say("Navigation principale", "Main navigation")}><div className="wrap">
        {sectionVisible("nouveautes") && <a href="/">{say("Nouveautés", "New arrivals")}</a>}

        {sectionVisible("catalogue") && availableCategories.length > 0 && <div className={`nav-dropdown${openMenu === "catalogue" ? " is-open" : ""}`}>
          <button type="button" aria-expanded={openMenu === "catalogue"} onClick={() => setOpenMenu(openMenu === "catalogue" ? null : "catalogue")}>{say("Catalogue", "Shop")} <span aria-hidden="true">⌄</span></button>
          {openMenu === "catalogue" && <div className="nav-dropdown-panel">{availableCategories.map((category) => <a href="#catalogue" key={category.value} onClick={() => selectCategory(category.value)}>{category.label[language]}</a>)}</div>}
        </div>}

        {sectionVisible("catalogue") && visibleToyItems.length > 0 && <div className={`nav-dropdown${openMenu === "jouets" ? " is-open" : ""}`}>
          <button type="button" aria-expanded={openMenu === "jouets"} onClick={() => setOpenMenu(openMenu === "jouets" ? null : "jouets")}>{say("Jouets", "Toys")} <span aria-hidden="true">⌄</span></button>
          {openMenu === "jouets" && <div className="nav-dropdown-panel">{renderMenuItems(visibleToyItems)}</div>}
        </div>}

        {sectionVisible("catalogue") && hasDolls && <a className="nav-dolls-tab" href="/poupees">{say("Mon monde de poupées et princesses", "My world of dolls and princesses")}</a>}

        {sectionVisible("catalogue") && visibleKidsItems.length > 0 && <div className={`nav-dropdown${openMenu === "enfants" ? " is-open" : ""}`}>
          <button type="button" aria-expanded={openMenu === "enfants"} onClick={() => setOpenMenu(openMenu === "enfants" ? null : "enfants")}>{say("Bébé & enfants", "Baby & kids")} <span aria-hidden="true">⌄</span></button>
          {openMenu === "enfants" && <div className="nav-dropdown-panel">{renderMenuItems(visibleKidsItems)}</div>}
        </div>}

        {sectionVisible("rentree") && <a className="nav-school-tab" href="/articles-scolaires" onClick={(event) => { event.preventDefault(); event.stopPropagation(); goTo("/articles-scolaires"); }} style={{ position: "relative", zIndex: 30, pointerEvents: "auto" }}>{say("Articles scolaires", "School supplies")}</a>}
        {sectionVisible("promotions") && <a className="nav-promotions-tab" href="/promotions" onClick={(event) => { event.preventDefault(); event.stopPropagation(); goTo("/promotions"); }} style={{ position: "relative", zIndex: 40, pointerEvents: "auto" }}>{say("Promotions", "Offers")}</a>}
        {sectionVisible("contact") && <a className="nav-find-tab" href="/nous-trouver">{say("Nous trouver", "Find us")}</a>}
      </div></nav>
    </>
  );
}
