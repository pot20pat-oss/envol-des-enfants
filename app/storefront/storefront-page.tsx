"use client";

import { useState } from "react";
import { type Product, type Translation } from "@/lib/default-catalog";
import { markets } from "@/lib/markets";
import StorefrontCatalog from "./storefront-catalog";
import ProductLightbox from "./product-lightbox";
import { PhoneIcon, WhatsAppIcon } from "./product-icons";
import StorefrontNavigation from "./storefront-navigation";
import StorefrontPromo from "./storefront-promo";
import StorefrontHero from "./storefront-hero";
import StorefrontFeaturedCollections from "./storefront-featured-collections";
import StorefrontQuickScroll from "./storefront-quick-scroll";
import StorefrontShopSections from "./storefront-shop-sections";
import { useStoreLanguage } from "../hooks/use-store-language";
import { useStoreMarket } from "../hooks/use-store-market";
import { useStorefrontSettings } from "../hooks/use-storefront-settings";
import { useStorefrontPromo } from "../hooks/use-storefront-promo";

const categories: { label: Translation; value: string }[] = [
  { label: { fr: "Tout voir", en: "View all" }, value: "all" },
  { label: { fr: "Jouets éducatifs", en: "Educational toys" }, value: "eveil" },
  { label: { fr: "Mon monde de poupées et princesses", en: "My world of dolls and princesses" }, value: "poupees" },
  { label: { fr: "↳ Disney · Poupées et accessoires", en: "↳ Disney · Dolls & accessories" }, value: "disney" },
  { label: { fr: "↳ Barbie · Poupées et accessoires", en: "↳ Barbie · Dolls & accessories" }, value: "barbie" },
  { label: { fr: "↳ My Life · Poupées et accessoires", en: "↳ My Life · Dolls & accessories" }, value: "mylife" },
  { label: { fr: "↳ Miraculous · Poupées et accessoires", en: "↳ Miraculous · Dolls & accessories" }, value: "miraculous" },
  { label: { fr: "↳ LOL Surprise & OMG · Poupées et accessoires", en: "↳ LOL Surprise & OMG · Dolls & accessories" }, value: "lol" },
  { label: { fr: "↳ Rainbow High · Poupées et accessoires", en: "↳ Rainbow High · Dolls & accessories" }, value: "rainbowhigh" },
  { label: { fr: "↳ Baby Alive · Poupées et accessoires", en: "↳ Baby Alive · Dolls & accessories" }, value: "babyalive" },
  { label: { fr: "↳ Hairmazing · Poupées et accessoires", en: "↳ Hairmazing · Dolls & accessories" }, value: "hairmazing" },
  { label: { fr: "↳ Karma’s World · Poupées et accessoires", en: "↳ Karma’s World · Dolls & accessories" }, value: "karma" },
  { label: { fr: "↳ My Sweet Baby · Poupées et accessoires", en: "↳ My Sweet Baby · Dolls & accessories" }, value: "mysweetbaby" },
  { label: { fr: "↳ Glamour Girl · Poupées et accessoires", en: "↳ Glamour Girl · Dolls & accessories" }, value: "glamourgirl" },
  { label: { fr: "↳ Autres poupées et accessoires", en: "↳ Other dolls & accessories" }, value: "autres_poupees" },
  { label: { fr: "Bébé", en: "Baby" }, value: "bebe" },
  { label: { fr: "Vêtements", en: "Clothing" }, value: "vetements" },
  { label: { fr: "Chaussures", en: "Shoes" }, value: "chaussures" },
  { label: { fr: "Articles scolaires", en: "School supplies" }, value: "scolaire" },
  { label: { fr: "Sacs & gourdes", en: "Bags & bottles" }, value: "sacs" },
  { label: { fr: "Véhicules", en: "Vehicles" }, value: "vehicules" },
  { label: { fr: "Piscine & jeux d’eau", en: "Pool & water play" }, value: "piscine" },
  { label: { fr: "Métiers & imitation", en: "Pretend play" }, value: "imitation" },
  { label: { fr: "Dinosaures & aventures", en: "Dinosaurs & adventures" }, value: "dinosaures" },
  { label: { fr: "Animaux & compagnons", en: "Animals & companions" }, value: "animaux" },
];

