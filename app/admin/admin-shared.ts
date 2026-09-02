export type Row = Record<string, string | number | boolean | null>;

export type Section =
  | "dashboard"
  | "products"
  | "stock"
  | "orders"
  | "promotions"
  | "subscribers"
  | "editor"
  | "settings";

export const categories: Record<string, string> = {
  eveil: "Jouets éducatifs",
  poupees: "Mon monde de poupées et princesses",
  disney: "Disney · Poupées et princesses",
  barbie: "Barbie · Poupées et princesses",
  mylife: "My Life",
  miraculous: "Miraculous",
  lol: "LOL Surprise & OMG",
  rainbowhigh: "Rainbow High & Shadow High",
  babyalive: "Baby Alive",
  accessoires_poupees: "Accessoires pour poupées",
  autres_poupees: "Autres poupées",
  piscine: "Piscine & jeux d’eau",
  imitation: "Métiers & imitation",
  dinosaures: "Dinosaures & aventures",
  animaux: "Animaux & compagnons",
  bebe: "Bébé",
  vetements: "Vêtements",
  chaussures: "Chaussures",
  scolaire: "Articles scolaires",
  sacs: "Sacs et gourdes",
  vehicules: "Véhicules",
};

export const labels: Record<Section, string> = {
  dashboard: "Tableau de bord",
  products: "Produits",
  stock: "Stocks",
  orders: "Commandes",
  promotions: "Promotions",
  subscribers: "Abonnés",
  editor: "Éditeur du site",
  settings: "Réglages",
};

export const blankProduct: Row = {
  article_number: "", name_fr: "", name_en: "", description_fr: "", description_en: "",
  category: "eveil", price: 0, stock: 1, price_conakry: 0, price_qc: 0,
  stock_conakry: 1, stock_qc: 0, visible_conakry: true, visible_qc: false,
  alert_threshold: 2, featured: false, variants_json: "[]", images_json: "[]",
  status: "available", badge: "", ages: "3+", image_url: "", brand: "",
  material: "", dimensions: "", exchange_terms_fr: "", exchange_terms_en: "", visible: true,
};

export const orderLabels: Record<string, string> = {
  new: "Nouvelle", confirmed: "Confirmée", preparing: "En préparation",
  ready: "Prête", delivered: "Livrée", cancelled: "Annulée",
};

export async function request(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...options.headers },
  });
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Une erreur est survenue.");
  return result;
}
