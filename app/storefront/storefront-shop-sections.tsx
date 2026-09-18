"use client";

import type { Market } from "@/lib/markets";

type Props = {
  market: Market;
  say: (french: string, english: string) => string;
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
  { className: "world-educational", titleFr: "Jouets éducatifs", titleEn: "Educational toys", textFr: "Stimuler leur curiosité dès le plus jeune âge", textEn: "Inspire curiosity from an early age", image: "/products/mama3/mama3-01.jpg", href: "/jouets" },
  { className: "world-dolls", titleFr: "Mon monde de poupées", titleEn: "My world of dolls", textFr: "Des poupées qui célèbrent toutes les histoires", textEn: "Dolls that celebrate every story", image: "/products/barbie/barbie-08.webp", href: "/poupees" },
  { className: "world-vehicles", titleFr: "Véhicules & aventures", titleEn: "Vehicles & adventures", textFr: "De grandes aventures les attendent", textEn: "Big adventures are waiting", image: "/products/archive-complements/vtt-utv-rouge.webp", href: "/catalogue" },
  { className: "world-princess", titleFr: "Princesses", titleEn: "Princesses", textFr: "Un univers pour rêver et créer", textEn: "A world made for dreaming", image: "/products/disney/disney-04.webp", href: "/poupees" },
];

export default function StorefrontShopSections({ market, say }: Props) {
  const region = `?region=${market}`;
  return <div className="shop-home-sections">
    <section className="shop-benefits wrap" aria-label={say("Nos engagements", "Our promises")}>
      <div><b>✓</b><span><strong>{say("Produits choisis avec soin", "Carefully selected products")}</strong>{say("Pour accompagner chaque enfant", "Made for every child")}</span></div>
      <div><b>♢</b><span><strong>{say("Paiement sécurisé", "Secure payment")}</strong>{say("Commandez en toute confiance", "Shop with confidence")}</span></div>
      <div><b>🚚</b><span><strong>{say("Livraison rapide", "Fast delivery")}</strong>{say("Au Canada et ailleurs", "Across Canada and beyond")}</span></div>
    </section>

    <section className="shop-category-strip wrap">
      {categories.map((category) => <a href={`${category.href}${category.href.includes("?") ? "&" : "?"}region=${market}`} key={category.labelFr} aria-label={say(category.labelFr, category.labelEn)}>
        <img src={category.image} alt={say(category.labelFr, category.labelEn)} />
      </a>)}
    </section>

    <section className="shop-world-grid wrap">
      {worlds.map((world) => <a className={world.className} href={`${world.href}${region}`} key={world.titleFr}>
        <div><h2>{say(world.titleFr, world.titleEn)}</h2><p>{say(world.textFr, world.textEn)}</p><span>{say("Découvrir", "Discover")} →</span></div>
        <img src={world.image} alt="" />
      </a>)}
    </section>

    <section className="shop-age wrap">
      <h2>{say("Magasiner par âge", "Shop by age")}</h2>
      <div>{[
        ["0–12 mois", "0–12 months", "🧸"], ["1–2 ans", "1–2 years", "🌈"], ["3–5 ans", "3–5 years", "🧩"],
        ["6–8 ans", "6–8 years", "🚗"], ["9–12 ans", "9–12 years", "🎨"], ["12 ans et +", "12 years +", "🎒"],
      ].map(([fr,en,icon]) => <a href={`/catalogue${region}`} key={fr}><b>{icon}</b><span>{say(fr,en)}</span></a>)}</div>
    </section>

    <section className="shop-seasonal wrap">
      <a href={`/articles-scolaires${region}`}><div><h2>{say("Préparez la rentrée scolaire!", "Get ready for school!")}</h2><p>{say("Sacs, fournitures et plus encore", "Bags, supplies and more")}</p><span>{say("Voir la sélection", "See the selection")} →</span></div><span aria-hidden="true">🎒 ✏️ 📚</span></a>
      <a href={`/promotions${region}`}><div><h2>{say("Des idées-cadeaux pour toutes les occasions", "Gift ideas for every occasion")}</h2><p>{say("Des jouets pour créer de beaux souvenirs", "Toys for beautiful memories")}</p><span>{say("Découvrir", "Discover")} →</span></div><span aria-hidden="true">🎁 🧸</span></a>
    </section>

    <section className="shop-brands wrap"><h2>{say("Nos grandes marques", "Our favourite brands")}</h2><a className="shop-brand-official-strip" href={`/catalogue${region}`} aria-label={say("Voir toutes nos grandes marques", "See all our major brands")}><img src="/brand-logos-content.png" alt="VTech, LEGO, Fisher-Price, Playmobil, Barbie, Hasbro, Marina & Pau et plus encore"/></a></section>
  </div>;
}