export default function Home() {
  const [active, setActive] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [showAll, setShowAll] = useState(false);\n  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const { language, changeLanguage } = useStoreLanguage();
  const { market, storeSettings, storeProducts } = useStoreMarket();
  const dollCategories = ["poupees", "princesses", "disney", "barbie", "mylife", "miraculous", "lol", "rainbowhigh", "babyalive", "hairmazing", "karma", "mysweetbaby", "glamourgirl", "autres_poupees"];
  const availableCategories = categories.filter((category) => category.value === "all" || (category.value === "poupees" ? storeProducts.some((product) => dollCategories.includes(product.category)) : storeProducts.some((product) => product.category === category.value)));
  const {
    storePhone, whatsappNumber, whatsappUrl, facebookUrl, address, mapsUrl, mapEmbedUrl, welcomeDiscount,
    isEnglish, say, editable, sectionStyle, sectionVisible,
  } = useStorefrontSettings(storeSettings, market, language);
  const promo = useStorefrontPromo({ language, market, whatsappNumber, whatsappUrl, welcomeDiscount, say });

  function chooseCategory(category: string) {
    setActive(category);
    setStatus("all");
    setQuery("");
  }

  function searchCatalog(search: string) {
    setActive("all");
    setStatus("all");
    setQuery(search);
  }

  return (
    <main className="editable-storefront">
      <div className="announcement"><span>{say("Nouveaux abonnés :", "New subscribers:")} <strong>{say("10 % de rabais", "10% off")}</strong> {say("sur votre première commande.", "your first order.")}</span><button onClick={promo.openPromo}>{say("J’en profite", "Get the offer")} →</button></div>

      <StorefrontNavigation
        language={language}
        market={market}
        storePhone={storePhone}
        whatsappUrl={whatsappUrl}
        availableCategories={availableCategories}
        say={say}
        sectionVisible={sectionVisible}
        changeLanguage={changeLanguage}
        chooseCategory={chooseCategory}
      />

      <StorefrontShopSections market={market} say={say} mode="categories" />

      <StorefrontHero
        market={market}
        storePhone={storePhone}
        whatsappNumber={whatsappNumber}
        whatsappUrl={whatsappUrl}
        facebookUrl={facebookUrl}
        say={say}
        editable={editable}
        sectionStyle={sectionStyle}
      />

      <section className="home-section-cards wrap" aria-label={say("Nos univers", "Our collections")}>
        <a href={`/catalogue?region=${market}&category=montessori`}><img src="/cartes%20section/74025328-ea79-427e-bf57-027b05097c10.png" alt="Montessori" /></a>
        <a href={`/jouets?region=${market}`}><img src="/cartes%20section/be962550-9f70-4030-97c0-3addda330a49.png" alt={say("Jouets éducatifs", "Educational toys")} /></a>
        <a href={`/poupees?region=${market}`}><img src="/cartes%20section/da0e6993-e65b-4d25-8003-d07156664e1e.png" alt={say("Mon monde de poupée", "My doll world")} /></a>
        <a href={`/catalogue?region=${market}&category=vehicules`}><img src="/cartes%20section/ec693c9d-9133-4e00-bdba-93c2a727636a.png" alt={say("Voitures électriques", "Electric vehicles")} /></a>
      </section>

      <section className="home-partners wrap" aria-labelledby="home-partners-title">
        <div className="home-partners-heading">
          <p className="eyebrow">{say("Des marques choisies avec soin", "Carefully selected brands")}</p>
          <h2 id="home-partners-title">{say("Nos partenaires", "Our partners")}</h2>
          <p>{say("Découvrez les partenaires et les collections que nous avons choisi de vous faire découvrir.", "Discover our partners and the collections we have selected for you.")}</p>
        </div>
        <div className="home-partners-grid">
          {[
            {id:"marina-pau",name:"Marina & Pau",tag:say("Poupées", "Dolls"),description:say("Marina & Pau imagine des poupées au style tendre et soigné. L’Envol des Enfants met en valeur leurs collections pour offrir des compagnons de jeu attachants et propices aux histoires et au jeu d’imitation.", "Marina & Pau creates dolls with a gentle, carefully crafted style. L’Envol des Enfants features their collections as charming companions for storytelling and imaginative play."),url:"https://marinapau.com/"},
            {id:"geocan",name:"Geocan",tag:say("Scolaire & accessoires", "School & accessories"),description:say("Geocan propose des sacs, accessoires et articles pratiques pour accompagner les enfants à l’école et dans leurs activités quotidiennes. Une sélection utile, colorée et adaptée à la vie de tous les jours.", "Geocan offers bags, accessories and practical items for school and everyday activities: useful, colourful products made for daily life."),url:"https://geocan-int.com/"},
            {id:"shoebox",name:"Shoebox Media",tag:say("Livres Petit Génie", "Petit Génie books"),description:say("Shoebox Media est le partenaire derrière les livres Petit Génie. Ces livres invitent les enfants à apprendre, découvrir et développer leur curiosité à travers des contenus ludiques et accessibles.", "Shoebox Media is the partner behind the Petit Génie books, designed to help children learn, discover and develop their curiosity through playful, accessible content."),url:"https://shoeboxmedia.net/"}
          ].map(partner=><article className="home-partner-card" key={partner.id}>
            <button type="button" onClick={()=>setSelectedPartner(partner.id)} aria-label={say(`Découvrir ${partner.name}`,`Discover ${partner.name}`)}>
              <span className="home-partner-mark">{partner.name}</span><small>{partner.tag}</small><b>{say("Découvrir le partenaire", "Discover partner")} →</b>
            </button>
            {selectedPartner===partner.id&&<div className="partner-modal" role="dialog" aria-modal="true" aria-label={partner.name} onClick={()=>setSelectedPartner(null)}>
              <div className="partner-modal-card" onClick={event=>event.stopPropagation()}>
                <button className="partner-modal-close" type="button" onClick={()=>setSelectedPartner(null)} aria-label={say("Fermer","Close")}>×</button>
                <p className="eyebrow">{say("Partenaire de L’Envol des Enfants","L’Envol des Enfants partner")}</p>
                <h2>{partner.name}</h2><strong>{partner.tag}</strong><p>{partner.description}</p>
                <a href={partner.url} target="_blank" rel="noreferrer">{say("Visiter le site du partenaire","Visit partner website")} →</a>
              </div>
            </div>}
          </article>)}
        </div>
      </section>

      <StorefrontFeaturedCollections products={storeProducts} language={language} market={market} say={say} onOpenProduct={setSelectedProduct} />
      <section className="reference-home-cta wrap">
        <a href={`/catalogue?region=${market}`} className="reference-home-shop-all">{say("Voir tous les produits", "Shop all products")} →</a>
      </section>

      <StorefrontPromo
        open={promo.promoOpen}
        email={promo.email}
        requested={promo.requested}
        consent={promo.consent}
        discount={welcomeDiscount}
        error={promo.error}
        submitting={promo.submitting}
        say={say}
        onClose={promo.closePromo}
        onEmailChange={promo.setEmail}
        onConsentChange={promo.setConsent}
        onSubmit={promo.requestDiscount}
      />

      {selectedProduct && <ProductLightbox key={selectedProduct.id || `${selectedProduct.sheet}-${selectedProduct.position}`} product={selectedProduct} language={language} market={market} whatsappNumber={whatsappNumber} whatsappUrl={whatsappUrl} onClose={() => setSelectedProduct(null)} />}
    </main>
  );
}
