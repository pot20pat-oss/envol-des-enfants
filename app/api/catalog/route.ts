import { cmsEnv } from "@/lib/cms";

export async function GET() {
  try {
    const { results } = await cmsEnv().DB.prepare("SELECT * FROM products WHERE visible=1 ORDER BY updated_at DESC").all();
    const settings = await cmsEnv().DB.prepare("SELECT key,value FROM settings").all<{ key: string; value: string }>();
    const promotions = await cmsEnv().DB.prepare("SELECT * FROM promotions WHERE active=1 ORDER BY created_at DESC").all();
    return Response.json({ products: results, settings: Object.fromEntries(settings.results.map((entry) => [entry.key, entry.value])), promotions: promotions.results });
  } catch {
    return Response.json({ products: [], settings: {}, promotions: [] });
  }
}
