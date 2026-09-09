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

      <StorefrontCatalog products={storeProducts} availableCategories={availableCategories} dollCategories={dollCategories} language={language} market={market} active={active} query={query} status={status} showAll={showAll} whatsappNumber={whatsappNumber} whatsappUrl={whatsappUrl} style={sectionStyle("catalogue")} title={editable("catalogue_title", "Le catalogue", "A little shop")} accent={editable("catalogue_accent", "des petits bonheurs.", "full of joy.")} description={editable("catalogue_description", "Jouets éducatifs, vêtements, fournitures et idées-cadeaux : choisissez, puis commandez simplement sur WhatsApp.", "Educational toys, clothing, school essentials and thoughtful gifts. Pick your favourites and order through WhatsApp.")} onActiveChange={setActive} onQueryChange={setQuery} onStatusChange={setStatus} onShowAll={() => setShowAll(true)} onOpenProduct={setSelectedProduct} />

      <StorefrontFeaturedCollections
        products={storeProducts}
        language={language}
        market={market}
        say={say}
        onOpenProduct={setSelectedProduct}
      />

      <section className="promise" id="rentrée"><div className="promise-inner wrap"><div><span>01</span><h3>{say("Pour chaque âge", "For every age")}</h3><p>{say("Des idées qui grandissent avec les enfants.", "Thoughtful finds that grow alongside your children.")}</p><a className="text-link" href="#catalogue" onClick={() => chooseCategory("all")}>{say("Voir le catalogue", "Browse the catalogue")} →</a></div><div><span>02</span><h3>{say("Pour chaque aventure", "For every adventure")}</h3><p>{say("De belles trouvailles pour jouer et bouger.", "Lovely discoveries for playtime and adventure.")}</p><a className="text-link" href="#catalogue" onClick={() => chooseCategory("all")}>{say("Découvrir les jouets", "Discover toys")} →</a></div><div><span>03</span><h3>{say("Pour la rentrée", "For school days")}</h3><p>{say("Fournitures et essentiels pour l’école.", "School supplies and everyday essentials.")}</p><a className="text-link" href="#rentree-scolaire">{say("Voir la sélection scolaire", "See school essentials")} →</a></div></div></section>

      <section className="offer-section section wrap" id="promotions"><div className="section-heading"><div><p className="eyebrow">{say("Les petits plus du moment", "A few little extras")}</p><h2>{say("De jolies", "Lovely little")}<br/><span>{say("attentions.", "surprises.")}</span></h2></div><p>{say("Nos offres en boutique, dans la limite des disponibilités.", "Our in-store offers, while availability lasts.")}</p></div><div className="offer-grid"><article><span className="offer-label">−{storeSettings.welcome_discount || "10"} %</span><h3>{say("Un cadeau de bienvenue", "A little welcome gift")}</h3><p>{say("Votre rabais de bienvenue sur une première commande admissible.", "Your welcome discount on an eligible first order.")}</p><a href="#catalogue" onClick={() => chooseCategory("all")}>{say("Voir le catalogue", "Browse the catalogue")} →</a></article><article><span className="offer-label">{say("Offert", "Our treat")}</span><h3>{say("Un cadeau joliment préparé", "A beautifully wrapped gift")}</h3><p>{market === "conakry" ? say("Emballage cadeau offert dès 25 000 GNF de commande.", "Complimentary gift wrapping on orders of 25,000 GNF or more.") : say("Emballage cadeau selon les offres proposées par votre boutique.", "Gift wrapping according to your store’s available offers.")}</p><a href={whatsappUrl} target="_blank" rel="noreferrer">{say("Demander à la boutique", "Ask the store")} →</a></article><article><span className="offer-label">{say("Livraison", "Delivery")}</span><h3>{say("Livré chez vous", "Delivered to your door")}</h3><p>{market === "conakry" ? say("Livraison offerte dès 50 000 GNF à Dixinn et Matam.", "Free delivery on orders from 50,000 GNF in Dixinn and Matam.") : storeSettings.delivery_conditions || say("Livraison offerte selon les zones et modalités de votre boutique.", "Delivery according to your store’s areas and conditions.")}</p><a href="#livraison">{say("Découvrir les zones", "See delivery areas")} →</a></article></div></section>

      <section className="services-section" id="services"><div className="wrap"><div className="center-heading"><p className="eyebrow">{say("Bien plus qu’une boutique", "More than just a shop")}</p><h2>{say("À vos côtés,", "By your side,")} <em>{say("tout simplement.", "every step.")}</em></h2><p>{say("De petites attentions qui rendent l’expérience encore plus belle.", "The thoughtful little touches that make every visit special.")}</p></div><div className="services-grid"><article><span aria-hidden="true">✳</span><h3>{say("Emballage cadeau", "Gift wrapping")}</h3><p>{say("Pour les anniversaires et les belles occasions, préparé avec soin.", "Carefully wrapped for birthdays and special occasions.")}</p><a className="text-link" href={whatsappUrl} target="_blank" rel="noreferrer">{say("Demander un emballage", "Ask about gift wrapping")} →</a></article><article><span aria-hidden="true">↗</span><h3>{say("Livraison à domicile", "Home delivery")}</h3><p>{market === "qc" ? say("Au Québec, selon les modalités de votre boutique.", "Across Québec, based on your store’s delivery options.") : say("Conakry et banlieue, avec paiement à la livraison.", "Conakry and surrounding areas, with payment upon delivery.")}</p><a className="text-link" href="#livraison">{say("Voir les modalités", "See delivery options")} →</a></article><article><span aria-hidden="true">◎</span><h3>{say("Conseils personnalisés", "Thoughtful advice")}</h3><p>{say("Des idées adaptées à l’âge et aux découvertes de chaque enfant.", "Suggestions chosen around each child’s age and curiosity.")}</p><a className="text-link" href={whatsappUrl} target="_blank" rel="noreferrer">{say("Demander conseil", "Ask for advice")} →</a></article><article><span aria-hidden="true">♡</span><h3>{say("Garantie et échange", "Returns and exchanges")}</h3><p>{say("Un souci avec un produit? Parlons-en rapidement avec la boutique.", "Something not quite right? Contact the store and we will help.")}</p><a className="text-link" href="#contact">{say("Nous contacter", "Contact us")} →</a></article></div></div></section>

      <section className="story section wrap" id="notre-histoire"><div className="story-image"><img src="/boutique-hero.png" alt={say("Les rayons colorés de la boutique Envol des Enfants", "The colourful shelves at Envol des Enfants")} /><span>{say("Une boutique, mille sourires.", "One little shop, a thousand smiles.")}</span></div><div className="story-copy"><p className="eyebrow">{say(`Votre boutique · ${markets[market].label}`, `Your shop · ${markets[market].label}`)}</p><h2>{say("Un endroit où", "A place where")}<br /><span>{say("l’enfance prend", "childhood finds")}<br />{say("son envol.", "its wings.")}</span></h2><p>{say("Envol des Enfants, c’est un univers où les couleurs attirent les regards, où les petits véhicules font rêver et où chaque visite devient un moment à partager.", "Envol des Enfants is a world of eye-catching colours, dream-worthy little vehicles and shared moments around every corner.")}</p><p>{say(`Retrouvez votre boutique : ${address}.`, `Find your store at: ${address}.`)}</p><a className="text-link" href={facebookUrl} target="_blank" rel="noreferrer">{say("Voir nos nouveautés", "See what is new")} <span>↗</span></a></div></section>

      <section className="brands-section"><div className="wrap"><p className="eyebrow">{say("Des marques que les enfants adorent", "Brands little ones love")}</p><div className="brands-line">{["Crayola","Disney","LEGO","Hype","Mattel","Fisher-Price","Hasbro"].map((brand) => <button type="button" key={brand} onClick={() => searchCatalog(brand)}>{brand}</button>)}</div></div></section>

      <section className="delivery-section section wrap" id="livraison"><div className="section-heading"><div><p className="eyebrow">{say("De notre boutique à votre porte", "From our shop to your door")}</p><h2>{say("Tout près,", "Near or far,")}<br/><span>{say("ou un peu plus loin.", "we come to you.")}</span></h2></div><p>{storeSettings.delivery_conditions || (market === "qc" ? say("Livraison au Québec selon les zones et les modalités confirmées avec la boutique.", "Delivery in Québec according to the zones and conditions confirmed with the store.") : say("Livraison à Conakry et dans ses environs. Paiement à la réception ou selon les modalités convenues.", "Delivery across Conakry and surrounding areas. Pay upon delivery or by prior arrangement."))}</p></div><div className="delivery-grid">{market === "qc" ? <><article><p>{say("Près de chez vous", "Near you")}</p><h3>{say("Livraison locale", "Local delivery")}</h3><strong>{say("À confirmer", "To be confirmed")}</strong><span>{say("Selon votre adresse", "Based on your address")}</span></article><article><p>{say("Partout dans la province", "Across the province")}</p><h3>{say("Ailleurs au Québec", "Elsewhere in Québec")}</h3><strong>{say("À confirmer", "To be confirmed")}</strong><span>{say("Selon la destination", "Based on the destination")}</span></article><article><p>{say("Besoin d’aide?", "Need help?")}</p><h3>{say("Modalités de livraison", "Delivery options")}</h3><strong>{say("Nous contacter", "Contact us")}</strong><span>{storeSettings.delivery_zones || say("Zones à préciser", "Areas to be confirmed")}</span></article></> : <><article><p>{say("Tout près de nous", "Just around the corner")}</p><h3>Dixinn & Matam</h3><strong>2 000 <small>GNF</small></strong><span>{say("Selon disponibilité", "Subject to availability")}</span></article><article><p>{say("Dans la ville", "Around the city")}</p><h3>{say("Autres communes", "Other Conakry districts")}</h3><strong>5 000 <small>GNF</small></strong><span>{say("Délai confirmé à la commande", "Delivery time confirmed when ordering")}</span></article><article><p>{say("Un peu plus loin", "A little further")}</p><h3>{say("Banlieue et intérieur", "Suburbs and beyond")}</h3><strong>{say("À convenir", "Let’s discuss")}</strong><span>{say("Selon la destination", "Based on your destination")}</span></article></>}</div></section>

      <section className="testimonials-section"><div className="wrap"><div className="center-heading"><p className="eyebrow">{say("Les petits mots qui nous touchent", "Little words that mean so much")}</p><h2>{say("Ils nous font", "Families who")} <em>{say("confiance.", "trust us.")}</em></h2></div><div className="testimonial-grid"><blockquote><p>{say("Ma fille adore son puzzle! Livraison rapide et équipe gentille.", "My daughter loves her puzzle! Fast delivery and such a lovely team.")}</p><footer>Awa K. <span>· Dixinn</span></footer></blockquote><blockquote><p>{say("Je commande toujours les fournitures de rentrée ici. Prix corrects.", "I always order our school supplies here. Very fair prices.")}</p><footer>Moussa B. <span>· Matam</span></footer></blockquote><blockquote><p>{say("Le cartable est solide, ma petite l’utilise depuis plus d’un an.", "The backpack is sturdy — my little one has used it for over a year.")}</p><footer>Fatou D. <span>· Cameroun</span></footer></blockquote></div></div></section>

      <section className="faq-section section wrap" id="faq"><div className="center-heading"><p className="eyebrow">{say("On vous répond", "We are here to help")}</p><h2>{say("Vos questions,", "Your questions,")} <em>{say("nos réponses.", "answered.")}</em></h2></div><div className="faq-list"><details><summary>{say("Comment passer une commande?", "How do I place an order?")}</summary><p>{say("Choisissez votre article dans le catalogue et communiquez avec votre boutique pour confirmer la commande.", "Choose an item from our catalogue and contact your store to confirm your order.")}</p></details><details><summary>{say("Quels sont les moyens de paiement?", "Which payment methods are accepted?")}</summary><p>{market === "qc" ? say("Communiquez avec la boutique du Québec pour confirmer les moyens de paiement acceptés.", "Contact the Québec store to confirm the accepted payment methods.") : say("Le paiement est possible à la livraison. Écrivez-nous pour vérifier les autres modalités offertes.", "You can pay upon delivery. Message us to ask about other available payment options.")}</p></details><details><summary>{market === "qc" ? say("Livrez-vous partout au Québec?", "Do you deliver throughout Québec?") : say("Livrez-vous à l’extérieur de Conakry?", "Do you deliver outside Conakry?")}</summary><p>{storeSettings.delivery_conditions || say("Les zones, tarifs et délais sont confirmés avec votre boutique selon la destination.", "Delivery areas, fees and timelines are confirmed with your store based on your destination.")}</p></details><details><summary>{say("Que faire si un article présente un problème?", "What if there is an issue with my item?")}</summary><p>{say("Contactez rapidement votre boutique afin de vérifier les possibilités d’échange et les conditions applicables.", "Please contact your store promptly so we can discuss exchange options and applicable conditions.")}</p></details><details><summary>{market === "qc" ? say("Les prix affichés sont-ils en dollars canadiens?", "Are the displayed prices in Canadian dollars?") : say("Les prix affichés sont-ils en francs guinéens?", "Are the displayed prices in Guinean francs?")}</summary><p>{market === "qc" ? say("Oui, les prix du catalogue québécois sont indiqués en dollars canadiens (CAD).", "Yes. Prices in the Québec catalogue are displayed in Canadian dollars (CAD).") : say("Oui, les prix du catalogue de Conakry sont indiqués en francs guinéens (GNF).", "Yes. Prices in the Conakry catalogue are displayed in Guinean francs (GNF).")}</p></details></div></section>

      <section className="contact-section" id="contact"><div className="wrap contact-grid"><div className="contact-copy"><p className="eyebrow">{say("On vous attend avec le sourire", "We cannot wait to welcome you")}</p><h2>{say("Passez nous", "Come say")}<br/><em>{say("dire bonjour.", "hello.")}</em></h2><p>{address}</p>{storePhone && <a className="contact-phone" href={`tel:${storePhone.replace(/\s/g, "")}`}>{storePhone}</a>}<div className="contact-hour"><strong>{say("Horaires affichés", "Listed opening hours")}</strong><span>{storeSettings.opening_hours || (market === "conakry" ? "9 h – 19 h · 10 h – 14 h" : say("Horaires à confirmer", "Hours to be confirmed"))}</span><small>{say("Confirmez le jour et l’horaire avec la boutique.", "Confirm the relevant day and hours with the store.")}</small></div><div className="contact-links">{storePhone && <a className="contact-button call-button" href={`tel:${storePhone.replace(/\s/g, "")}`}><PhoneIcon/>{say("Appeler", "Call")}</a>}{whatsappNumber && <a className="contact-button whatsapp-button" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppIcon/>WhatsApp</a>}</div></div><div className="contact-map"><iframe title={say(`Carte de la boutique · ${markets[market].label}`, `Store map · ${markets[market].label}`)} src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe><a href={mapsUrl} target="_blank" rel="noreferrer">{say("Ouvrir l’itinéraire dans Google Maps", "Get directions in Google Maps")} ↗</a></div></div></section>

      <section className="cta"><div className="wrap"><p className="eyebrow">{say("Une petite surprise de bienvenue", "A little welcome surprise")}</p><h2>{say("10 % pour leur", "10% off their")}<br /><em>{say("prochaine aventure.", "next adventure.")}</em></h2><button onClick={promo.openPromo} className="button button-light">{say("Recevoir mon rabais", "Get my discount")} <span>↗</span></button></div></section>
      <footer className="footer footer-expanded wrap"><div><a href="#accueil" className="footer-brand">Envol <span>des Enfants</span></a><p>{address}</p></div><nav aria-label={say("Liens de bas de page", "Footer navigation")}><a href="#catalogue">{say("Catalogue", "Catalog")}</a><a href="#services">{say("Services", "Services")}</a><a href="#promotions">{say("Promotions", "Offers")}</a><a href="#faq">FAQ</a><a href="#livraison">{say("Livraison", "Delivery")}</a><a href="/admin">{say("Administration", "Admin")}</a></nav><div className="footer-social"><a href={facebookUrl} target="_blank" rel="noreferrer">Facebook ↗</a><a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp ↗</a></div><small>© 2026 Envol des Enfants</small></footer>
      <StorefrontQuickScroll say={say} />
      <div className="floating-actions">{storePhone && <a className="floating-call" href={`tel:${storePhone.replace(/\s/g, "")}`} aria-label={say("Appeler", "Call")}><PhoneIcon/><span>{say("Appeler", "Call")}</span></a>}{whatsappNumber && <a className="whatsapp-floating" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={say("Nous joindre sur WhatsApp", "Contact us on WhatsApp")}><WhatsAppIcon/><span>WhatsApp</span></a>}</div>

      <StorefrontPromo
        open={promo.promoOpen}
        email={promo.email}
        requested={promo.requested}
        consent={promo.consent}
        discount={welcomeDiscount}
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
