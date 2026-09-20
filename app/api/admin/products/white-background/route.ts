import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const schema = v.object({
  id: v.pipe(v.string(), v.trim(), v.minLength(1)),
  image_url: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

function imageKey(imageUrl: string): string | null {
  const prefix = "/api/images/";
  if (!imageUrl.startsWith(prefix)) return null;
  const key = decodeURIComponent(imageUrl.slice(prefix.length));
  return key.startsWith("products/") && !key.includes("..") ? key : null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const parsed = await validateJsonBody(request, schema);
  if (!parsed.success) return parsed.response;

  const runtime = cmsEnv();
  if (!runtime.NVIDIA_API_KEY) {
    return Response.json({ error: "La clé NVIDIA n’est pas configurée dans Cloudflare." }, { status: 503 });
  }

  const sourceKey = imageKey(parsed.data.image_url);
  if (!sourceKey) return Response.json({ error: "Cette photo doit d’abord être téléversée dans le CMS." }, { status: 400 });
  const object = await runtime.BUCKET.get(sourceKey);
  if (!object) return Response.json({ error: "La photo originale est introuvable." }, { status: 404 });

  const contentType = object.httpMetadata?.contentType || "image/jpeg";
  const source = `data:${contentType};base64,${arrayBufferToBase64(await object.arrayBuffer())}`;

  // NVIDIA's configured vision chat model can inspect images, but it does not
  // return edited image pixels. Use NVIDIA's image-edit endpoint only when a
  // compatible model has explicitly been configured.
  const model = (runtime as typeof runtime & { NVIDIA_IMAGE_EDIT_MODEL?: string }).NVIDIA_IMAGE_EDIT_MODEL;
  if (!model) {
    return Response.json({
      error: "La correction est prête dans le CMS, mais aucun modèle NVIDIA d’édition d’image n’est configuré. Configure NVIDIA_IMAGE_EDIT_MODEL avant de remplacer une photo.",
    }, { status: 503 });
  }

  const response = await fetch("https://integrate.api.nvidia.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${runtime.NVIDIA_API_KEY}` },
    body: (() => {
      const form = new FormData();
      form.set("model", model);
      form.set("prompt", "Keep the photographed product exactly unchanged. Remove only the existing background and replace it with a pure solid white #FFFFFF studio background. Preserve product shape, labels, colors, proportions, transparent parts and fine edges. No new objects, no shadows outside the product.");
      form.set("image", new Blob([Uint8Array.from(atob(source.split(",")[1]), c => c.charCodeAt(0))], { type: contentType }), "product");
      return form;
    })(),
  });

  const result = await response.json() as { data?: Array<{ b64_json?: string }>; error?: { message?: string }; message?: string };
  if (!response.ok || !result.data?.[0]?.b64_json) {
    return Response.json({ error: result.error?.message || result.message || "Le service d’édition NVIDIA n’a pas retourné d’image." }, { status: 502 });
  }

  const bytes = Uint8Array.from(atob(result.data[0].b64_json), c => c.charCodeAt(0));
  const key = `products/white-${parsed.data.id}-${crypto.randomUUID()}.png`;
  await runtime.BUCKET.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
  return Response.json({ url: `/api/images/${key}`, key });
}
