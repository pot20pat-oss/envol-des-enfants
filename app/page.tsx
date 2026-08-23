"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { defaultProducts, type Product, type Translation } from "@/lib/default-catalog";
import { readSiteSections, readSiteTexts } from "@/lib/site-editor";

const mapsUrl = "https://www.google.com/maps/search/?api=1&query=Immeuble%20Famille%20Diallo%20Cameroun%20Dixinn%20Conakry";

type Language = "fr" | "en";

const categories: { label: Translation; value: string }[] = [
  { label: { fr: "Tout voir", en: "View all" }, value: "all" },
  { label: { fr: "Jouets éducatifs", en: "Educational toys" }, value: "eveil" },
  { label: { fr: "Mon monde de poupées", en: "My world of dolls" }, value: "poupees" },
  { label: { fr: "Bébé", en: "Baby" }, value: "bebe" },
  { label: { fr: "Vêtements", en: "Clothing" }, value: "vetements" },
  { label: { fr: "Chaussures", en: "Shoes" }, value: "chaussures" },
  { label: { fr: "Fournitures scolaires", en: "School supplies" }, value: "scolaire" },
  { label: { fr: "Sacs & gourdes", en: "Bags & bottles" }, value: "sacs" },
  { label: { fr: "Véhicules", en: "Vehicles" }, value: "vehicules" },
];

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.18 2 19.78 19.78 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.71 2.8a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.58 2.8.71A2 2 0 0 1 22 16.9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.4 11.7a8.4 8.4 0 0 1-12.2 7.5L3 20.6l1.5-5a8.4 8.4 0 1 1 15.9-3.9Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 8.1c-.3-.7-.6-.7-.9-.7H7.4c-.2 0-.6.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3.1 5 4.2 2.4.9 2.9.7 3.5.6.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4-.1-.1-.3-.2-.7-.4l-2-1c-.3-.1-.5-.2-.7.2l-.9 1.1c-.2.2-.3.2-.7.1a6.7 6.7 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.6c-.1-.3 0-.4.2-.6l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6L9 8.1Z" fill="currentColor"/></svg>;
}

