import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const { results } = await cmsEnv().DB.prepare("SELECT * FROM subscribers ORDER BY created_at DESC").all();
  return Response.json({ subscribers: results });
}
