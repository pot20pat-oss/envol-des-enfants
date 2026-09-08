import { mamaProducts } from "./mama-products";
import archiveSupplementProductData from "../data/archive-supplement-products.json";
import defaultInlineProductData from "../data/default-products.json";
import referencePriceData from "../data/reference-prices.json";
import removedProductNameData from "../data/removed-product-names.json";

export type Translation = { fr: string; en: string };
export type Product = { id?: string; articleNumber?: string; name: Translation; category: string; price: number; ages: string; sheet: string; position: number; imageUrl?: string; extraImages?: string[]; stock?: number; status: "available" | "reserved" | "sold"; badge?: "new" | "school"; detail: Translation; priceConakry?: number; priceQc?: number; stockConakry?: number; stockQc?: number; visibleConakry?: boolean; visibleQc?: boolean; brand?: string };

export const removedProductNames: string[] = removedProductNameData as string[];

const referencePriceById = referencePriceData as Record<string, number>;

function verifiedReferencePrice(product: Product): number | undefined {
  if (product.id && referencePriceById[product.id]) return referencePriceById[product.id];
  if (/\/products\/barbie\/barbie-(?:0[2-9]|1[0-9]|20)\.webp$/.test(product.imageUrl || "")) return 150000;
  if (/\/products\/disney\/disney-(?:01|02)\.webp$/.test(product.imageUrl || "")) return 460000;
  if (/\/products\/disney\/disney-1[2-8]\.webp$/.test(product.imageUrl || "")) return 285000;
  if (/\/products\/nouveautes\/(?:chien-marcheur|licorne-marcheuse)\.webp$/.test(product.imageUrl || "")) return 320000;
  return undefined;
}

export const archiveSupplementProducts: Product[] = archiveSupplementProductData as Product[];

export const defaultProducts: Product[] = [
  ...mamaProducts,
  ...archiveSupplementProducts,
  ...(defaultInlineProductData as Product[]),
].filter((product) => Boolean(product.imageUrl)).map((product) => {
  const referencePrice = verifiedReferencePrice(product);
  return referencePrice === undefined ? product : { ...product, price: referencePrice, priceConakry: referencePrice };
});
