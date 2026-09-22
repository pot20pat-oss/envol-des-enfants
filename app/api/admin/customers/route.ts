import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  const regionParam = new URL(request.url).searchParams.get("region");
  const database = cmsEnv().DB;
  const { results } = regionParam
    ? await database.prepare(
        `SELECT c.id,c.email,c.name,c.phone,c.address,c.region,c.created_at,c.updated_at,
          COUNT(o.id) AS order_count, COALESCE(SUM(o.total),0) AS order_total
         FROM customers c
         LEFT JOIN orders o ON LOWER(o.customer_email)=LOWER(c.email) AND o.region=c.region
         WHERE c.region=?
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
      ).bind(normalizeMarket(regionParam)).all()
    : await database.prepare(
        `SELECT c.id,c.email,c.name,c.phone,c.address,c.region,c.created_at,c.updated_at,
          COUNT(o.id) AS order_count, COALESCE(SUM(o.total),0) AS order_total
         FROM customers c
         LEFT JOIN orders o ON LOWER(o.customer_email)=LOWER(c.email)
         GROUP BY c.id
         ORDER BY c.created_at DESC`,
      ).all();

  return Response.json({ customers: results });
}


export async function DELETE(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Client manquant." }, { status: 400 });
  const database = cmsEnv().DB;
  const customer = await database.prepare("SELECT id,email,region FROM customers WHERE id=?").bind(id).first();
  if (!customer) return Response.json({ error: "Client introuvable." }, { status: 404 });
  await database.prepare("DELETE FROM customers WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
