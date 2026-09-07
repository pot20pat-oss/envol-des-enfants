const CATEGORY_PREFIXES: Record<string, string> = {
  bebe: "BEB",
  eveil_bebe: "EVB",
  bain_soins: "BAI",
  repas_bebe: "REP",
  vetements_bebe: "VBB",
  chaussures_bebe: "CHB",
  accessoires_bebe: "ACB",

  eveil: "EVE",
  montessori: "MON",
  langage_lecture: "LAN",
  mathematiques: "MAT",
  sciences: "SCI",
  memoire_logique: "MEM",
  motricite_fine: "MOT",
  educatif_age: "EDA",

  imitation: "IMI",
  maisons_poupees: "MAI",
  cuisines: "CUI",
  marchande: "MAR",
  metiers: "MET",
  maison_menage: "MEN",
  poupons_soins: "PPS",

  poupees: "POU",
  poupees_bebe: "PBB",
  poupees_ethniques: "PET",
  poupees_cheveux: "PCH",
  vetements_poupees: "VPO",
  accessoires_poupees: "APO",
  mobilier_poupees: "MPO",
  disney: "DIS",
  princesses: "DIS",
  barbie: "BAR",
  mylife: "MYL",
  miraculous: "MIR",
  lol: "LOL",
  rainbowhigh: "RBH",
  babyalive: "BYA",
  hairmazing: "HAI",
  karma: "KAR",
  mysweetbaby: "MSB",
  glamourgirl: "GLA",
  autres_poupees: "AUP",

  figurines: "FIG",
  animaux: "ANI",
  dinosaures: "DIN",
  super_heros: "SUP",
  robots: "ROB",
  figurines_action: "FAC",
  personnages_fantastiques: "PFA",

  construction: "CON",
  lego: "LEG",
  blocs: "BLO",
  construction_magnetique: "CMG",
  assemblage: "ASS",
  circuits: "CIR",
  maquettes: "MAQ",

  jeux_societe: "JDS",
  jeux_cartes: "JCA",
  jeux_memoire: "JME",
  jeux_strategie: "JST",
  jeux_logique: "JLO",
  jeux_familiaux: "JFA",
  jeux_2_joueurs: "J2J",
  jeux_societe_age: "JSA",

  creativite: "CRE",
  dessin: "DES",
  coloriage: "COL",
  peinture: "PEI",
  pate_modeler: "PAM",
  perles: "PER",
  loisirs_creatifs: "LCR",

  activites_exterieures: "EXT",
  piscine: "PIS",
  jeux_eau: "EAU",
  jeux_plage: "PLA",
  jeux_sportifs: "SPO",
  plein_air: "PLE",
  bouees_flotteurs: "BOU",

  vehicules: "VEH",
  voitures_electriques: "VOI",
  motos_electriques: "MOT",
  velos: "VEL",
  vehicules_12_24v: "V24",
  vehicules_age: "VAG",
  autonomie: "AUT",
  accessoires_vehicules: "AVE",

  scolaire: "SCO",
  sacs: "SAC",
  primaire: "PRI",
  college_lycee: "COL",
  gourdes: "GOU",
  cahiers: "CAH",
  ecriture: "ECR",
  geometrie: "GEO",
  boites_lunch: "LUN",
  papeterie: "PAP",

  deguisements: "DEG",
  deguisements_princesses: "DPR",
  deguisements_super_heros: "DSH",
  deguisements_metiers: "DME",
  deguisements_animaux: "DAN",
  deguisements_personnages: "DPE",
  accessoires_deguisement: "ADE",
  fetes_occasions: "FET",

  vetements: "VET",
  vetements_filles: "VFI",
  vetements_garcons: "VGA",
  chaussures: "CHA",
  barrettes: "BAR",
  pinces: "PIN",
  chouchous: "CHO",
  bandeaux: "BAN",
  serre_tetes: "SER",
  sacs_accessoires: "SAA",

  soldes: "SOL",
  promotions_produits: "PRO",
  reduction: "RED",
  prix_promo: "PRX",
  fin_serie: "FIN",
  offres_speciales: "OFF",
};

export function articlePrefix(category: string) {
  const key = String(category || "").trim().toLowerCase();
  if (CATEGORY_PREFIXES[key]) return CATEGORY_PREFIXES[key];

  const normalized = key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .toUpperCase();

  return (normalized.slice(0, 3) || "ART").padEnd(3, "X");
}

export async function createArticleNumberGenerator(database: D1Database) {
  const result = await database.prepare(
    "SELECT category, article_number FROM products WHERE article_number IS NOT NULL AND TRIM(article_number) <> ''",
  ).all<{ category: string; article_number: string }>();

  const maxByPrefix = new Map<string, number>();

  for (const product of result.results || []) {
    const prefix = articlePrefix(product.category);
    const match = String(product.article_number || "").trim().toUpperCase().match(/^([A-Z0-9]{3})-?(\d{1,6})$/);
    if (!match || match[1] !== prefix) continue;

    const number = Number(match[2]);
    if (!Number.isFinite(number)) continue;
    maxByPrefix.set(prefix, Math.max(maxByPrefix.get(prefix) || 0, number));
  }

  return (category: string) => {
    const prefix = articlePrefix(category);
    const next = (maxByPrefix.get(prefix) || 0) + 1;
    maxByPrefix.set(prefix, next);
    return `${prefix}-${String(next).padStart(4, "0")}`;
  };
}
