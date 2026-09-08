import type { Product } from "./default-catalog";
import { categorizedMamaProduct } from "./doll-category";
import mamaProductData from "../data/mama-products.json";

type MamaItem = [string, string, string, string, string?];

const items: MamaItem[] = mamaProductData as MamaItem[];

export const mamaProducts: Product[] = items.map(([fr, en, category, brand], index) => categorizedMamaProduct({
  id: `mama-${String(index + 1).padStart(2, "0")}`,
  name_fr: fr,
  name: { fr, en },
  category,
  brand,
  price: 0,
  priceConakry: 0,
  priceQc: 0,
  stockConakry: 1,
  stockQc: 1,
  visibleConakry: true,
  visibleQc: true,
  ages: "3+",
  sheet: "",
  position: 0,
  imageUrl: index === 15 ? "/products/poupees-mama/mama-16.jpg" : `/products/poupees-mama/mama-${String(index + 1).padStart(2, "0")}.webp`,
  status: "available",
  badge: "new",
  detail: {
    fr: category === "disney" ? "Poupée ou accessoire de princesse Disney." : "Poupée ou accessoire pour enrichir les histoires et le jeu imaginatif.",
    en: category === "disney" ? "Disney princess doll or accessory." : "Doll or accessory for imaginative storytelling and play.",
  },
}));
