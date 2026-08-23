import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const { results } = await cmsEnv().DB.prepare("SELECT * FROM products ORDER BY updated_at DESC").all();
  return Response.json({ products: results });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const name = stringValue(data.name_fr);
  const category = stringValue(data.category);
  if (!name || !category) return Response.json({ error: "Le nom français et la catégorie sont obligatoires." }, { status: 400 });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await cmsEnv().DB.prepare("INSERT INTO products (id,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,material,dimensions,exchange_terms_fr,exchange_terms_en,visible,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(id, name, stringValue(data.name_en), stringValue(data.description_fr), stringValue(data.description_en), category, numberValue(data.price), numberValue(data.stock, 1), stringValue(data.status, "available"), stringValue(data.badge) || null, stringValue(data.ages, "3+"), stringValue(data.image_url) || null, stringValue(data.image_sheet) || null, numberValue(data.image_position), stringValue(data.brand) || null, stringValue(data.material) || null, stringValue(data.dimensions) || null, stringValue(data.exchange_terms_fr) || null, stringValue(data.exchange_terms_en) || null, data.visible === false ? 0 : 1, now, now).run();
  return Response.json({ id }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const id = stringValue(data.id);
  if (!id || !stringValue(data.name_fr)) return Response.json({ error: "Produit incomplet." }, { status: 400 });
  await cmsEnv().DB.prepare("UPDATE products SET name_fr=?,name_en=?,description_fr=?,description_en=?,category=?,price=?,stock=?,status=?,badge=?,ages=?,image_url=?,image_sheet=?,image_position=?,brand=?,material=?,dimensions=?,exchange_terms_fr=?,exchange_terms_en=?,visible=?,updated_at=? WHERE id=?")
    .bind(stringValue(data.name_fr), stringValue(data.name_en), stringValue(data.description_fr), stringValue(data.description_en), stringValue(data.category), numberValue(data.price), numberValue(data.stock), stringValue(data.status, "available"), stringValue(data.badge) || null, stringValue(data.ages, "3+"), stringValue(data.image_url) || null, stringValue(data.image_sheet) || null, numberValue(data.image_position), stringValue(data.brand) || null, stringValue(data.material) || null, stringValue(data.dimensions) || null, stringValue(data.exchange_terms_fr) || null, stringValue(data.exchange_terms_en) || null, data.visible === false || data.visible === 0 ? 0 : 1, new Date().toISOString(), id).run();
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Produit manquant." }, { status: 400 });
  await cmsEnv().DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return Response.json({ success: true });
}
