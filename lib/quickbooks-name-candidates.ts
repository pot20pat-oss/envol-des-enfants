/**
 * Browser-only candidate discovery for a QuickBooks CSV export.
 * Names are evidence for HUMAN review, not product identity.
 * No automatic mappings, accounting entries or stock adjustments.
 */
export type ReconciliationItem = {
  name: string;
  sku: string;
  stock: string;
  type: string;
  itemId: string;
  rowNumber: number;
};
export type NameCandidate = ReconciliationItem & {
  score: number;
  reason: "exact_name" | "similar_name";
  caution: string;
};

const STOP = new Set([
  "DE","DES","DU","D","LE","LA","LES","L","UN","UNE","ET",
  "POUR","AVEC","EN","A","AU","AUX","SUR","SOUS","THE","AND","OF",
  "JOUET","JOUETS","JEU","JEUX","ENFANT","ENFANTS","AGE","AGES",
  "ANS","AN","PCS","PC","PIECES","PIECE",
]);
const COLORS = new Set([
  "BLEU","BLEUE","BLEUS","BLEUES","ROSE","ROSES","ROUGE","ROUGES","VERT",
  "VERTE","VERTS","VERTES","JAUNE","JAUNES","NOIR","NOIRE","NOIRS",
  "NOIRES","BLANC","BLANCHE","BLANCS","BLANCHES","GRIS","GRISE",
  "ORANGE","VIOLET","VIOLETTE","MAUVE","MARRON","BEIGE","DORÉ","DORE",
]);
const standard = (text: unknown) => String(text ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleUpperCase("fr")
  .replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");

function tokens(name: string): string[] {
  return [...new Set(standard(name).split(" ").filter(
    part => part.length >= 2 && !STOP.has(part),
  ))];
}
const numbers = (name: string): string[] => tokens(name)
  .filter(part => /[0-9]/.test(part));
const colors = (name: string): string[] => tokens(name)
  .filter(part => COLORS.has(part));

/**
 * Concrete product kinds. Franchise names (e.g. Paw Patrol / Barbie) are NOT
 * product types: a watch must not match a plate or cap of the same brand.
 *
 * This whitelist is intentionally conservative. Unknown categories continue
 * to use the stricter similarity threshold; they are never auto-approved.
 */
const PRODUCT_KINDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["watch", ["MONTRE","MONTRES","BRACELET MONTRE","REVEIL","REVEILS"]],
  ["plate", ["ASSIETTE","ASSIETTES"]],
  ["cap", ["CASQUETTE","CASQUETTES","CHAPEAU","CHAPEAUX"]],
  ["dress", ["ROBE","ROBES"]],
  ["doll", ["POUPEE","POUPEES","POUPON","POUPONS"]],
  ["float", ["BOUEE","BOUEES","FLOTTEUR","FLOTTEURS"]],
  ["armbands", ["BRASSARD","BRASSARDS","MANCHETTE","MANCHETTES"]],
  ["headband", ["BANDEAU","BANDEAUX","SERRE TETE","SERRE TETES"]],
  ["swim_goggles", ["LUNETTES DE NATATION","LUNETTES DE PISCINE"]],
  ["ball", ["BALLON","BALLONS","BALLE","BALLES"]],
  ["bag", ["SAC","SACS","SAC A DOS"]],
  ["bottle", ["GOURDE","GOURDES","BOUTEILLE","BOUTEILLES"]],
  ["puzzle", ["PUZZLE","PUZZLES"]],
  ["car", ["VOITURE","VOITURES","AUTO","AUTOS"]],
  ["bike", ["VELO","VELOS","BICYCLETTE","BICYCLETTES"]],
  ["stroller", ["POUSSETTE","POUSSETTES"]],
  ["book", ["LIVRE","LIVRES","ALBUM","ALBUMS"]],
  ["shoes", ["CHAUSSURE","CHAUSSURES","SANDALE","SANDALES","BASKET","BASKETS"]],
  ["shirt", ["T SHIRT","TSHIRT","TEE SHIRT","CHANDAIL","CHANDAILS"]],
  ["swimsuit", ["MAILLOT","MAILLOTS","MAILLOT DE BAIN"]],
  ["swimming_pool", ["PISCINE","PISCINES"]],
  ["train", ["TRAIN","TRAINS","LOCOMOTIVE","LOCOMOTIVES"]],
  ["truck", ["CAMION","CAMIONS"]],
  ["figurine", ["FIGURINE","FIGURINES"]],
  ["bath_set", ["SET DE BAIN","SET BAIN","ENSEMBLE DE BAIN"]],
];
function recognizedKinds(name: string): Set<string> {
  const words = " " + standard(name) + " ";
  const kinds = new Set<string>();
  for (const [kind, variants] of PRODUCT_KINDS) {
    if (variants.some(variant => words.includes(" " + variant + " "))) kinds.add(kind);
  }
  return kinds;
}
function incompatibleProductKind(left: string, right: string): boolean {
  const a = recognizedKinds(left);
  const b = recognizedKinds(right);
  // If a concrete kind is present in either name, it must be present in
  // BOTH; otherwise brand-only overlap could create false associations.
  if (!a.size && !b.size) return false;
  if (!a.size || !b.size) return true;
  return ![...a].some(kind => b.has(kind));
}

