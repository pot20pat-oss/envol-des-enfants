import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

type PriceRow = {
  article_number: string | null;
  name_fr: string | null;
  price_qc: number | null;
  price_conakry: number | null;
  visible_qc: number | null;
  visible_conakry: number | null;
};

// Guard against spreadsheet formula injection even for quoted CSV values.
function cell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

/** Read-only CSV report. One row per visible product and market with an invalid stored price. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const headers = {
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const { results } = await cmsEnv().DB.prepare(
      "SELECT article_number,name_fr,price_qc,price_conakry,visible_qc,visible_conakry " +
      "FROM products ORDER BY article_number,name_fr",
    ).all<PriceRow>();
    const lines = [
      ["Boutique", "Devise", "Numéro d'article", "Nom du produit", "Prix D1", "État"].map(cell).join(";"),
    ];
    for (const row of results) {
      for (const [visible, price, region, currency] of [
        [row.visible_qc, row.price_qc, "Québec", "CAD"],
        [row.visible_conakry, row.price_conakry, "Conakry", "GNF"],
      ] as const) {
        if (Number(visible) !== 1) continue;
        if (price !== null && price !== undefined && Number.isFinite(Number(price)) && Number(price) > 0) continue;
        const state = price === null || price === undefined ? "Prix absent" : "Prix nul ou invalide";
        lines.push([region, currency, row.article_number ?? "", row.name_fr ?? "", price ?? "", state].map(cell).join(";"));
      }
    }
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
    return new Response(csv, {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="envol-produits-sans-prix.csv"',
      },
    });
  } catch {
    return Response.json({ error: "Rapport indisponible. Aucun prix modifié." }, {
      status: 502, headers,
    });
  }
}
