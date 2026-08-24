import { body, cmsEnv, currentAdmin, forbidden, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = normalizeMarket(new URL(request.url).searchParams.get("region"));
  const { results } = await cmsEnv().DB.prepare("SELECT id,region,settings_json,created_at FROM site_versions WHERE region=? ORDER BY created_at DESC LIMIT 15").bind(region).all();
  return Response.json({ versions: results });
}

export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  const data = await body(request);
  const region = normalizeMarket(data.region);
  const content = stringValue(data.settings_json);
  if (!content || content.length > 150000) return Response.json({ error: "Version invalide." }, { status: 400 });
  await cmsEnv().DB.prepare("INSERT INTO site_versions (id,region,settings_json,admin_id,created_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), region, content, admin.id, new Date().toISOString()).run();
  return Response.json({ success: true });
}
