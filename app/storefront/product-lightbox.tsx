import { useState } from "react";
import type { Product } from "@/lib/default-catalog";
import { marketPrice, type Market } from "@/lib/markets";
import { WhatsAppIcon } from "./product-icons";

type Language = "fr" | "en";

type ProductLightboxProps = {
  product: Product;
  language: Language;
  market: Market;
  whatsappNumber: string;
  whatsappUrl: string;
  onClose: () => void;
};

export default function ProductLightbox({ product, language, market, whatsappNumber, whatsappUrl, onClose }: ProductLightboxProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isEnglish = language === "en";
  const say = (french: string, english: string) => isEnglish ? english : french;
  const images = [product.imageUrl || `/catalog-${product.sheet}.png`, ...(product.extraImages || [])];
  const currentImage = images[selectedImageIndex] || images[0];

  return (
    <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={product.name[language]} onClick={onClose}>
      <div className="product-lightbox-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="product-lightbox-close" aria-label={say("Fermer", "Close")} onClick={onClose}>×</button>

        <div className="product-lightbox-image">
          <img src={currentImage} alt={product.name[language]} />
          {images.length > 1 && (
            <div className="product-lightbox-thumbnails" aria-label={say("Photos du produit", "Product photos")}>
              {images.map((image, index) => (
                <button
                  type="button"
                  className={selectedImageIndex === index ? "active" : ""}
                  key={`${image}-${index}`}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`${say("Afficher la photo", "Show photo")} ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-lightbox-info">
          <p className="eyebrow">{say("Fiche article", "Product details")}</p>
          <h2>{product.name[language]}</h2>

          <div className="product-lightbox-meta">
            <div><span>{say("No de commande", "Order number")}</span><strong>{product.articleNumber || "—"}</strong></div>
            <div><span>{say("Catégorie", "Category")}</span><strong>{product.category}</strong></div>
            <div><span>{say("Âge", "Age")}</span><strong>{product.ages}</strong></div>
            <div>
              <span>{say("Disponibilité", "Availability")}</span>
              <strong>{product.status === "available" ? say("Disponible", "Available") : product.status === "reserved" ? say("Réservé", "Reserved") : say("Vendu", "Sold")}</strong>
            </div>
          </div>

          <p className="product-lightbox-price">{marketPrice(product.price, market, language)}</p>
          <p className="product-lightbox-description">{product.detail[language]}</p>

          {whatsappNumber && product.status !== "sold" && (
            <a
              className="button button-dark product-lightbox-order"
              href={`${whatsappUrl}?text=${encodeURIComponent(
                isEnglish
                  ? `Hello, I would like to order ${product.name.en}. Order no.: ${product.articleNumber || "N/A"}.`
                  : `Bonjour, je souhaite commander ${product.name.fr}. No de commande : ${product.articleNumber || "N/D"}.`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon />
              {say("Commander cet article", "Order this item")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
