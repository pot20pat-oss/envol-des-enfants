import { currentAdmin, forbidden } from "@/lib/cms";
import {
  eligibleDeliveredOrder,
  validReturnQuantity,
  canApproveReturnForResale,
  canRejectReturnAsNonResellable,
} from "@/lib/return-inspection-policy";

/**
 * Self-test of the EXACT pure rules called by /api/admin/returns.
 * No D1 access, stock adjustment, order mutation, payment, refund or QBO call.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  const pristine = {
    unused_confirmed: true,
    undamaged_confirmed: true,
    packaging_intact_confirmed: true,
  };
  const tests = [
    { name: "delivered_order_eligible", passed: eligibleDeliveredOrder("delivered") },
    { name: "preparing_order_ineligible", passed: !eligibleDeliveredOrder("preparing") },
    { name: "cancelled_order_ineligible", passed: !eligibleDeliveredOrder("cancelled") },
    { name: "new_pristine_product_can_be_approved",
      passed: canApproveReturnForResale(pristine) },
    { name: "used_product_never_resellable",
      passed: !canApproveReturnForResale({ ...pristine, unused_confirmed: false }) },
    { name: "damaged_product_never_resellable",
      passed: !canApproveReturnForResale({ ...pristine, undamaged_confirmed: false }) },
    { name: "broken_packaging_never_resellable",
      passed: !canApproveReturnForResale({ ...pristine, packaging_intact_confirmed: false }) },
    { name: "inspection_without_all_confirmations_blocked",
      passed: !canApproveReturnForResale({
        unused_confirmed: true, undamaged_confirmed: true,
        packaging_intact_confirmed: undefined,
      }) },
    { name: "single_return_within_order_limit",
      passed: validReturnQuantity(1, 2, 0) },
    { name: "duplicate_return_exceeding_original_order_blocked",
      passed: !validReturnQuantity(2, 2, 1) },
    { name: "return_quantity_must_be_positive_integer",
      passed: !validReturnQuantity(0, 2, 0) &&
        !validReturnQuantity(1.5, 2, 0) },
    { name: "rejection_requires_inspection_explanation",
      passed: canRejectReturnAsNonResellable("Abîmé") &&
        !canRejectReturnAsNonResellable(" ") },
  ];
  const passed = tests.filter((item) => item.passed).length;
  return Response.json({
    verified: passed === tests.length,
    read_only: true,
    test_scope: "fictional_returns_shared_policy",
    tests_passed: passed,
    tests_total: tests.length,
    tests,
    existing_orders_modified: false,
    products_stock_modified: false,
    returns_inserted: false,
    quickbooks_called: false,
    inventory_resale_automatically_enabled: false,
    ready_for_bidirectional_stock_sync: false,
  }, {
    status: passed === tests.length ? 200 : 500,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
