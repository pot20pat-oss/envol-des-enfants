import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

const HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

type Snapshot = Record<string, unknown>;
type HistoryAction = {
  type?: string;
  table?: string;
  state?: string;
  before?: Snapshot;
  after?: Snapshot;
};

function numberOrUnknown(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classify(action: HistoryAction): string {
  if (!action.before || !action.type) return "requires_review";
  if (action.type === "product_update") {
    if (!action.after) return "requires_review";
    const marketStockColumns = ["stock_qc", "stock_conakry"];
    for (const col of marketStockColumns) {
      const before = numberOrUnknown(action.before[col]);
      const after = numberOrUnknown(action.after[col]);
      if (before === null || after === null) return "requires_review";
      if (before !== after) return "stock_related";
    }
    return "no_stock_change_in_snapshot";
  }
  if (action.type === "product_delete" ||
      action.type === "order_delete" ||
      (action.type === "row_delete" &&
        (action.table === "products" || action.table === "orders"))) {
    return "stock_related";
  }
  if (action.type === "row_delete" &&
      ["customers", "subscribers", "promotions"].includes(action.table ?? "")) {
    return "no_stock_change_in_snapshot";
  }
  return "requires_review";
}

/**
 * Read-only diagnostic of the 20 most recent CMS undo/redo records.
 * It identifies potentially stock-affecting history actions, but does not
 * inspect or change any real stock, create accounting entries, or replay actions.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  try {
    const runtime = cmsEnv();
    const { results } = await runtime.DB.prepare(
      "SELECT key,value FROM settings WHERE key LIKE 'cms_undo:%' " +
      "ORDER BY updated_at DESC,key DESC LIMIT 20",
    ).all<{ key: string; value: string }>();
    const summary = {
      stock_related: 0,
      requires_review: 0,
      no_stock_change_in_snapshot: 0,
      unreadable_records: 0,
    };
    const actions = results.map((row) => {
      try {
        const decoded = JSON.parse(row.value) as HistoryAction;
        const risk = classify(decoded);
        summary[risk as keyof typeof summary] += 1;
        return {
          history_key: row.key,
          type: decoded.type ?? "unknown",
          state: decoded.state ?? "applied",
          classification: risk,
        };
      } catch {
        summary.unreadable_records += 1;
        return { history_key: row.key, type: "unreadable", classification: "unreadable_records" };
      }
    });

    return Response.json({
      verified: true,
      environment: runtime.QUICKBOOKS_MODE === "sandbox" ? "sandbox" : "not_sandbox",
      read_only: true,
      action_count: actions.length,
      summary,
      actions,
      inventory_changes_performed: false,
      quickbooks_calls_performed: false,
      history_stock_actions_safe_for_bidirectional_sync: false,
      caveat: "Une action sans variation historique connue peut tout de meme etre dangereuse si le stock actuel a change entretemps.",
      next_step: "Preparer une protection transactionnelle du Undo/Redo avant de permettre les operations d'inventaire bidirectionnelles.",
    }, { headers: HEADERS });
  } catch {
    return Response.json({
      verified: false,
      read_only: true,
      error: "Audit de l'historique indisponible. Aucune modification effectuee.",
    }, { status: 502, headers: HEADERS });
  }
}
