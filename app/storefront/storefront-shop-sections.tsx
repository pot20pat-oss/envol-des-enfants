"use client";

import type { Market } from "@/lib/markets";

type Props = {
  market: Market;
  say: (french: string, english: string) => string;
  mode?: "all" | "categories" | "content";
};

const categories = [
  { labelFr: "Éveil 0–3 ans", labelEn: "Early years", image: "/category-buttons/eveil.png", href: "/bebe-enfants" },
  { labelFr: "Jouets éducatifs", labelEn: "Educational toys", image: "/category-buttons/educatifs.png", href: "/jouets" },
  { labelFr: "Montessori", labelEn: "Montessori", image: "/category-buttons/montessori.png", href: "/catalogue?category=montessori" },
  { labelFr: "Jeux & Jouets", labelEn: "Games & Toys", image: "/category-buttons/jeux-jouets.png", href: "/jouets" },
  { labelFr: "Mon Monde de Poupée", labelEn: "My Doll World", image: "/category-buttons/poupees.png", href: "/poupees" },
  { labelFr: "Vêtements", labelEn: "Clothing", image: "/category-buttons/vetements.png", href: "/catalogue?category=vetements" },
  { labelFr: "Chaussures", labelEn: "Shoes", image: "/category-buttons/chaussures.png", href: "/catalogue?category=chaussures" },
  { labelFr: "Voitures électriques", labelEn: "Electric vehicles", image: "/category-buttons/voitures.png", href: "/catalogue?category=vehicules" },
  { labelFr: "Scolaire", labelEn: "School", image: "/category-buttons/scolaire.png", href: "/articles-scolaires" },
];

const worlds = [
  { className: "world-educational", titleFr: "Jouets éducatifs", titleEn: "Educational toys", textFr: "Stimuler leur curiosité dès le plus jeune âge", textEn: "Inspire curiosity from an early age", image: "/category-buttons/educatifs.png", href: "/jouets", ctaFr: "Découvrir", ctaEn: "Discover" },
  { className: "world-montessori", titleFr: "Montessori", titleEn: "Montessori", textFr: "Apprendre autrement", textEn: "Learn differently", image: "/category-buttons/montessori.png", href: "/catalogue?category=montessori", ctaFr: "Voir la collection", ctaEn: "See the collection" },
  { className: "world-vehicles", titleFr: "Voitures électriques", titleEn: "Electric vehicles", textFr: "De grandes aventures les attendent!", textEn: "Big adventures are waiting!", image: "/category-buttons/voitures.png", href: "/catalogue?category=vehicules", ctaFr: "Voir les modèles", ctaEn: "See models" },
  { className: "world-dolls", titleFr: "Mon monde de poupée", titleEn: "My doll world", textFr: "Des poupées qui célèbrent la diversité", textEn: "Dolls that celebrate diversity", image: "/category-buttons/poupees.png", href: "/poupees", ctaFr: "Découvrir", ctaEn: "Discover" },
];

