/** Canonicalise une paire de produits pour les verdicts D1. */
export function canonicalDuplicatePair(a: unknown, b: unknown) {
  if (typeof a !== "string" || typeof b !== "string") return null;
  const left = a.trim(), right = b.trim();
  if (!left || !right || left === right || left.length > 128 || right.length > 128) return null;
  const [first, second] = [left, right].sort();
  return { first, second, key: JSON.stringify([first, second]) };
}
