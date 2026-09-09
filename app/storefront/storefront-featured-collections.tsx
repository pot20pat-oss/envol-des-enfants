"use client";

import type { Product } from "@/lib/default-catalog";
import { marketPrice, type Market } from "@/lib/markets";
import type { StoreLanguage } from "../hooks/use-store-language";

type Say = (french: string, english: string) => string;

type Props = {
  products: Product[];
  language: StoreLanguage;
  market: Market;
  say: Say;
  onOpenProduct: (product: Product) => void;
};

export default function StorefrontFeaturedCollections({ products, language, market, say, onOpenProduct }: Props) {
  const collections = [
    {
      id: "nouveautes",
      eyebrow: say("Tout juste arrivés en boutique", "Freshly arrived in store"),
      title: say("Les nouveautés", "Our newest arrivals"),
      detail: say("Des découvertes à ne pas laisser filer.", "Little discoveries worth catching."),
      items: products.filter((item) => item.badge === "new").slice(0, 4),
    },
    {
      id: "rentree-scolaire",
      eyebrow: say("Les essentiels des petits écoliers", "Everything little learners need"),
      title: say("Une rentrée bien préparée", "Ready for school days"),
      detail: say("Cartables, fournitures et jolies trouvailles.", "Backpacks, supplies and thoughtful finds."),
      items: products.filter((item) => item.badge === "school").slice(0, 4),
    },
  ];

  return (
    <>
      {collections.filter((collection) => collection.items.length > 0).map((collection) => (
        <section className="featured-collection section wrap" id={collection.id} key={collection.id}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{collection.eyebrow}</p>
              <h2>{collection.id === "nouveautes" ? <>{say("Les ", "Our ")}<span>{say("nouveautés", "newest arrivals")}.</span></> : <>{collection.title}<span>.</span></>}</h2>
            </div>
            <p>{collection.detail}</p>
          </div>
          <div className="featured-grid">
            {collection.items.map((item) => (
              <a
                className="featured-card"
                href="#catalogue"
                key={item.id || `${collection.id}-${item.sheet}-${item.position}`}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenProduct(item);
                }}
                aria-label={say(`Voir ${item.name[language]} en grand`, `View ${item.name[language]} in detail`)}
              >
                <div
                  className="featured-visual"
                  style={{
                    backgroundImage: `url(${item.imageUrl || `/catalog-${item.sheet}.png`})`,
                    backgroundPosition: item.imageUrl ? "center top" : `${[0, 34, 67, 100][item.position]}% ${item.sheet === "17" ? "49%" : "15%"}`,
                    backgroundSize: item.imageUrl ? "contain" : undefined,
                  }}
                  role="img"
                  aria-label={item.name[language]}
                >
                  <span className={`availability availability-${item.status}`}>{item.status === "reserved" ? say("Réservé", "Reserved") : say("Disponible", "Available")}</span>
                </div>
                <div className="featured-copy">
                  <span>{item.badge === "new" ? say("Nouveauté", "New arrival") : say("Rentrée", "School days")}</span>
                  <h3>{item.name[language]}</h3>
                  <strong>{marketPrice(item.price, market, language)}</strong>
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
