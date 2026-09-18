"use client";

import type { Market } from "@/lib/markets";

type Props = {
  market: Market;
  say: (french: string, english: string) => string;
};

const categories = [
  { labelFr: "Éveil 0–3 ans", labelEn: "Early years", image: "/products/archive-complements/bebe-peluche-rose.webp", href: "/bebe-enfants" },
  { labelFr: "Jouets éducatifs", labelEn: "Educational toys", image: "/products/mama3/mama3-01.jpg", href: "/jouets" },
  { labelFr: "Poupées", labelEn: "Dolls", image: "/products/barbie/barbie-01.webp", href: "/poupees" },
  { labelFr: "Princesses", labelEn: "Princesses", image: "/products/disney/disney-01.webp", href: "/poupees" },
  { labelFr: "Jeux & aventures", labelEn: "Games & adventures", image: "/products/archive-complements/camion-pompier-angle-2.webp", href: "/jouets" },
  { labelFr: "Véhicules", labelEn: "Vehicles", image: "/products/archive-complements/vtt-utv-rouge.webp", href: "/catalogue" },
  { labelFr: "Articles scolaires", labelEn: "School supplies", image: "/products/mama3/mama3-08.jpg", href: "/articles-scolaires" },
];

const worlds = [
  { className: "world-educational", titleFr: "Jouets éducatifs", titleEn: "Educational toys", textFr: "Stimuler leur curiosité dès le plus jeune âge", textEn: "Inspire curiosity from an early age", image: "/products/mama3/mama3-01.jpg", href: "/jouets" },
  { className: "world-dolls", titleFr: "Mon monde de poupées", titleEn: "My world of dolls", textFr: "Des poupées qui célèbrent toutes les histoires", textEn: "Dolls that celebrate every story", image: "/products/barbie/barbie-08.webp", href: "/poupees" },
  { className: "world-vehicles", titleFr: "Véhicules & aventures", titleEn: "Vehicles & adventures", textFr: "De grandes aventures les attendent", textEn: "Big adventures are waiting", image: "/products/archive-complements/vtt-utv-rouge.webp", href: "/catalogue" },
  { className: "world-princess", titleFr: "Princesses", titleEn: "Princesses", textFr: "Un univers pour rêver et créer", textEn: "A world made for dreaming", image: "/products/disney/disney-04.webp", href: "/poupees" },
];

const brandLogos = [
  { name: "VTech", src: "/brands/vtech-client.svg" },
  { name: "LEGO", src: "/brands/lego-client.svg" },
  { name: "Fisher-Price", src: "/brands/fisher-price-client.svg" },
  { name: "Playmobil", src: "/brands/playmobil-client.svg" },
  { name: "Barbie", src: "/brands/barbie-client.svg" },
  { name: "Hasbro", src: "/brands/hasbro-client.svg" },
  { name: "Marina & Pau", src: "/brands/marina-pau-client.svg" },
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
      {categories.map((category) => <a href={`${category.href}${region}`} key={category.labelFr}>
        <span><img src={category.image} alt="" /></span>
        <strong>{say(category.labelFr, category.labelEn)}</strong>
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

    <section className="shop-brands wrap"><h2>{say("Nos grandes marques", "Our favourite brands")}</h2><div className="shop-brand-vector-row">{brandLogos.map((brand)=><a href={`/catalogue${region}`} key={brand.name} aria-label={brand.name}><img src={brand.src} alt={brand.name}/></a>)}<a className="shop-brand-vector-more" href={`/catalogue${region}`}>{say("et plus encore!", "and many more!")}</a></div></section>
  </div>;
}
