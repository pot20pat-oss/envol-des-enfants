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
  const [showAll, setShowAll] = useState(false);
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

      <StorefrontShopSections market={market} say={say} mode="content" />
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
