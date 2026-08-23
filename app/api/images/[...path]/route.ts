import { cmsEnv } from "@/lib/cms";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const key = path.join("/");
  if (!key.startsWith("products/") || key.includes("..")) return new Response("Introuvable", { status: 404 });
  const object = await cmsEnv().BUCKET.get(key);
  if (!object) return new Response("Introuvable", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  return new Response(object.body, { headers });
}
