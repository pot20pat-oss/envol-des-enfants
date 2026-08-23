import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) return Response.json({ error: "Sélectionnez une image valide." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Image trop volumineuse : maximum 8 Mo." }, { status: 400 });
  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const key = `products/${crypto.randomUUID()}.${extension}`;
  await cmsEnv().BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return Response.json({ url: `/api/images/${key}`, key });
}