export default function Home() {
  const [active, setActive] = useState("all");
  const [promoOpen, setPromoOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);
  const [language, setLanguage] = useState<Language>("fr");
  const [now, setNow] = useState<Date | null>(null);
  const [visitorZone, setVisitorZone] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [managedProducts, setManagedProducts] = useState<Product[] | null>(null);
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const storeProducts = managedProducts === null ? defaultProducts : managedProducts;
  const siteSections = readSiteSections(storeSettings.site_sections);
  const siteTexts = readSiteTexts(storeSettings.site_texts);
  const storePhone = storeSettings.phone || "+224 666 54 79 76";
  const whatsappNumber = (storeSettings.whatsapp || "224666547976").replace(/[^\d]/g, "");
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  const facebookUrl = storeSettings.facebook || "https://www.facebook.com/rachetteboutique/";
  const address = storeSettings.address || "Immeuble Famille Diallo, Cameroun, Dixinn, Conakry, Guinée";
  const isEnglish = language === "en";
  const say = (french: string, english: string) => isEnglish ? english : french;
  const editable = (key: string, french: string, english: string) => siteTexts[`${key}_${language}`]?.trim() || say(french, english);
  const sectionStyle = (id: string): CSSProperties => {
    const index = siteSections.findIndex((section) => section.id === id);
    const section = siteSections[index];
    return { order: index < 0 ? 500 : index + 10, ...(section && !section.visible ? { display: "none" } : {}) };
  };
  const matchingProducts = storeProducts.filter((item) => (active === "all" || item.category === active) && (status === "all" || item.status === status) && (!query.trim() || `${item.name.fr} ${item.name.en} ${item.detail.fr} ${item.detail.en}`.toLowerCase().includes(query.trim().toLowerCase())));
  const visibleProducts = showAll || active !== "all" || status !== "all" || query.trim() ? matchingProducts : matchingProducts.slice(0, 12);
  const featuredCollections = [
    { id: "nouveautes", eyebrow: say("Tout juste arrivés en boutique", "Freshly arrived in store"), title: say("Les nouveautés", "Our newest arrivals"), detail: say("Des découvertes à ne pas laisser filer.", "Little discoveries worth catching."), items: storeProducts.filter((item) => item.badge === "new").slice(0, 4) },
    { id: "rentree-scolaire", eyebrow: say("Les essentiels des petits écoliers", "Everything little learners need"), title: say("Une rentrée bien préparée", "Ready for school days"), detail: say("Cartables, fournitures et jolies trouvailles.", "Backpacks, supplies and thoughtful finds."), items: storeProducts.filter((item) => item.badge === "school").slice(0, 4) },
  ];

  useEffect(() => {
    fetch("/api/catalog").then((response) => response.json()).then((payload: { products?: Record<string, unknown>[]; settings?: Record<string, string> }) => {
      const savedSettings = payload.settings || {};
      setStoreSettings(savedSettings);
      if (!payload.products?.length && savedSettings.catalog_initialized !== "true") return;
      setManagedProducts((payload.products || []).map((item) => ({
        id: String(item.id), name: { fr: String(item.name_fr || ""), en: String(item.name_en || item.name_fr || "") },
        category: String(item.category), price: Number(item.price || 0), ages: String(item.ages || "3+"),
        sheet: String(item.image_sheet || "17"), position: Number(item.image_position || 0), imageUrl: item.image_url ? String(item.image_url) : undefined,
        stock: Number(item.stock || 0), status: String(item.status || "available") as Product["status"], badge: item.badge ? String(item.badge) as Product["badge"] : undefined,
        detail: { fr: String(item.description_fr || ""), en: String(item.description_en || item.description_fr || "") },
      })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("envol-language");
    const initialLanguage: Language = saved === "fr" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
    setLanguage(initialLanguage);
    setVisitorZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".editable-storefront");
    if (!root) return;
    const selectors: Record<string, string> = {
      hero: ".hero", ribbon: ".service-ribbon", catalogue: "#catalogue", nouveautes: "#nouveautes",
      rentree: "#rentree-scolaire", promise: ".promise", promotions: "#promotions", services: "#services",
      story: "#notre-histoire", brands: ".brands-section", delivery: "#livraison", testimonials: ".testimonials-section",
      faq: "#faq", contact: "#contact", cta: ".cta",
    };
    readSiteSections(storeSettings.site_sections).forEach((section, index) => {
      const element = root.querySelector<HTMLElement>(selectors[section.id]);
      if (!element) return;
      element.style.order = String(index + 10);
      if (section.visible) element.style.removeProperty("display");
      else element.style.display = "none";
    });

    const texts = readSiteTexts(storeSettings.site_texts);
    const replaceText = (key: string, selector: string, firstOnly = false) => {
      const value = texts[`${key}_${language}`]?.trim();
      const element = root.querySelector<HTMLElement>(selector);
      if (!value || !element) return;
      if (firstOnly && element.firstChild) element.firstChild.textContent = value;
      else element.textContent = value;
    };
    replaceText("story_title", ".story-copy h2", true);
    replaceText("story_description", ".story-copy > p:not(.eyebrow)");
    replaceText("services_title", "#services .center-heading h2", true);
    replaceText("services_description", "#services .center-heading > p:not(.eyebrow)");
    replaceText("delivery_description", "#livraison .section-heading > p");
    replaceText("contact_title", "#contact .contact-copy h2", true);
    replaceText("welcome_eyebrow", ".cta .eyebrow");

    const phone = storeSettings.phone?.trim();
    if (phone) {
      root.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]').forEach((anchor) => anchor.href = `tel:${phone.replace(/\s/g, "")}`);
      const contactPhone = root.querySelector<HTMLElement>(".contact-phone");
      if (contactPhone) contactPhone.textContent = phone;
    }
    if (storeSettings.opening_hours?.trim()) {
      const hours = root.querySelector<HTMLElement>(".contact-hour > span");
      if (hours) hours.textContent = storeSettings.opening_hours;
    }
    if (storeSettings.delivery_conditions?.trim() && !texts[`delivery_description_${language}`]?.trim()) {
      const delivery = root.querySelector<HTMLElement>("#livraison .section-heading > p");
      if (delivery) delivery.textContent = storeSettings.delivery_conditions;
    }
    const discount = Number(storeSettings.welcome_discount || 10);
    if (Number.isFinite(discount) && discount > 0 && discount <= 100) {
      const announcement = root.querySelector<HTMLElement>(".announcement strong");
      if (announcement) announcement.textContent = language === "fr" ? `${discount} % de rabais` : `${discount}% off`;
      const modalDiscount = root.querySelector<HTMLElement>(".promo-modal h2 > span");
      if (modalDiscount) modalDiscount.textContent = `${discount} %`;
    }
  }, [storeSettings.site_sections, storeSettings.site_texts, storeSettings.phone, storeSettings.opening_hours, storeSettings.delivery_conditions, storeSettings.welcome_discount, language, promoOpen]);

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

  useEffect(() => {
    if (window.sessionStorage.getItem("envol-promo-dismissed") === "yes") return;
    const timer = window.setTimeout(() => setPromoOpen(true), 1250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!promoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePromo();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [promoOpen]);

  function closePromo() {
    setPromoOpen(false);
    window.sessionStorage.setItem("envol-promo-dismissed", "yes");
  }

  async function requestDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return;
    await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, language, consent: true }) }).catch(() => {});
    const message = isEnglish ? `Hello Envol des Enfants! I would like to subscribe with ${email} and receive the 10% welcome discount on my first order.` : `Bonjour Envol des Enfants! Je souhaite m’abonner avec ${email} et profiter de l’offre de bienvenue de 10 % sur ma première commande.`;
    window.open(`${whatsappUrl}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setRequested(true);
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("envol-language", nextLanguage);
  }

  function chooseCategory(category: string) {
    setActive(category);
    setStatus("all");
    setQuery("");
    setOpenMenu(null);
  }

  function formatClock(timeZone: string) {
    if (!now) return "--:--";
    return new Intl.DateTimeFormat(isEnglish ? "en-CA" : "fr-CA", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  }

  const visitorRegion = visitorZone.startsWith("Africa/") ? say("Vous consultez depuis l’Afrique", "You are browsing from Africa") : visitorZone.startsWith("America/") ? say("Vous consultez depuis l’Amérique", "You are browsing from the Americas") : say("Votre heure locale", "Your local time");

  return (
    <main className="editable-storefront">
      <div className="announcement"><span>{say("Nouveaux abonnés :", "New subscribers:")} <strong>{say("10 % de rabais", "10% off")}</strong> {say("sur votre première commande.", "your first order.")}</span><button onClick={() => setPromoOpen(true)}>{say("J’en profite", "Get the offer")} →</button></div>

      <header className="header wrap">
        <a className="brand" href="#accueil" aria-label="Envol des Enfants, accueil">
          <span className="brand-picture"><img src="/envol-reference.png" alt="Logo officiel Envol des Enfants" /></span>
        </a>
        <p className="header-location">Dixinn, Conakry <span>•</span> {say("Des jouets qui font grandir", "Toys that help little ones grow")}</p>
        <div className="header-actions"><div className="language-switch" role="group" aria-label={say("Choisir la langue", "Choose language")}><button className={language === "fr" ? "selected" : ""} onClick={() => changeLanguage("fr")}>FR</button><button className={language === "en" ? "selected" : ""} onClick={() => changeLanguage("en")}>EN</button></div><a className="contact-button call-button" href="tel:+224666547976" aria-label={say("Appeler la boutique", "Call the store")}><PhoneIcon/><span>{say("Appeler", "Call")}</span></a><a className="contact-button whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppIcon/><span>WhatsApp</span></a></div>
      </header>

      <nav className="shop-nav" aria-label={say("Navigation principale", "Main navigation")}>
        <div className="wrap">
          <a href="#nouveautes">{say("Nouveautés", "New arrivals")}</a>
          <div className={`nav-dropdown${openMenu === "catalogue" ? " is-open" : ""}`}>
            <button type="button" aria-expanded={openMenu === "catalogue"} onClick={() => setOpenMenu(openMenu === "catalogue" ? null : "catalogue")}>{say("Catalogue", "Shop")} <span aria-hidden="true">⌄</span></button>
            {openMenu === "catalogue" && <div className="nav-dropdown-panel">{categories.map((category) => <a href="#catalogue" key={category.value} onClick={() => chooseCategory(category.value)}>{category.label[language]}</a>)}</div>}
          </div>
          <div className={`nav-dropdown${openMenu === "jouets" ? " is-open" : ""}`}>
            <button type="button" aria-expanded={openMenu === "jouets"} onClick={() => setOpenMenu(openMenu === "jouets" ? null : "jouets")}>{say("Jouets", "Toys")} <span aria-hidden="true">⌄</span></button>
            {openMenu === "jouets" && <div className="nav-dropdown-panel"><a href="#catalogue" onClick={() => chooseCategory("eveil")}>{say("Jouets éducatifs", "Educational toys")}</a><a href="#catalogue" className="nav-dolls-link" onClick={() => chooseCategory("poupees")}>{say("Mon monde de poupées", "My world of dolls")}</a><a href="#catalogue" onClick={() => chooseCategory("vehicules")}>{say("Véhicules", "Vehicles")}</a></div>}
          </div>
          <a className="nav-dolls-tab" href="#catalogue" onClick={() => chooseCategory("poupees")}>{say("Mon monde de poupées", "My world of dolls")}</a>
          <div className={`nav-dropdown${openMenu === "enfants" ? " is-open" : ""}`}>
            <button type="button" aria-expanded={openMenu === "enfants"} onClick={() => setOpenMenu(openMenu === "enfants" ? null : "enfants")}>{say("Bébé & enfants", "Baby & kids")} <span aria-hidden="true">⌄</span></button>
            {openMenu === "enfants" && <div className="nav-dropdown-panel"><a href="#catalogue" onClick={() => chooseCategory("bebe")}>{say("Bébé", "Baby")}</a><a href="#catalogue" onClick={() => chooseCategory("vetements")}>{say("Vêtements", "Clothing")}</a><a href="#catalogue" onClick={() => chooseCategory("chaussures")}>{say("Chaussures", "Shoes")}</a></div>}
          </div>
          <div className={`nav-dropdown${openMenu === "rentree" ? " is-open" : ""}`}>
            <button type="button" aria-expanded={openMenu === "rentree"} onClick={() => setOpenMenu(openMenu === "rentree" ? null : "rentree")}>{say("Rentrée", "School")} <span aria-hidden="true">⌄</span></button>
            {openMenu === "rentree" && <div className="nav-dropdown-panel"><a href="#rentree-scolaire" onClick={() => setOpenMenu(null)}>{say("Sélection rentrée scolaire", "Back-to-school selection")}</a><a href="#catalogue" onClick={() => chooseCategory("scolaire")}>{say("Fournitures scolaires", "School supplies")}</a><a href="#catalogue" onClick={() => chooseCategory("sacs")}>{say("Sacs & gourdes", "Bags & bottles")}</a></div>}
          </div>
          <a href="#promotions">{say("Promotions", "Offers")}</a>
          <a href="#contact">{say("Nous trouver", "Find us")}</a>
        </div>
      </nav>

      <section className="timezone-strip" aria-label={say("Heures locales", "Local times")}><div className="wrap"><div className="timezone-place"><span className="timezone-dot quebec-dot"></span><span>Québec</span><strong>{formatClock("America/Toronto")}</strong></div><span className="timezone-divider"></span><div className="timezone-place"><span className="timezone-dot conakry-dot"></span><span>Conakry</span><strong>{formatClock("Africa/Conakry")}</strong></div><p className="timezone-context">{visitorRegion}{visitorZone ? ` · ${formatClock(visitorZone)}` : ""}</p></div></section>

      <section className="hero wrap" id="accueil" style={sectionStyle("hero")}>
        <div className="hero-copy">
          <p className="eyebrow"><span></span> {editable("hero_eyebrow", "Boutique de jouets éducatifs · Conakry", "Educational toy shop · Conakry")}</p>
          <h1>{editable("hero_title", "Le jeu qui fait", "Play that helps")}<br /><span>{editable("hero_accent", "grandir vos enfants.", "your children grow.")}</span></h1>
          <p className="hero-text">{editable("hero_description", "Jouets, articles pour bébé, vélos et fournitures scolaires choisis pour éveiller leur curiosité.", "Toys, baby essentials, bicycles and school supplies chosen to spark their curiosity.")}</p>
          <div className="hero-buttons"><a className="button hero-call" href={`tel:${storePhone.replace(/\s/g, "")}`}><PhoneIcon/>{say("Nous appeler", "Call us")}</a><a className="button button-dark hero-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppIcon/>{say("Commander sur WhatsApp", "Order on WhatsApp")}</a></div>
          <p className="tiny-note">{say("Livraison et paiement à la réception.", "Delivery available. Pay upon arrival.")}</p>
        </div>

        <div className="hero-visual">
          <img src="/boutique-hero.png" alt="Vue panoramique de la boutique Envol des Enfants avec ses vélos, véhicules et rayons de jouets" />
          <div className="floating-note"><span>★</span><div><strong>{say("Bienvenue à Dixinn", "Welcome to Dixinn")}</strong><small>{say("Un univers fait pour jouer.", "A world made for play.")}</small></div></div>
        </div>
      </section>

      <div className="service-ribbon wrap" style={sectionStyle("ribbon")}><span>{say("Jouets éducatifs", "Educational toys")}</span><span>{say("Livraison chez vous", "Delivered to you")}</span><span>{say("Paiement à la réception", "Pay on delivery")}</span><a href={facebookUrl} target="_blank" rel="noreferrer">{say("Suivez-nous sur Facebook", "Follow us on Facebook")} ↗</a></div>

      <section className="univers section wrap" id="catalogue" style={sectionStyle("catalogue")}>
        <div className="section-heading"><div><p className="eyebrow">{say("Nos trouvailles en boutique", "Discover our favourite finds")}</p><h2>{editable("catalogue_title", "Le catalogue", "A little shop")}<br /><span>{editable("catalogue_accent", "des petits bonheurs.", "full of joy.")}</span></h2></div><p>{editable("catalogue_description", "Jouets éducatifs, vêtements, fournitures et idées-cadeaux : choisissez, puis commandez simplement sur WhatsApp.", "Educational toys, clothing, school essentials and thoughtful gifts. Pick your favourites and order through WhatsApp.")}</p></div>
        <div className="catalog-search"><label className="search-box"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={say("Rechercher un jouet, un cartable, une poupée…", "Search for a toy, a backpack, a doll…")} /></label><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={say("Filtrer par disponibilité", "Filter by availability")}><option value="all">{say("Tous les statuts", "All availability")}</option><option value="available">{say("Disponible", "Available")}</option><option value="reserved">{say("Réservé", "Reserved")}</option><option value="sold">{say("Vendu", "Sold out")}</option></select></div>
        <div className="category-tabs" role="group" aria-label={say("Filtrer les univers", "Filter collections")}>
          {categories.map((category) => <button key={category.value} className={active === category.value ? "active" : ""} onClick={() => setActive(category.value)}>{category.label[language]}</button>)}
        </div>
        <div className="catalog-summary"><span>{matchingProducts.length} {say("trouvailles", "little finds")}</span><span>{say("Prix en francs guinéens", "Prices in Guinean francs")}</span></div>
        <div className="product-grid" id="coups-de-coeur">
          {visibleProducts.map((item) => <article className={`product-card ${item.status === "sold" ? "product-sold" : ""}`} key={item.id || `${item.sheet}-${item.position}`}><div className="product-visual" style={{backgroundImage:`url(${item.imageUrl || `/catalog-${item.sheet}.png`})`,backgroundPosition:item.imageUrl ? "center" : `${[0,34,67,100][item.position]}% ${item.sheet === "17" ? "49%" : "15%"}`}} role="img" aria-label={item.name[language]}><span className={`availability availability-${item.status}`}>{item.status === "available" ? say("Disponible","Available") : item.status === "reserved" ? say("Réservé","Reserved") : say("Vendu","Sold")}</span></div><div className="product-details">{item.badge && <span className={`product-badge ${item.badge}`}>{item.badge === "new" ? say("Nouveauté","New arrival") : say("Rentrée","School days")}</span>}<h3>{item.name[language]}</h3><p className="product-price">{new Intl.NumberFormat(language === "fr" ? "fr-GN" : "en-GN").format(item.price)} <span>GNF</span></p><p className="product-description">{item.detail[language]}</p><span className="age-pill">{item.ages.includes("mois") ? item.ages.replace("mois", say("mois", "months")) : `${item.ages} ${say("ans", "yrs")}`}</span>{item.status === "sold" ? <span className="product-unavailable">{say("Indisponible", "Unavailable")}</span> : <a className={`product-order${item.status === "reserved" ? " product-order-reserved" : ""}`} href={`${whatsappUrl}?text=${encodeURIComponent(isEnglish ? `Hello, I would like ${item.status === "reserved" ? "to know when this product is back" : "to order"}: ${item.name.en} (${item.price.toLocaleString("en-GN")} GNF).` : `Bonjour, je souhaite ${item.status === "reserved" ? "être averti du retour de" : "commander"} : ${item.name.fr} (${item.price.toLocaleString("fr-GN")} GNF).`)}`} target="_blank" rel="noreferrer"><WhatsAppIcon/><span>{item.status === "reserved" ? say("Me prévenir", "Notify me") : "WhatsApp"}</span></a>}</div></article>)}
        </div>
        {matchingProducts.length === 0 && <p className="catalog-empty">{say("Aucune trouvaille ne correspond à votre recherche.", "No products matched your search.")}</p>}
        {!showAll && active === "all" && status === "all" && !query.trim() && matchingProducts.length > visibleProducts.length && <button className="show-more" onClick={() => setShowAll(true)}>{say("Découvrir tout le catalogue", "Discover the whole collection")} <span>({matchingProducts.length}) →</span></button>}
      </section>

      {featuredCollections.map((collection) => <section className="featured-collection section wrap" id={collection.id} key={collection.id}><div className="section-heading"><div><p className="eyebrow">{collection.eyebrow}</p><h2>{collection.title}<span>.</span></h2></div><p>{collection.detail}</p></div><div className="featured-grid">{collection.items.map((item) => <a className="featured-card" href="#catalogue" key={item.id || `${collection.id}-${item.sheet}-${item.position}`} onClick={() => {setActive("all");setStatus("all");setQuery(item.name[language]);}}><div className="featured-visual" style={{backgroundImage:`url(${item.imageUrl || `/catalog-${item.sheet}.png`})`,backgroundPosition:item.imageUrl ? "center" : `${[0,34,67,100][item.position]}% ${item.sheet === "17" ? "49%" : "15%"}`}} role="img" aria-label={item.name[language]}><span className={`availability availability-${item.status}`}>{item.status === "reserved" ? say("Réservé", "Reserved") : say("Disponible", "Available")}</span></div><div className="featured-copy"><span>{item.badge === "new" ? say("Nouveauté", "New arrival") : say("Rentrée", "School days")}</span><h3>{item.name[language]}</h3><strong>{new Intl.NumberFormat(language === "fr" ? "fr-GN" : "en-GN").format(item.price)} <small>GNF</small></strong></div></a>)}</div></section>)}

      <section className="promise" id="rentrée">
        <div className="promise-inner wrap">
          <div><span>01</span><h3>{say("Pour chaque âge", "For every age")}</h3><p>{say("Des idées qui grandissent avec les enfants.", "Thoughtful finds that grow alongside your children.")}</p></div>
          <div><span>02</span><h3>{say("Pour chaque aventure", "For every adventure")}</h3><p>{say("De belles trouvailles pour jouer et bouger.", "Lovely discoveries for playtime and adventure.")}</p></div>
          <div><span>03</span><h3>{say("Pour la rentrée", "For school days")}</h3><p>{say("Fournitures et essentiels pour l’école.", "School supplies and everyday essentials.")}</p></div>
        </div>
      </section>

      <section className="offer-section section wrap" id="promotions"><div className="section-heading"><div><p className="eyebrow">{say("Les petits plus du moment", "A few little extras")}</p><h2>{say("De jolies", "Lovely little")}<br/><span>{say("attentions.", "surprises.")}</span></h2></div><p>{say("Nos offres en boutique, dans la limite des disponibilités.", "Our in-store offers, while availability lasts.")}</p></div><div className="offer-grid"><article><span className="offer-label">−15 %</span><h3>{say("La rentrée en douceur", "Back to school, made easier")}</h3><p>{say("Sur un ensemble cartable, sac à lunch et gourde.", "On a matching backpack, lunch bag and water bottle.")}</p><a href="#catalogue" onClick={() => setActive("sacs")}>{say("Voir les essentiels", "Shop school essentials")} →</a></article><article><span className="offer-label">{say("Offert", "Our treat")}</span><h3>{say("Un cadeau joliment préparé", "A beautifully wrapped gift")}</h3><p>{say("Emballage cadeau offert dès 25 000 GNF de commande.", "Complimentary gift wrapping on orders of 25,000 GNF or more.")}</p><a href={whatsappUrl} target="_blank" rel="noreferrer">{say("Demander sur WhatsApp", "Ask us on WhatsApp")} →</a></article><article><span className="offer-label">{say("Livraison", "Delivery")}</span><h3>{say("Livré chez vous", "Delivered to your door")}</h3><p>{say("Livraison offerte dès 50 000 GNF à Dixinn et Matam.", "Free delivery on orders from 50,000 GNF in Dixinn and Matam.")}</p><a href="#livraison">{say("Découvrir les zones", "See delivery areas")} →</a></article></div></section>

      <section className="services-section" id="services"><div className="wrap"><div className="center-heading"><p className="eyebrow">{say("Bien plus qu’une boutique", "More than just a shop")}</p><h2>{say("À vos côtés,", "By your side,")} <em>{say("tout simplement.", "every step.")}</em></h2><p>{say("De petites attentions qui rendent l’expérience encore plus belle.", "The thoughtful little touches that make every visit special.")}</p></div><div className="services-grid"><article><span aria-hidden="true">✳</span><h3>{say("Emballage cadeau", "Gift wrapping")}</h3><p>{say("Pour les anniversaires et les belles occasions, préparé avec soin.", "Carefully wrapped for birthdays and special occasions.")}</p></article><article><span aria-hidden="true">↗</span><h3>{say("Livraison à domicile", "Home delivery")}</h3><p>{say("Conakry et banlieue, avec paiement à la livraison.", "Conakry and surrounding areas, with payment upon delivery.")}</p></article><article><span aria-hidden="true">◎</span><h3>{say("Conseils personnalisés", "Thoughtful advice")}</h3><p>{say("Des idées adaptées à l’âge et aux découvertes de chaque enfant.", "Suggestions chosen around each child’s age and curiosity.")}</p></article><article><span aria-hidden="true">♡</span><h3>{say("Garantie et échange", "Returns and exchanges")}</h3><p>{say("Un souci avec un produit? Parlons-en rapidement sur WhatsApp.", "Something not quite right? Message us on WhatsApp and we will help.")}</p></article></div></div></section>

      <section className="story section wrap" id="notre-histoire">
        <div className="story-image"><img src="/boutique-hero.png" alt={say("Les rayons colorés de la boutique Envol des Enfants", "The colourful shelves at Envol des Enfants")} /><span>{say("Une boutique, mille sourires.", "One little shop, a thousand smiles.")}</span></div>
        <div className="story-copy"><p className="eyebrow">{say("Votre boutique à Dixinn, Conakry", "Your shop in Dixinn, Conakry")}</p><h2>{say("Un endroit où", "A place where")}<br /><span>{say("l’enfance prend", "childhood finds")}<br />{say("son envol.", "its wings.")}</span></h2><p>{say("Envol des Enfants, c’est un univers où les couleurs attirent les regards, où les petits véhicules font rêver et où chaque visite devient un moment à partager.", "Envol des Enfants is a world of eye-catching colours, dream-worthy little vehicles and shared moments around every corner.")}</p><p>{say("Retrouvez-nous à l’immeuble Famille Diallo, Cameroun, Dixinn, ou écrivez-nous sur WhatsApp.", "Visit us at the Famille Diallo building, Cameroun, Dixinn, or message us on WhatsApp.")}</p><a className="text-link" href={facebookUrl} target="_blank" rel="noreferrer">{say("Voir nos nouveautés sur Facebook", "See what is new on Facebook")} <span>↗</span></a></div>
      </section>

      <section className="brands-section"><div className="wrap"><p className="eyebrow">{say("Des marques que les enfants adorent", "Brands little ones love")}</p><div className="brands-line">{["Crayola","Disney","LEGO","Hype","Mattel","Fisher-Price","Hasbro"].map((brand) => <span key={brand}>{brand}</span>)}</div></div></section>

      <section className="delivery-section section wrap" id="livraison"><div className="section-heading"><div><p className="eyebrow">{say("De notre boutique à votre porte", "From our shop to your door")}</p><h2>{say("Tout près,", "Near or far,")}<br/><span>{say("ou un peu plus loin.", "we come to you.")}</span></h2></div><p>{say("Livraison à Conakry et dans ses environs. Paiement à la réception ou selon les modalités convenues.", "Delivery across Conakry and surrounding areas. Pay upon delivery or by prior arrangement.")}</p></div><div className="delivery-grid"><article><p>{say("Tout près de nous", "Just around the corner")}</p><h3>Dixinn & Matam</h3><strong>2 000 <small>GNF</small></strong><span>{say("Le jour même", "Same-day delivery")}</span></article><article><p>{say("Dans la ville", "Around the city")}</p><h3>{say("Autres communes", "Other Conakry districts")}</h3><strong>5 000 <small>GNF</small></strong><span>{say("Sous 24 à 48 h", "Within 24–48 hours")}</span></article><article><p>{say("Un peu plus loin", "A little further")}</p><h3>{say("Banlieue et intérieur", "Suburbs and beyond")}</h3><strong>{say("À convenir", "Let’s discuss")}</strong><span>{say("Sous 2 à 4 jours", "Within 2–4 days")}</span></article></div></section>

      <section className="testimonials-section"><div className="wrap"><div className="center-heading"><p className="eyebrow">{say("Les petits mots qui nous touchent", "Little words that mean so much")}</p><h2>{say("Ils nous font", "Families who")} <em>{say("confiance.", "trust us.")}</em></h2></div><div className="testimonial-grid"><blockquote><p>{say("Ma fille adore son puzzle! Livraison rapide et équipe gentille.", "My daughter loves her puzzle! Fast delivery and such a lovely team.")}</p><footer>Awa K. <span>· Dixinn</span></footer></blockquote><blockquote><p>{say("Je commande toujours les fournitures de rentrée ici. Prix corrects.", "I always order our school supplies here. Very fair prices.")}</p><footer>Moussa B. <span>· Matam</span></footer></blockquote><blockquote><p>{say("Le cartable est solide, ma petite l’utilise depuis plus d’un an.", "The backpack is sturdy — my little one has used it for over a year.")}</p><footer>Fatou D. <span>· Cameroun</span></footer></blockquote></div></div></section>

      <section className="faq-section section wrap" id="faq"><div className="center-heading"><p className="eyebrow">{say("On vous répond", "We are here to help")}</p><h2>{say("Vos questions,", "Your questions,")} <em>{say("nos réponses.", "answered.")}</em></h2></div><div className="faq-list"><details><summary>{say("Comment passer une commande?", "How do I place an order?")}</summary><p>{say("Choisissez votre article dans le catalogue et appuyez sur Commander. Votre demande s’ouvrira directement dans WhatsApp avec le produit sélectionné.", "Choose an item from our catalogue and tap Order now. A WhatsApp message will open automatically with your selected item.")}</p></details><details><summary>{say("Quels sont les moyens de paiement?", "Which payment methods are accepted?")}</summary><p>{say("Le paiement est possible à la livraison. Écrivez-nous pour vérifier les autres modalités offertes.", "You can pay upon delivery. Message us to ask about other available payment options.")}</p></details><details><summary>{say("Livrez-vous à l’extérieur de Conakry?", "Do you deliver outside Conakry?")}</summary><p>{say("Oui, une livraison en banlieue et à l’intérieur peut être organisée selon la destination. Le tarif est convenu avec vous.", "Yes. Delivery to surrounding areas can be arranged depending on your location. We will confirm the cost together.")}</p></details><details><summary>{say("Que faire si un article présente un problème?", "What if there is an issue with my item?")}</summary><p>{say("Contactez-nous rapidement sur WhatsApp afin de vérifier les possibilités d’échange et les conditions applicables.", "Please contact us promptly on WhatsApp so we can discuss exchange options and applicable conditions.")}</p></details><details><summary>{say("Les prix affichés sont-ils en francs guinéens?", "Are the displayed prices in Guinean francs?")}</summary><p>{say("Oui, tous les prix du catalogue sont indiqués en GNF. Contactez-nous pour confirmer le prix et la disponibilité d’un article.", "Yes. All catalogue prices are displayed in GNF. Contact us to confirm an item’s current price and availability.")}</p></details></div></section>

      <section className="contact-section" id="contact"><div className="wrap contact-grid"><div className="contact-copy"><p className="eyebrow">{say("On vous attend avec le sourire", "We cannot wait to welcome you")}</p><h2>{say("Passez nous", "Come say")}<br/><em>{say("dire bonjour.", "hello.")}</em></h2><p>{address}</p><a className="contact-phone" href="tel:+224666547976">+224 666 54 79 76</a><div className="contact-hour"><strong>{say("Horaires affichés", "Listed opening hours")}</strong><span>9 h – 19 h · 10 h – 14 h</span><small>{say("Confirmez le jour et l’horaire sur WhatsApp.", "Confirm the relevant day and hours on WhatsApp.")}</small></div><div className="contact-links"><a className="contact-button call-button" href="tel:+224666547976"><PhoneIcon/>{say("Appeler", "Call")}</a><a className="contact-button whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppIcon/>WhatsApp</a></div></div><div className="contact-map"><iframe title={say("Carte de la boutique à Dixinn, Conakry", "Map to our store in Dixinn, Conakry")} src="https://maps.google.com/maps?q=Immeuble%20Famille%20Diallo%2C%20Dixinn%2C%20Conakry&t=&z=13&ie=UTF8&iwloc=&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe><a href={mapsUrl} target="_blank" rel="noreferrer">{say("Ouvrir l’itinéraire dans Google Maps", "Get directions in Google Maps")} ↗</a></div></div></section>

      <section className="cta"><div className="wrap"><p className="eyebrow">{say("Une petite surprise de bienvenue", "A little welcome surprise")}</p><h2>{say("10 % pour leur", "10% off their")}<br /><em>{say("prochaine aventure.", "next adventure.")}</em></h2><button onClick={() => setPromoOpen(true)} className="button button-light">{say("Recevoir mon rabais", "Get my discount")} <span>↗</span></button></div></section>

      <footer className="footer footer-expanded wrap"><div><a href="#accueil" className="footer-brand">Envol <span>des Enfants</span></a><p>{address}</p></div><nav aria-label={say("Liens de bas de page", "Footer navigation")}><a href="#catalogue">{say("Catalogue", "Catalogue")}</a><a href="#services">{say("Services", "Services")}</a><a href="#promotions">{say("Promotions", "Offers")}</a><a href="#faq">FAQ</a><a href="#livraison">{say("Livraison", "Delivery")}</a><a href="/admin">{say("Administration", "Administration")}</a></nav><div className="footer-social"><a href={facebookUrl} target="_blank" rel="noreferrer">Facebook ↗</a><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp ↗</a></div><small>© 2026 Envol des Enfants</small></footer>

      <div className="floating-actions"><a className="floating-call" href="tel:+224666547976" aria-label={say("Appeler", "Call")}><PhoneIcon/><span>{say("Appeler", "Call")}</span></a><a className="whatsapp-floating" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={say("Nous joindre sur WhatsApp", "Contact us on WhatsApp")}><WhatsAppIcon/><span>WhatsApp</span></a></div>

      {promoOpen && <div className="promo-backdrop" onClick={(event) => {if (event.target === event.currentTarget) closePromo();}}>
        <section className="promo-modal" role="dialog" aria-modal="true" aria-labelledby="promo-title"><button className="promo-close" aria-label={say("Fermer la fenêtre promotionnelle", "Close promotional offer")} onClick={closePromo}>×</button><div className="promo-photo"><img src="/boutique-hero.png" alt={say("L’intérieur coloré de la boutique Envol des Enfants", "Inside the colourful Envol des Enfants store")} /><span>{say("Du bonheur à découvrir.", "Happiness around every corner.")}</span></div><div className="promo-content"><span className="promo-logo brand-picture"><img src="/envol-reference.png" alt="Envol des Enfants" /></span><p className="eyebrow">{say("Un cadeau de bienvenue", "A little welcome gift")}</p><h2 id="promo-title"><span>10 %</span><br />{say("de rabais", "off")}</h2><p className="promo-intro">{say("Abonnez-vous et profitez de", "Subscribe and enjoy")} <strong>{say("10 % de rabais sur votre première commande.", "10% off your first order.")}</strong></p>{requested ? <div className="promo-success"><strong>{say("Votre demande est prête!", "Your request is ready!")}</strong><p>{say("Finalisez votre inscription dans la conversation WhatsApp qui vient de s’ouvrir.", "Complete your subscription in the WhatsApp conversation that just opened.")}</p><button onClick={closePromo}>{say("Continuer ma visite", "Continue browsing")} →</button></div> : <form onSubmit={requestDiscount}><label htmlFor="promo-email">{say("Votre adresse courriel", "Your email address")}</label><input id="promo-email" type="email" autoComplete="email" placeholder={say("vous@exemple.com", "you@example.com")} value={email} onChange={(event) => setEmail(event.target.value)} required /><label style={{display:"flex",alignItems:"flex-start",gap:"8px",fontSize:"11px",lineHeight:"1.5",margin:"10px 0"}}><input type="checkbox" style={{width:"auto",marginTop:"3px"}} checked={consent} onChange={(event) => setConsent(event.target.checked)} required />{say("J’accepte de recevoir des nouvelles et des offres d’Envol des Enfants.", "I agree to receive news and offers from Envol des Enfants.")}</label><button className="promo-submit" type="submit">{say("Recevoir mon 10 %", "Get my 10% discount")} →</button><small>{say("Offre réservée aux nouveaux abonnés. Demande confirmée sur WhatsApp.", "Offer available to new subscribers. Request confirmed through WhatsApp.")}</small></form>}</div></section>
      </div>}
    </main>
  );
}
