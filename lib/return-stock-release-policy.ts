/**
 * Pure, dry-run only safety policy for a future explicit returned-item release.
 * No inventory adjustment, D1 write, or QuickBooks API call is made here.
 */
export type StockReleaseCandidate = {
  id: unknown;
  region: unknown;
  quantity: unknown;
  inspection_state: unknown;
  unused_confirmed: unknown;
  undamaged_confirmed: unknown;
  packaging_intact_confirmed: unknown;
  inspected_by: unknown;
  inspected_at: unknown;
  stock_posted: unknown;
  product_exists: unknown;
  current_stock: unknown;
};

function confirmed(value: unknown): boolean {
  return value === 1 || value === true;
}
function notPosted(value: unknown): boolean {
  return value === 0 || value === false;
}

export function previewReturnedItemRelease(
  item: StockReleaseCandidate,
  explicitConfirmation: boolean,
) {
  const reasons: string[] = [];
  if (typeof item.id !== "string" || !item.id.trim()) {
    reasons.push("invalid_return");
  }
  if (item.region !== "qc" && item.region !== "conakry") {
    reasons.push("invalid_region");
  }
  if (!Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0 ||
      Number(item.quantity) > 99) {
    reasons.push("invalid_quantity");
  }
  if (item.inspection_state !== "approved_for_resale") {
    reasons.push("not_approved_for_resale");
  }
  if (!confirmed(item.unused_confirmed) ||
      !confirmed(item.undamaged_confirmed) ||
      !confirmed(item.packaging_intact_confirmed)) {
    reasons.push("inspection_conditions_missing");
  }
  if (typeof item.inspected_by !== "string" || !item.inspected_by.trim() ||
      typeof item.inspected_at !== "string" ||
      !Number.isFinite(Date.parse(item.inspected_at))) {
    reasons.push("inspection_identity_missing");
  }
  if (!notPosted(item.stock_posted)) {
    reasons.push("already_posted_or_invalid_state");
  }
  if (item.product_exists !== true) {
    reasons.push("product_not_found");
  }
  if (!Number.isSafeInteger(item.current_stock) || Number(item.current_stock) < 0) {
    reasons.push("current_stock_invalid");
  }
  if (explicitConfirmation !== true) {
    reasons.push("manual_release_confirmation_required");
  }

  const eligible = reasons.length === 0;
  const stockBefore = Number(item.current_stock);
  const quantity = Number(item.quantity);
  return {
    eligible,
    reasons,
    // Calculated plan ONLY; not a promise that live stock was changed.
    proposed_stock_before: eligible ? stockBefore : null,
    proposed_quantity_added: eligible ? quantity : 0,
    proposed_stock_after: eligible ? stockBefore + quantity : null,
    stock_change_performed: false,
    quickbooks_change_performed: false,
  };
}
