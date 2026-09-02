type DollProduct = {
  id?: unknown;
  name_fr?: unknown;
  category?: unknown;
  brand?: unknown;
};

export function categorizedMamaProduct<T extends DollProduct>(product: T): T {
  if (!String(product.id || "").startsWith("mama-")) return product;

  const category = String(product.category || "");
  const brand = String(product.brand || "");
  const name = String(product.name_fr || "");

  if (category === "disney" || category === "barbie") return product;

  let nextCategory = "autres_poupees";
  if (brand === "My Life As") nextCategory = "mylife";
  else if (brand === "Miraculous") nextCategory = "miraculous";
  else if (brand === "LOL Surprise" || brand === "LOL OMG") nextCategory = "lol";
  else if (brand === "Rainbow High" || brand === "Shadow High") nextCategory = "rainbowhigh";
  else if (brand === "Baby Alive") nextCategory = "babyalive";
  else if (/accessoires|ensemble de bain|ensemble coiffure|ensemble épicerie/i.test(name)) nextCategory = "accessoires_poupees";

  return { ...product, category: nextCategory };
}
