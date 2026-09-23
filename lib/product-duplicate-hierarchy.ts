/** Classification non bloquante pour la recherche de doublons du CMS.
 * La ressemblance visuelle reste globale : ces niveaux servent à ordonner,
 * jamais à exclure une paire dont la marque ou la catégorie sont erronées.
 */
export type DuplicateProductIdentity = {
  category?: unknown;
  brand?: unknown;
  name_fr?: unknown;
  name_en?: unknown;
  article_number?: unknown;
};

export function normalizeProductIdentity(value: unknown): string {
  return String(value ?? "").toLocaleLowerCase("fr").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const generic = new Set([
  "jouet", "jouets", "toy", "toys", "poupee", "poupees", "doll", "dolls",
  "enfant", "enfants", "children", "kids", "fille", "garcon", "girl", "boy",
  "produit", "product", "avec", "pour", "the", "and", "une", "des", "les",
]);

export type ProductHierarchy = {
  category: string;
  group: string;
  subgroup: string;
  family: string;
  variant: string;
};

export function productHierarchy(product: DuplicateProductIdentity): ProductHierarchy {
  const category = normalizeProductIdentity(product.category);
  const group = normalizeProductIdentity(product.brand);
  const name = normalizeProductIdentity(`${product.name_fr ?? ""} ${product.name_en ?? ""}`);
  const tokens = [...new Set(name.split(" ").filter(token => token.length > 2 && !generic.has(token)))];
  // La gamme et la famille sont des suggestions textuelles, pas des identités certifiées.
  const subgroup = tokens.slice(0, 2).join(" ");
  const family = tokens.slice(0, 4).join(" ");
  const variant = normalizeProductIdentity(product.article_number);
  return { category, group, subgroup, family, variant };
}

export function sharedHierarchyDepth(a: DuplicateProductIdentity, b: DuplicateProductIdentity): number {
  const left = productHierarchy(a), right = productHierarchy(b);
  if (!left.category || left.category !== right.category) return 0;
  if (!left.group || left.group !== right.group) return 1;
  if (!left.subgroup || left.subgroup !== right.subgroup) return 2;
  if (!left.family || left.family !== right.family) return 3;
  return 4;
}
