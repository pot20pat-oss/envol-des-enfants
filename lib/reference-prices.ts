const pricesById: Record<string, number> = {
  "mama-05": 485000, "mama-06": 321000, "mama-13": 600000, "mama-14": 485000,
  "mama-16": 460000, "mama-22": 485000, "mama-23": 1199800, "mama-28": 485000,
  "mama-33": 725000, "mama-36": 485000, "mama-39": 485000, "mama-40": 1199800,
  "mama-41": 600000, "mama-43": 600000, "mama-44": 1199800, "mama-50": 485000,
  "mama-51": 460000, "mama-62": 400000,
};

export function verifiedConakryPrice(product: Record<string, unknown>): number | undefined {
  const id = String(product.id || "");
  const imageUrl = String(product.image_url || product.imageUrl || "");
  if (pricesById[id]) return pricesById[id];
  if (/\/products\/barbie\/barbie-(?:0[2-9]|1[0-9]|20)\.webp$/.test(imageUrl)) return 150000;
  if (/\/products\/disney\/disney-(?:01|02)\.webp$/.test(imageUrl)) return 460000;
  if (/\/products\/disney\/disney-1[2-8]\.webp$/.test(imageUrl)) return 285000;
  return undefined;
}

export function withVerifiedConakryPrice<T extends Record<string, unknown>>(product: T): T {
  if (Number(product.price_conakry || 0) > 0) return product;
  const price = verifiedConakryPrice(product);
  return price === undefined ? product : { ...product, price, price_conakry: price };
}
