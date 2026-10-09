/**
 * Return policy for both stores. Evaluations are pure and do not update stock,
 * orders, accounting records, refunds or the returns register.
 */
export type InspectionChecks = {
  unused_confirmed: unknown;
  undamaged_confirmed: unknown;
  packaging_intact_confirmed: unknown;
};

export function eligibleDeliveredOrder(status: unknown): boolean {
  return status === "delivered";
}

export function validReturnQuantity(
  requested: unknown, originallyOrdered: unknown, alreadyReturned: unknown,
): boolean {
  return [requested, originallyOrdered, alreadyReturned].every(
    (value) => typeof value === "number" && Number.isSafeInteger(value),
  ) && Number(requested) > 0 && Number(requested) <= 99 &&
    Number(originallyOrdered) >= Number(requested) &&
    Number(alreadyReturned) >= 0 &&
    Number(alreadyReturned) + Number(requested) <= Number(originallyOrdered);
}

export function canApproveReturnForResale(checks: InspectionChecks): boolean {
  return checks.unused_confirmed === true &&
    checks.undamaged_confirmed === true &&
    checks.packaging_intact_confirmed === true;
}

export function canRejectReturnAsNonResellable(notes: unknown): boolean {
  return typeof notes === "string" && notes.trim().length >= 3;
}
