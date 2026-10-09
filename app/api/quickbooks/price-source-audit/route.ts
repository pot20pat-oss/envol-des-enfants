import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { verifiedConakryPrice } from "@/lib/reference-prices";

/** Admin-only, read-only: distinguishes stored D1 prices from CMS display fallbacks. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  try {
    const { results } = await cmsEnv().DB.prepare(
      "SELECT id,article_number,name_fr,image_url,price_qc,price_conakry,visible_qc,visible_conakry FROM products",
    ).all<Record<string, unknown>>();
    const summary = {
      qc: { visible: 0, stored_positive: 0, stored_nonpositive: 0 },
      conakry: {
        visible: 0, stored_positive: 0, stored_nonpositive: 0,
        fallback_available: 0, no_fallback: 0,
      },
    };
    for (const product of results) {
      if (Number(product.visible_qc) === 1) {
        summary.qc.visible++;
        if (Number(product.price_qc) > 0) summary.qc.stored_positive++;
        else summary.qc.stored_nonpositive++;
      }
      if (Number(product.visible_conakry) === 1) {
        summary.conakry.visible++;
        if (Number(product.price_conakry) > 0) {
          summary.conakry.stored_positive++;
        } else {
          summary.conakry.stored_nonpositive++;
          const fallback = verifiedConakryPrice(product);
          if (typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0) {
            summary.conakry.fallback_available++;
          } else {
            summary.conakry.no_fallback++;
          }
        }
      }
    }
    return Response.json({
      verified: true,
      read_only: true,
      database_writes: false,
      currency: { qc: "CAD", conakry: "GNF" },
      summary,
      note: "Reference prices shown by CMS are not necessarily persisted as price_conakry in D1. No prices were changed.",
    }, { headers });
  } catch {
    return Response.json({ verified: false, read_only: true, error: "Audit des sources de prix indisponible." }, {
      status: 502, headers,
    });
  }
}
