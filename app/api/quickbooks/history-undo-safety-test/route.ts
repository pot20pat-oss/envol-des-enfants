import { currentAdmin, forbidden } from "@/lib/cms";
import {
  historyStockRisk,
  nonStockProductAssignments,
  type HistoryStockAction,
} from "@/lib/cms-history-stock-safety";

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  // All tests are pure and use invented data. No D1, CMS stock or Intuit calls.
  const base = {
    stock: 2,
    stock_qc: 10,
    stock_conakry: 2,
    name_fr: "Jouet fictif",
    description_fr: "Description initiale",
  };
  const safeAction: HistoryStockAction = {
    type: "product_update",
    before: { ...base },
    after: { ...base, description_fr: "Nouvelle description" },
  };
  const quantityChanged: HistoryStockAction = {
    type: "product_update",
    before: { ...base },
    after: { ...base, stock_conakry: 3 },
  };
  const missingSnapshots: HistoryStockAction = {
    type: "product_update",
    before: { ...base },
  };
  const deletion: HistoryStockAction = { type: "product_delete", before: { ...base } };
  const orderDelete: HistoryStockAction = { type: "order_delete", before: { id: "demo" } };
  const safeUndoAssignments = nonStockProductAssignments(
    safeAction.before!, "demo-only", "2026-10-09T00:00:00.000Z",
  );
  const forbiddenFields = ["stock", "stock_qc", "stock_conakry"];
  const checks = [
    {
      name: "description_change_allowed",
      passed: historyStockRisk(safeAction) === null,
    },
    {
      name: "quantity_change_blocked",
      passed: historyStockRisk(quantityChanged) !== null,
    },
    {
      name: "missing_snapshot_blocked",
      passed: historyStockRisk(missingSnapshots) !== null,
    },
    {
      name: "product_delete_blocked",
      passed: historyStockRisk(deletion) !== null,
    },
    {
      name: "order_delete_blocked",
      passed: historyStockRisk(orderDelete) !== null,
    },
    {
      name: "multi_step_with_inventory_change_blocked",
      passed: [safeAction, quantityChanged].some(
        (action) => historyStockRisk(action) !== null,
      ),
    },
    {
      name: "safe_undo_never_writes_inventory_fields",
      passed: forbiddenFields.every(
        (field) => safeUndoAssignments.every((assignment) => assignment.field !== field),
      ),
    },
    {
      name: "nonstock_description_still_writable",
      passed: safeUndoAssignments.some(
        (assignment) =>
          assignment.field === "description_fr" &&
          assignment.value === "Description initiale",
      ),
    },
  ];
  const allPassed = checks.every((check) => check.passed);
  return Response.json({
    verified: allPassed,
    read_only: true,
    uses_shared_history_guard: true,
    test_scope: "fictional_snapshots_only",
    tests_passed: checks.filter((check) => check.passed).length,
    tests_total: checks.length,
    tests: checks,
    stocks_modified: false,
    orders_modified: false,
    quickbooks_called: false,
    ready_for_bidirectional_stock_sync: false,
    note: "Ceci valide la logique pure de protection. Les interactions concurrentes et les flux réels exigent encore des tests isolés.",
  }, { status: allPassed ? 200 : 500, headers: HEADERS });
}
