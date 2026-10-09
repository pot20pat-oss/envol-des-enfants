import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import {
  previewReturnedItemRelease,
  type StockReleaseCandidate,
} from "@/lib/return-stock-release-policy";

type ReturnRow = {
  id: string;
  region: "qc" | "conakry";
  quantity: number;
  inspection_state: string;
  unused_confirmed: number;
  undamaged_confirmed: number;
  packaging_intact_confirmed: number;
  inspected_by: string | null;
  inspected_at: string | null;
  stock_posted: number;
  product_id: string;
  mapped_product_id: string | null;
  stock_qc: number | null;
  stock_conakry: number | null;
};

function testCandidate(): StockReleaseCandidate {
  return {
    id: "fictional-return-only",
    region: "conakry",
    quantity: 1,
    inspection_state: "approved_for_resale",
    unused_confirmed: 1,
    undamaged_confirmed: 1,
    packaging_intact_confirmed: 1,
    inspected_by: "fictional-inspector",
    inspected_at: "2026-10-09T12:00:00.000Z",
    stock_posted: 0,
    product_exists: true,
    current_stock: 2,
  };
}

function selfTests() {
  const sample = testCandidate();
  const proposed = previewReturnedItemRelease(sample, true);
  const tests = [
    { name: "explicit_confirmation_required",
      passed: !previewReturnedItemRelease(sample, false).eligible },
    { name: "qualified_return_preview_only",
      passed: proposed.eligible && proposed.proposed_stock_after === 3 &&
        !proposed.stock_change_performed && !proposed.quickbooks_change_performed },
    { name: "used_item_blocked",
      passed: !previewReturnedItemRelease({ ...sample, unused_confirmed: 0 }, true).eligible },
    { name: "damaged_item_blocked",
      passed: !previewReturnedItemRelease({ ...sample, undamaged_confirmed: 0 }, true).eligible },
    { name: "damaged_packaging_blocked",
      passed: !previewReturnedItemRelease({ ...sample, packaging_intact_confirmed: 0 }, true).eligible },
    { name: "not_inspected_blocked",
      passed: !previewReturnedItemRelease({ ...sample, inspection_state: "awaiting_inspection" }, true).eligible },
    { name: "already_posted_blocked",
      passed: !previewReturnedItemRelease({ ...sample, stock_posted: 1 }, true).eligible },
    { name: "missing_inspector_blocked",
      passed: !previewReturnedItemRelease({ ...sample, inspected_by: null }, true).eligible },
    { name: "product_missing_blocked",
      passed: !previewReturnedItemRelease({ ...sample, product_exists: false }, true).eligible },
    { name: "invalid_quantity_blocked",
      passed: !previewReturnedItemRelease({ ...sample, quantity: -1 }, true).eligible },
    { name: "negative_stock_blocked",
      passed: !previewReturnedItemRelease({ ...sample, current_stock: -1 }, true).eligible },
    { name: "wrong_region_blocked",
      passed: !previewReturnedItemRelease({ ...sample, region: "unknown" }, true).eligible },
  ];
  return {
    tests,
    total: tests.length,
    passed: tests.filter((test) => test.passed).length,
  };
}

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

/**
 * Read-only current candidate summary, plus fictional safety tests.
 * A confirmation in this simulation is ONLY a hypothetical input to the
 * pure policy function; there is no POST route or production stock release.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = normalizeMarket(new URL(request.url).searchParams.get("region"));
  const suite = selfTests();
  try {
    const db = cmsEnv().DB;
    const { results } = await db.prepare(
      "SELECT r.id,r.region,r.quantity,r.inspection_state," +
      "r.unused_confirmed,r.undamaged_confirmed,r.packaging_intact_confirmed," +
      "r.inspected_by,r.inspected_at,r.stock_posted,r.product_id," +
      "p.id AS mapped_product_id,p.stock_qc,p.stock_conakry " +
      "FROM order_returns r LEFT JOIN products p ON p.id=r.product_id " +
      "WHERE r.region=? ORDER BY r.created_at DESC LIMIT 100",
    ).bind(region).all<ReturnRow>();

    const candidates = results.map((row) => {
      const currentStock = row.region === "qc" ? row.stock_qc : row.stock_conakry;
      const data: StockReleaseCandidate = {
        id: row.id,
        region: row.region,
        quantity: row.quantity,
        inspection_state: row.inspection_state,
        unused_confirmed: row.unused_confirmed,
        undamaged_confirmed: row.undamaged_confirmed,
        packaging_intact_confirmed: row.packaging_intact_confirmed,
        inspected_by: row.inspected_by,
        inspected_at: row.inspected_at,
        stock_posted: row.stock_posted,
        product_exists: Boolean(row.mapped_product_id),
        current_stock: currentStock,
      };
      const possibleAfterConfirmation = previewReturnedItemRelease(data, true);
      return {
        return_id: row.id,
        product_id: row.product_id,
        region: row.region,
        inspection_state: row.inspection_state,
        already_posted: row.stock_posted === 1,
        quantity: row.quantity,
        eligible_if_manually_confirmed: possibleAfterConfirmation.eligible,
        reasons_if_ineligible: possibleAfterConfirmation.reasons,
        hypothetical_stock_before: possibleAfterConfirmation.proposed_stock_before,
        hypothetical_stock_after: possibleAfterConfirmation.proposed_stock_after,
      };
    });

    return Response.json({
      verified: suite.passed === suite.total,
      environment: cmsEnv().QUICKBOOKS_MODE === "sandbox" ? "sandbox" : "not_sandbox",
      read_only: true,
      region,
      return_records_inspected: candidates.length,
      ready_for_manual_release_if_confirmed: candidates.filter((r) => r.eligible_if_manually_confirmed).length,
      live_candidates: candidates,
      fictional_simulation: {
        tests_passed: suite.passed,
        tests_total: suite.total,
        tests: suite.tests,
      },
      cms_stock_modified: false,
      quickbooks_modified: false,
      refunds_issued: false,
      release_endpoint_active: false,
      ready_for_bidirectional_stock_sync: false,
    }, { status: suite.passed === suite.total ? 200 : 500, headers: HEADERS });
  } catch {
    return Response.json({
      verified: false,
      read_only: true,
      error: "Aperçu des retours indisponible; aucun stock modifié.",
    }, { status: 503, headers: HEADERS });
  }
}
