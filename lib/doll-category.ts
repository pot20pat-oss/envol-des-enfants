type DollProduct = {
  id?: unknown;
  name_fr?: unknown;
  category?: unknown;
  brand?: unknown;
  image_url?: unknown;
};

export function categorizedMamaProduct<T extends DollProduct>(product: T): T {
  if (!String(product.id || "").startsWith("mama-")) return product;

  const category = String(product.category || "");
  const brand = String(product.brand || "");
  // L'image enregistrée dans le CMS est la source de vérité.
  // Ne jamais la remplacer ici par une ancienne image statique du dépôt.
  const correctedImage = product.image_url;

  if (category === "disney" || category === "barbie") return { ...product, image_url: correctedImage };

  let nextCategory = "autres_poupees";
  if (brand === "My Life As") nextCategory = "mylife";
  else if (brand === "Miraculous") nextCategory = "miraculous";
  else if (brand === "LOL Surprise" || brand === "LOL OMG") nextCategory = "lol";
  else if (brand === "Rainbow High" || brand === "Shadow High") nextCategory = "rainbowhigh";
  else if (brand === "Baby Alive") nextCategory = "babyalive";
  else if (brand === "Hairmazing") nextCategory = "hairmazing";
  else if (brand === "Karma's World") nextCategory = "karma";
  else if (brand === "My Sweet Baby") nextCategory = "mysweetbaby";
  else if (brand === "Glamour Girl") nextCategory = "glamourgirl";

  return { ...product, category: nextCategory, image_url: correctedImage };
}
