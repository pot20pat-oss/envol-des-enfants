import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = new URL(request.url).searchParams.get("region");
  const { results } = region === "qc" || region === "conakry" ? await cmsEnv().DB.prepare("SELECT * FROM promotions WHERE region=? OR region='both' ORDER BY created_at DESC").bind(region).all() : await cmsEnv().DB.prepare("SELECT * FROM promotions ORDER BY created_at DESC").all();
  return Response.json({ promotions: results });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const id = stringValue(data.id) || crypto.randomUUID();
  const title = stringValue(data.title_fr);
  if (!title) return Response.json({ error: "Le titre de la promotion est obligatoire." }, { status: 400 });
  const existing = await cmsEnv().DB.prepare("SELECT id FROM promotions WHERE id = ?").bind(id).first();
  const region = data.region === "qc" || data.region === "conakry" ? data.region : "both";
  const type = data.discount_type === "amount" ? "amount" : "percent";
  if (existing) {
    await cmsEnv().DB.prepare("UPDATE promotions SET title_fr=?,title_en=?,description_fr=?,description_en=?,discount_percent=?,active=?,starts_at=?,ends_at=?,region=?,promo_code=?,discount_type=?,discount_amount=?,minimum_purchase=?,usage_limit=? WHERE id=?")
      .bind(title, stringValue(data.title_en), stringValue(data.description_fr), stringValue(data.description_en), Math.min(100, numberValue(data.discount_percent)), data.active === false || data.active === 0 ? 0 : 1, stringValue(data.starts_at) || null, stringValue(data.ends_at) || null, region, stringValue(data.promo_code).toUpperCase() || null, type, numberValue(data.discount_amount), numberValue(data.minimum_purchase), numberValue(data.usage_limit) || null, id).run();
  } else {
    await cmsEnv().DB.prepare("INSERT INTO promotions (id,title_fr,title_en,description_fr,description_en,discount_percent,active,starts_at,ends_at,region,promo_code,discount_type,discount_amount,minimum_purchase,usage_limit,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, title, stringValue(data.title_en), stringValue(data.description_fr), stringValue(data.description_en), Math.min(100, numberValue(data.discount_percent)), data.active === false ? 0 : 1, stringValue(data.starts_at) || null, stringValue(data.ends_at) || null, region, stringValue(data.promo_code).toUpperCase() || null, type, numberValue(data.discount_amount), numberValue(data.minimum_purchase), numberValue(data.usage_limit) || null, new Date().toISOString()).run();
  }
  return Response.json({ id });
}

export async function DELETE(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Promotion manquante." }, { status: 400 });
  await cmsEnv().DB.prepare("DELETE FROM promotions WHERE id = ?").bind(id).run();
  return Response.json({ success: true });
}
