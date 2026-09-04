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

/* Structure catalogue transmise par la cliente. Les anciennes clés utiles sont conservées
   pour que les produits existants restent classés et modifiables sans perte de données. */
export const categories: Record<string, string> = {
  bebe: "1. Bébé & petite enfance",
  eveil_bebe: "1.1 Éveil & jouets bébé",
  bain_soins: "1.2 Bain & soins",
  repas_bebe: "1.3 Repas",
  vetements_bebe: "1.4 Vêtements bébé",
  chaussures_bebe: "1.5 Chaussures bébé",
  accessoires_bebe: "1.6 Accessoires bébé",

  eveil: "2. Jouets éducatifs",
  montessori: "2.1 Montessori",
  langage_lecture: "2.2 Langage & lecture",
  mathematiques: "2.3 Mathématiques",
  sciences: "2.4 Sciences",
  memoire_logique: "2.5 Mémoire & logique",
  motricite_fine: "2.6 Motricité fine",
  educatif_age: "2.7 Par âge",

  imitation: "3. Jeux d’imitation",
  maisons_poupees: "3.1 Maisons de poupées",
  cuisines: "3.2 Cuisines",
  marchande: "3.3 Marchande",
  metiers: "3.4 Métiers",
  maison_menage: "3.5 Maison & ménage",
  poupons_soins: "3.6 Poupons & soins",

  poupees: "4. Mon Monde de Poupée",
  poupees_bebe: "4.1 Poupées bébé",
  poupees_ethniques: "4.2 Poupées ethniques",
  poupees_cheveux: "4.3 Poupées à cheveux",
  vetements_poupees: "4.4 Vêtements de poupées",
  accessoires_poupees: "4.5 Accessoires de poupées",
  mobilier_poupees: "4.6 Mobilier de poupées",
  disney: "4.7 Disney · Poupées et accessoires",
  barbie: "4.8 Barbie · Poupées et accessoires",
  mylife: "4.9 My Life · Poupées et accessoires",
  miraculous: "4.10 Miraculous · Poupées et accessoires",
  lol: "4.11 LOL Surprise & OMG · Poupées et accessoires",
  rainbowhigh: "4.12 Rainbow High & Shadow High · Poupées et accessoires",
  babyalive: "4.13 Baby Alive · Poupées et accessoires",
  hairmazing: "4.14 Hairmazing · Poupées et accessoires",
  karma: "4.15 Karma’s World · Poupées et accessoires",
  mysweetbaby: "4.16 My Sweet Baby · Poupées et accessoires",
  glamourgirl: "4.17 Glamour Girl · Poupées et accessoires",
  autres_poupees: "4.18 Autres poupées et accessoires",

  figurines: "5. Figurines & personnages",
  animaux: "5.1 Animaux",
  dinosaures: "5.2 Dinosaures",
  super_heros: "5.3 Super-héros",
  robots: "5.4 Robots",
  figurines_action: "5.5 Figurines d’action",
  personnages_fantastiques: "5.6 Personnages fantastiques",

  construction: "6. Construction & assemblage",
  lego: "6.1 LEGO",
  blocs: "6.2 Blocs",
  construction_magnetique: "6.3 Construction magnétique",
  assemblage: "6.4 Assemblage",
  circuits: "6.5 Circuits",
  maquettes: "6.6 Maquettes",

  jeux_societe: "7. Jeux de société",
  jeux_cartes: "7.1 Jeux de cartes",
  jeux_memoire: "7.2 Mémoire",
  jeux_strategie: "7.3 Stratégie",
  jeux_logique: "7.4 Logique",
  jeux_familiaux: "7.5 Jeux familiaux",
  jeux_2_joueurs: "7.6 Jeux 2 joueurs",
  jeux_societe_age: "7.7 Par âge",

  creativite: "8. Créativité & loisirs créatifs",
  dessin: "8.1 Dessin",
  coloriage: "8.2 Coloriage",
  peinture: "8.3 Peinture",
  pate_modeler: "8.4 Pâte à modeler",
  perles: "8.5 Perles",
  loisirs_creatifs: "8.6 Loisirs créatifs",

  activites_exterieures: "9. Activités extérieures",
  piscine: "9.1 Piscines & accessoires",
  jeux_eau: "9.2 Jeux d’eau",
  jeux_plage: "9.3 Jeux de plage",
  jeux_sportifs: "9.4 Jeux sportifs",
  plein_air: "9.5 Jeux de plein air",
  bouees_flotteurs: "9.6 Bouées & flotteurs",

  vehicules: "10. Véhicules électriques",
  voitures_electriques: "10.1 Voitures électriques",
  motos_electriques: "10.2 Motos électriques",
  velos: "10.3 Vélos",
  vehicules_12_24v: "10.4 12V / 24V",
  vehicules_age: "10.5 Par âge",
  autonomie: "10.6 Autonomie",
  accessoires_vehicules: "10.7 Accessoires",

  scolaire: "11. École & fournitures scolaires",
  sacs: "11.1 Sacs",
  primaire: "11.2 Primaire",
  college_lycee: "11.3 Collège / lycée",
  gourdes: "11.4 Gourdes",
  cahiers: "11.5 Cahiers",
  ecriture: "11.6 Écriture",
  geometrie: "11.7 Géométrie",
  boites_lunch: "11.8 Boîtes à lunch",
  papeterie: "11.9 Papeterie",

  deguisements: "12. Déguisements",
  deguisements_princesses: "12.1 Princesses",
  deguisements_super_heros: "12.2 Super-héros",
  deguisements_metiers: "12.3 Métiers",
  deguisements_animaux: "12.4 Animaux",
  deguisements_personnages: "12.5 Personnages",
  accessoires_deguisement: "12.6 Accessoires",
  fetes_occasions: "12.7 Fêtes & occasions",

  vetements: "13. Vêtements, chaussures & accessoires enfants",
  vetements_filles: "13.1 Vêtements filles",
  vetements_garcons: "13.2 Vêtements garçons",
  chaussures: "13.3 Chaussures",
  barrettes: "13.4 Barrettes",
  pinces: "13.5 Pinces",
  chouchous: "13.6 Chouchous",
  bandeaux: "13.7 Bandeaux",
  serre_tetes: "13.8 Serre-têtes",
  sacs_accessoires: "13.9 Sacs & accessoires",

  soldes: "14. SOLDES",
  promotions_produits: "14.1 Tous les produits en promotion",
  reduction: "14.2 Pourcentage de réduction",
  prix_promo: "14.3 Prix",
  fin_serie: "14.4 Fin de série",
  offres_speciales: "14.5 Offres spéciales",
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