export default function StorefrontShopSections({ market, say, mode = "all" }: Props) {
  const region = `?region=${market}`;
  const ageGroups = [
    { fr: "0–12 mois", en: "0–12 months", image: "/hero-client/05-nouveau-ne.webp", age: "0-12-mois", tone: "pink" },
    { fr: "1–2 ans", en: "1–2 years", image: "/hero-client/06-bebe.webp", age: "1-2-ans", tone: "lilac" },
    { fr: "3–5 ans", en: "3–5 years", image: "/hero-client/02-jouets.webp", age: "3-5-ans", tone: "yellow" },
    { fr: "6–8 ans", en: "6–8 years", image: "/hero-client/04-sourires.webp", age: "6-8-ans", tone: "blue" },
    { fr: "9–12 ans", en: "9–12 years", image: "/hero-client/03-complicite.webp", age: "9-12-ans", tone: "green" },
    { fr: "12 ans et +", en: "12 years +", image: "/hero-client/01-costume.webp", age: "12-plus", tone: "rose" },
  ];
  const categorySection = (
    <section className="shop-category-strip wrap" aria-label={say("Catégories", "Categories")}>
      <div className="shop-category-rail shop-category-reference">
        <img className="shop-category-reference-image" src="/category-buttons-row.png" alt={say("Éveil 0–3 ans, Jouets éducatifs, Montessori, Jeux & Jouets, Mon Monde de Poupée, Vêtements, Chaussures, Voitures électriques, Scolaire", "Shop categories")} />
        <div className="shop-category-reference-links">
          {categories.map((category) => <a href={`${category.href}${category.href.includes("?") ? "&" : "?"}region=${market}`} key={category.labelFr} aria-label={say(category.labelFr, category.labelEn)} />)}
        </div>
      </div>
    </section>
  );
  if (mode === "categories") return categorySection;
  return <div className="shop-home-sections">
    <section className="shop-benefits wrap" aria-label={say("Nos engagements", "Our promises")}>
      <div><b>✓</b><span><strong>{say("Produits choisis avec soin", "Carefully selected products")}</strong>{say("Pour accompagner chaque enfant", "Made for every child")}</span></div>
      <div><b>♢</b><span><strong>{say("Paiement sécurisé", "Secure payment")}</strong>{say("Commandez en toute confiance", "Shop with confidence")}</span></div>
      <div><b>🚚</b><span><strong>{say("Livraison rapide", "Fast delivery")}</strong>{say("Au Canada et ailleurs", "Across Canada and beyond")}</span></div>
    </section>



    <section className="shop-category-strip wrap" aria-label={say("Catégories", "Categories")}>
      <div className="shop-category-rail shop-category-reference">
        <img className="shop-category-reference-image" src="/category-buttons-row.png" alt={say("Éveil 0–3 ans, Jouets éducatifs, Montessori, Jeux & Jouets, Mon Monde de Poupée, Vêtements, Chaussures, Voitures électriques, Scolaire", "Shop categories")} />
        <div className="shop-category-reference-links">
          {categories.map((category) => <a href={`${category.href}${category.href.includes("?") ? "&" : "?"}region=${market}`} key={category.labelFr} aria-label={say(category.labelFr, category.labelEn)} />)}
        </div>
      </div>
    </section>

    <section className="shop-world-grid wrap">
      {worlds.map((world) => <a className={world.className} href={`${world.href}${region}`} key={world.titleFr}>
        <div><h2>{say(world.titleFr, world.titleEn)}</h2><p>{say(world.textFr, world.textEn)}</p><span>{say(world.ctaFr, world.ctaEn)} →</span></div>
        <img src={world.image} alt="" />
      </a>)}
    </section>

    <section className="shop-age shop-age-buttons wrap">
      <h2><i aria-hidden="true">✦</i>{say("Magasiner par âge", "Shop by age")}<i aria-hidden="true">✦</i></h2>
      <div className="shop-age-grid">
        {ageGroups.map((group) => (
          <a className={`shop-age-button shop-age-${group.tone}`} style={{height:145,overflow:"hidden",background:"#fff",border:"1px solid #eee8e5",borderRadius:8,boxShadow:"0 3px 12px rgba(16,47,72,.07)"}} href={`/catalogue?region=${market}&age=${group.age}`} key={group.fr}>
            <span className="shop-age-photo" style={{height:116,overflow:"hidden",display:"block"}}><img src={group.image} alt="" style={{width:"100%",height:116,objectFit:"cover",objectPosition:"center 28%",display:"block"}} /></span>
            <strong>{say(group.fr, group.en)}</strong>
          </a>
        ))}
      </div>
    </section>

    <section className="shop-seasonal wrap">
      <a href={`/articles-scolaires${region}`}><div><h2>{say("Préparez la rentrée scolaire!", "Get ready for school!")}</h2><p>{say("Sacs, fournitures et plus encore", "Bags, supplies and more")}</p><span>{say("Voir la sélection", "See the selection")} →</span></div><span aria-hidden="true">🎒 ✏️ 📚</span></a>
      <a href={`/promotions${region}`}><div><h2>{say("Idées cadeaux de Noël", "Christmas gift ideas")}</h2><p>{say("Des jouets pour des fêtes inoubliables!", "Toys for unforgettable holidays!")}</p><span>{say("Découvrir", "Discover")} →</span></div><span aria-hidden="true">🎁 🧸</span></a>
    </section>

    <section className="shop-brands wrap"><h2>{say("Nos grandes marques", "Our favourite brands")}</h2><a className="shop-brand-official-strip" href={`/catalogue${region}`} aria-label={say("Voir toutes nos grandes marques", "See all our major brands")}><img src="/brand-logos-content.png" alt="VTech, LEGO, Fisher-Price, Playmobil, Barbie, Hasbro, Marina & Pau et plus encore"/></a></section>
      <section className="shop-bottom-benefits" aria-label={say("Pourquoi nous choisir", "Why choose us")}>
      <div><b>◇</b><span><strong>{say("Qualité & sécurité", "Quality & safety")}</strong>{say("Des produits fiables pour vos enfants", "Reliable products for your children")}</span></div>
      <div><b>♡</b><span><strong>{say("Service client", "Customer service")}</strong>{say("À votre écoute", "Here to help")}</span></div>
      <div><b>🚚</b><span><strong>{say("Livraison rapide", "Fast delivery")}</strong>{say("Au Canada et à l’international", "Across Canada and internationally")}</span></div>
      <div><b>✦</b><span><strong>{say("Entreprise canadienne", "Canadian business")}</strong>{say("Fièrement d’ici", "Proudly Canadian")}</span></div>
      <div><b>☆</b><span><strong>{say("Satisfaction garantie", "Satisfaction guaranteed")}</strong>{say("Des familles qui nous font confiance", "Trusted by families")}</span></div>
    </section>
  </div>;
}
