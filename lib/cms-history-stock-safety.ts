import { updateProductBindings } from "@/app/api/admin/products/product-input";

export type HistoryStockAction = {
  type?: string;
  table?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

const PRODUCT_UPDATE_FIELDS = [
  "name_fr", "name_en", "description_fr", "description_en", "category",
  "price", "stock", "status", "badge", "ages", "image_url", "image_sheet",
  "image_position", "brand", "material", "dimensions", "exchange_terms_fr",
  "exchange_terms_en", "visible", "price_qc", "price_conakry", "stock_qc",
  "stock_conakry", "visible_qc", "visible_conakry", "alert_threshold",
  "featured", "promo_price_qc", "promo_price_conakry",
  "variants_json", "images_json", "updated_at",
] as const;

const INVENTORY_FIELDS = new Set<string>(["stock", "stock_qc", "stock_conakry"]);

function validQuantity(snapshot: Record<string, unknown>, key: string): number | null {
  if (!Object.prototype.hasOwnProperty.call(snapshot, key)) return null;
  const n = Number(snapshot[key]);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function historyStockRisk(action: HistoryStockAction): string | null {
  if (!action.before) return "Données d'historique incomplètes.";
  if (action.type === "product_update") {
    if (!action.after) return "Sauvegarde après modification absente.";
    for (const field of ["stock_qc", "stock_conakry"]) {
      const before = validQuantity(action.before, field);
      const after = validQuantity(action.after, field);
      if (before === null || after === null) return "Quantités historiques manquantes.";
      if (before !== after) return "Cette action modifie un inventaire.";
    }
    return null;
  }
  if (action.type === "product_delete" || action.type === "order_delete" ||
    (action.type === "row_delete" &&
      (action.table === "orders" || action.table === "products"))) {
    return "La restauration ou suppression de cette entrée peut modifier l'inventaire.";
  }
  if (action.type === "row_delete" &&
    ["customers", "subscribers", "promotions"].includes(action.table ?? "")) {
    return null;
  }
  return "Type d'historique non vérifié.";
}

export function nonStockProductAssignments(
  target: Record<string, unknown>, id: string, now: string,
): Array<{ field: string; value: unknown }> {
  const bindings = updateProductBindings(target, id, now);
  if (bindings.length !== PRODUCT_UPDATE_FIELDS.length + 1) {
    throw new Error("Structure de produit inattendue : restauration annulée.");
  }
  return PRODUCT_UPDATE_FIELDS.map((field, index) => ({ field, value: bindings[index] }))
    .filter(({ field }) => !INVENTORY_FIELDS.has(field));
}
