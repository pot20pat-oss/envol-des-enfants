import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  if (!Array.isArray(data.products)) return Response.json({ error: "Catalogue à importer manquant." }, { status: 400 });

  const database = cmsEnv().DB;
  const existing = await database.prepare("SELECT name_fr FROM products").all<{ name_fr: string }>();
  const names = new Set(existing.results.map((product) => product.name_fr.trim().toLocaleLowerCase("fr")));
  const statements = [];
  const now = new Date().toISOString();

  for (const candidate of data.products.slice(0, 250)) {
    if (!candidate || typeof candidate !== "object") continue;
    const product = candidate as Record<string, unknown>;
    const name = product.name && typeof product.name === "object" ? product.name as Record<string, unknown> : {};
    const detail = product.detail && typeof product.detail === "object" ? product.detail as Record<string, unknown> : {};
    const frenchName = stringValue(name.fr).trim();
    if (!frenchName || names.has(frenchName.toLocaleLowerCase("fr"))) continue;
    names.add(frenchName.toLocaleLowerCase("fr"));

    statements.push(database.prepare("INSERT INTO products (id,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,material,dimensions,exchange_terms_fr,exchange_terms_en,visible,price_conakry,stock_conakry,visible_conakry,visible_qc,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), frenchName, stringValue(name.en), stringValue(detail.fr), stringValue(detail.en), stringValue(product.category, "eveil"), numberValue(product.price), product.status === "sold" ? 0 : 1, stringValue(product.status, "available"), stringValue(product.badge) || null, stringValue(product.ages, "3+"), stringValue(product.imageUrl) || null, stringValue(product.sheet) || null, numberValue(product.position), null, null, null, null, null, 1, numberValue(product.price), product.status === "sold" ? 0 : 1, 1, 0, now, now));
  }

  statements.push(database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("catalog_initialized", "true", now));
  await database.batch(statements);
  return Response.json({ imported: statements.length - 1, skipped: Math.min(data.products.length, 250) - statements.length + 1 });
}
