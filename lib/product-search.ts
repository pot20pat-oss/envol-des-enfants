export type SearchableProduct = {
  name_fr?: unknown;
  name_en?: unknown;
  description_fr?: unknown;
  description_en?: unknown;
  article_number?: unknown;
  brand?: unknown;
  category?: unknown;
};

export function normalizeProductSearch(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const vehicleCategories = new Set([
  "vehicule","vehicules","voiture","voitures","auto","autos","camion","camions",
  "vtt","quad","quads","moto","motos","scooter","scooters","kart","karts",
  "velos","vehicules 12 24v","vehicules age","autonomie","accessoires vehicules","4 roues",
]);

const electricTerms = new Set(["electrique","electriques","electric","electrical"]);
const vehicleAliases: Record<string,string[]> = {
  vehicule:["vehicule","vehicules","voiture","voitures","auto","autos","camion","camions","vtt","quad","quads","moto","motos","scooter","scooters","kart","karts","4 roues"],
  vehicules:["vehicule","vehicules","voiture","voitures","auto","autos","camion","camions","vtt","quad","quads","moto","motos","scooter","scooters","kart","karts","4 roues"],
};

export function matchesProductSearch(product: SearchableProduct, rawQuery: unknown, categoryLabel = ""): boolean {
  const query = normalizeProductSearch(rawQuery);
  if (!query) return true;

  const fields = [
    product.article_number,
    product.name_fr,
    product.name_en,
    product.category,
    categoryLabel,
    product.brand,
    product.description_fr,
    product.description_en,
  ].map(normalizeProductSearch).filter(Boolean);

  const searchable = fields.join(" ");
  const searchableWords = new Set(searchable.split(" ").filter(Boolean));
  const queryWords = query.split(" ").filter(Boolean);

  const wantsVehicle = queryWords.some(word => vehicleCategories.has(word));
  const wantsElectric = queryWords.some(word => electricTerms.has(word));
  const isElectricVehicleQuery = wantsVehicle && wantsElectric;

  if (isElectricVehicleQuery) {
    const hasVehicleContext = queryWords.some(word => vehicleCategories.has(word))
      && fields.some(field => field.split(" ").some(word => vehicleCategories.has(word)))
      || /\\b(vehicules?|voitures?|motos?|vtt|quads?|scooters?|karts?|velos?|camions?)\\b/.test(searchable);
    const hasElectricContext = electricTerms.has(queryWords.find(word => electricTerms.has(word)) || "")
      && /\\b(electri|electric)[a-z0-9]*\\b/.test(searchable);
    return hasVehicleContext && hasElectricContext;
  }

  const aliases = queryWords.flatMap(word => vehicleAliases[word] || [word]);
  return aliases.every(term => {
    const normalizedTerm = normalizeProductSearch(term);
    if (!normalizedTerm) return true;
    if (normalizedTerm.includes(" ")) return searchable.includes(normalizedTerm);
    return Array.from(searchableWords).some(word => word === normalizedTerm || word.startsWith(normalizedTerm));
  });
}
