import referencePrices from "../data/reference-prices.json";

const pricesById: Record<string, number> = referencePrices.pricesById;
const imagePriceRules = referencePrices.imagePriceRules;

export function verifiedConakryPrice(product: Record<string, unknown>): number | undefined {
  const id = String(product.id || "");
  const imageUrl = String(product.image_url || product.imageUrl || "");
  if (pricesById[id]) return pricesById[id];
  for (const rule of imagePriceRules) {
    if (new RegExp(rule.pattern).test(imageUrl)) return rule.price;
  }
  return undefined;
}

export function withVerifiedConakryPrice<T extends Record<string, unknown>>(product: T): T {
  if (Number(product.price_conakry || 0) > 0) return product;
  const price = verifiedConakryPrice(product);
  return price === undefined ? product : { ...product, price, price_conakry: price };
}
