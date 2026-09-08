import type { Product } from "@/lib/default-catalog";
import { marketPrice, type Market } from "@/lib/markets";
import { WhatsAppIcon } from "./product-icons";

type Language = "fr" | "en";

type ProductCardProps = {
  item: Product;
  language: Language;
  market: Market;
  whatsappNumber: string;
  whatsappUrl: string;
  onOpen: (product: Product) => void;
};

export default function ProductCard({ item, language, market, whatsappNumber, whatsappUrl, onOpen }: ProductCardProps) {
  const isEnglish = language === "en";
  const say = (french: string, english: string) => isEnglish ? english : french;
  const price = marketPrice(item.price, market, language);

  return (
    <article
      className={`product-card ${item.status === "sold" ? "product-sold" : ""}`}
      onClick={(event) => {
        if ((event.target as Element).closest("a,button")) return;
        onOpen(item);
      }}
    >
      <div
        className="product-visual"
        style={{
          backgroundImage: `url(${item.imageUrl || `/catalog-${item.sheet}.png`})`,
          backgroundPosition: item.imageUrl ? "center top" : `${[0, 34, 67, 100][item.position]}% ${item.sheet === "17" ? "49%" : "15%"}`,
          backgroundSize: item.imageUrl ? "contain" : undefined,
        }}
        onClick={() => onOpen(item)}
        role="img"
        aria-label={item.name[language]}
      >
        <button
          type="button"
          className="product-zoom-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(item);
          }}
        >
          {say("Voir en grand", "View larger")}
        </button>
        <span className={`availability availability-${item.status}`}>
          {item.status === "available" ? say("Disponible", "Available") : item.status === "reserved" ? say("Réservé", "Reserved") : say("Vendu", "Sold")}
        </span>
      </div>

      <div className="product-details">
        {item.badge && <span className={`product-badge ${item.badge}`}>{item.badge === "new" ? say("Nouveauté", "New arrival") : say("Rentrée", "School days")}</span>}
        <h3>{item.name[language]}</h3>
        <p className="product-price">{price}</p>
        <p className="product-description">{item.detail[language]}</p>
        <span className="age-pill">{item.ages.includes("mois") ? item.ages.replace("mois", say("mois", "months")) : `${item.ages} ${say("ans", "yrs")}`}</span>
        {item.status === "sold" ? (
          <span className="product-unavailable">{say("Indisponible", "Unavailable")}</span>
        ) : whatsappNumber ? (
          <a
            className={`product-order${item.status === "reserved" ? " product-order-reserved" : ""}`}
            href={`${whatsappUrl}?text=${encodeURIComponent(
              isEnglish
                ? `Hello, I would like ${item.status === "reserved" ? "to know when this product is back" : "to order"}: ${item.name.en} (${price}).`
                : `Bonjour, je souhaite ${item.status === "reserved" ? "être averti du retour de" : "commander"} : ${item.name.fr} (${price}).`
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon />
            <span>{item.status === "reserved" ? say("Me prévenir", "Notify me") : "WhatsApp"}</span>
          </a>
        ) : (
          <span className="product-unavailable">{say("Nous contacter", "Contact us")}</span>
        )}
      </div>
    </article>
  );
}
