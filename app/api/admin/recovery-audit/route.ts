import { cmsEnv, currentAdmin, forbidden, stringValue } from "@/lib/cms";

type SavedDeletion = {
  name_fr?: unknown;
  name_en?: unknown;
  product?: Record<string, unknown>;
  restored_at?: unknown;
};

function matchesQuery(product: Record<string, unknown>, query: string) {
  const needle = query.trim().toLocaleLowerCase("fr");
  if (!needle) return true;
  return [product.name_fr, product.name_en, product.brand, product.article_number]
    .some((value) => String(value || "").toLocaleLowerCase("fr").includes(needle));
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const database = cmsEnv().DB;
  const query = stringValue(new URL(request.url).searchParams.get("q"), "vtech");

  const current = await database
    .prepare("SELECT * FROM products ORDER BY updated_at DESC")
    .all<Record<string, unknown>>();

  const deletedRows = await database
    .prepare("SELECT key,value,updated_at FROM settings WHERE key LIKE 'deleted_product:%' ORDER BY updated_at DESC")
    .all<{key:string;value:string;updated_at:string}>();

  const deleted: Array<{key:string;updated_at:string;product:Record<string,unknown>}> = [];
  for (const row of deletedRows.results) {
    try {
      const parsed = JSON.parse(row.value) as SavedDeletion;
      if (parsed.restored_at) continue;
      const product = parsed.product && typeof parsed.product === "object" ? parsed.product : {};
      if (matchesQuery(product, query)) deleted.push({ key: row.key, updated_at: row.updated_at, product });
    } catch {}
  }

  return Response.json({
    query,
    current: current.results.filter((product) => matchesQuery(product, query)),
    deleted,
  });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const body = await request.json().catch(() => null) as {key?:unknown}|null;
  const key = stringValue(body?.key);
  if (!key.startsWith("deleted_product:")) return Response.json({error:"Clé de récupération invalide."},{status:400});

  const database = cmsEnv().DB;
  const row = await database.prepare("SELECT value FROM settings WHERE key=?").bind(key).first<{value:string}>();
  if (!row) return Response.json({error:"Sauvegarde supprimée introuvable."},{status:404});

  let product: Record<string, unknown>;
  try {
    const parsed = JSON.parse(row.value) as SavedDeletion;
    product = parsed.product && typeof parsed.product === "object" ? parsed.product : {};
  } catch {
    return Response.json({error:"Sauvegarde supprimée illisible."},{status:400});
  }

  const id = stringValue(product.id);
  if (!id) return Response.json({error:"La sauvegarde ne contient pas d’identifiant produit."},{status:400});
  const exists = await database.prepare("SELECT id FROM products WHERE id=?").bind(id).first();
  if (exists) return Response.json({error:"Ce produit existe déjà dans le catalogue."},{status:409});

  const article = stringValue(product.article_number);
  if (article) {
    const articleConflict = await database.prepare("SELECT id,name_fr FROM products WHERE article_number=?").bind(article).first<{id:string;name_fr:string}>();
    if (articleConflict) return Response.json({error:`Le no d’article ${article} est déjà utilisé par « ${articleConflict.name_fr} ».`},{status:409});
  }

  const schema = await database.prepare("PRAGMA table_info(products)").all<{name:string}>();
  const allowed = new Set(schema.results.map((column) => column.name));
  const columns = Object.keys(product).filter((column) => allowed.has(column));
  if (!columns.includes("id")) return Response.json({error:"Sauvegarde incompatible avec la table produits."},{status:400});

  const placeholders = columns.map(() => "?").join(",");
  const values = columns.map((column) => product[column] ?? null);
  await database.prepare(`INSERT INTO products (${columns.join(",")}) VALUES (${placeholders})`).bind(...values).run();

  const restoredAt = new Date().toISOString();
  await database.prepare("UPDATE settings SET value=?,updated_at=? WHERE key=?")
    .bind(JSON.stringify({name_fr:product.name_fr,name_en:product.name_en,product,restored_at:restoredAt}),restoredAt,key).run();

  return Response.json({success:true,id,article_number:article||null});
}