function misleadingVariant(a: string, b: string): boolean {
  // Never suggest different numerical model numbers or colors as equivalent.
  const an = numbers(a), bn = numbers(b);
  if (an.length && bn.length && !an.some(x => bn.includes(x))) return true;
  const ac = colors(a), bc = colors(b);
  if (ac.length && bc.length && !ac.some(x => bc.includes(x))) return true;
  return false;
}
const isStock = (type: string) => {
  const value = standard(type);
  return ["STOCK", "INVENTORY", "INVENTAIRE", "PRODUIT EN STOCK"].includes(value);
};

/**
 * An inverted index limits candidates per CMS product rather than scanning
 * thousands of CSV rows for every comparison.
 */
export function createNameCandidateSearch(rows: ReconciliationItem[]) {
  const index = new Map<string, Set<number>>();
  const exact = new Map<string, number[]>();
  const terms = rows.map(item => tokens(item.name));
  rows.forEach((row, i) => {
    const key = standard(row.name);
    if (key.length >= 5) exact.set(key, [...(exact.get(key) || []), i]);
    for (const term of terms[i]) {
      const set = index.get(term) || new Set<number>();
      set.add(i); index.set(term, set);
    }
  });

  return (cmsName: string, limit = 3): NameCandidate[] => {
    const name = standard(cmsName);
    const query = tokens(cmsName);
    if (name.length < 5 || !query.length) return [];
    const ids = new Set<number>(exact.get(name) || []);
    for (const term of query) {
      if (term.length < 3) continue;
      // Uninformative generic terms must not explode candidate lists.
      const matches = index.get(term);
      if (matches && matches.size <= 500) for (const i of matches) ids.add(i);
    }

    const candidates: NameCandidate[] = [];
    for (const id of ids) {
      const row = rows[id];
      if (!row || !row.name) continue;
      const matchExact = standard(row.name) === name;
      if (!matchExact && (misleadingVariant(cmsName, row.name) ||
        incompatibleProductKind(cmsName, row.name))) continue;
      const left = new Set(query);
      const right = new Set(terms[id]);
      const common = [...left].filter(token => right.has(token));
      // One generic token is insufficient to suggest a distinct toy model.
      if (!matchExact && common.length < 2) continue;
      const coverage = common.length / left.size;
      const precision = common.length / Math.max(right.size, 1);
      const similarity = (coverage * 0.6 + precision * 0.4);
      const score = matchExact ? 100 : Math.round(similarity * 100);
      if (!matchExact && (coverage < 0.6 || precision < 0.4 || score < 65)) continue;
      candidates.push({
        ...row,
        score,
        reason: matchExact ? "exact_name" : "similar_name",
        caution: isStock(row.type)
          ? "Vérifier la photo, les variantes, l'UGS et la boutique"
          : "Type QuickBooks absent ou non Stock : vérifier avant toute association",
      });
    }
    return candidates.sort((a, b) =>
      b.score - a.score ||
      Number(isStock(b.type)) - Number(isStock(a.type)) ||
      a.rowNumber - b.rowNumber,
    ).slice(0, Math.max(0, Math.min(limit, 5)));
  };
}
