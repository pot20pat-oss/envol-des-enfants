import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const schema = v.object({
  image_a: v.pipe(v.string(), v.trim(), v.minLength(1)),
  image_b: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

type NvidiaResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  detail?: unknown;
  message?: unknown;
};

const NVIDIA_MODEL = "meta/llama-3.2-11b-vision-instruct";
const NVIDIA_TIMEOUT_MS = 25_000;

function imageKey(imageUrl: string): string | null {
  const prefix = "/api/images/";
  if (!imageUrl.startsWith(prefix)) return null;
  const key = decodeURIComponent(imageUrl.slice(prefix.length));
  return key.startsWith("products/") && !key.includes("..") ? key : null;
}

function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function textContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map(part => part && typeof part === "object" && "text" in part ? String(part.text || "") : "").join("");
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const parsed = await validateJsonBody(request, schema);
  if (!parsed.success) return parsed.response;

  const runtime = cmsEnv();
  if (!runtime.NVIDIA_API_KEY) return Response.json({ error: "La clé NVIDIA n’est pas configurée." }, { status: 503 });

  const keyA = imageKey(parsed.data.image_a);
  const keyB = imageKey(parsed.data.image_b);
  if (!keyA || !keyB) return Response.json({ error: "Les deux images doivent provenir du CMS." }, { status: 400 });

  const [a, b] = await Promise.all([runtime.BUCKET.get(keyA), runtime.BUCKET.get(keyB)]);
  if (!a || !b) return Response.json({ error: "Une image à comparer est introuvable." }, { status: 404 });

  const [ab, bb] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  const imageA = `data:${a.httpMetadata?.contentType || "image/jpeg"};base64,${base64(ab)}`;
  const imageB = `data:${b.httpMetadata?.contentType || "image/jpeg"};base64,${base64(bb)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS);
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${runtime.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        temperature: 0,
        max_tokens: 180,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: 'Compare ces DEUX photos de produits. Décide si elles montrent le même produit exact, une variante distincte du même produit, ou des produits différents. Ignore les différences de cadrage, fond, compression et angle. Une couleur, taille, modèle, personnage, contenu ou référence différente compte comme variante ou produit différent, pas comme doublon exact. Réponds uniquement en JSON: {"verdict":"same"|"variant"|"different","confidence":0..1,"reason":"courte raison en français"}.' },
            { type: "image_url", image_url: { url: imageA } },
            { type: "image_url", image_url: { url: imageB } },
          ],
        }],
      }),
    });
    const result = await response.json() as NvidiaResponse;
    if (!response.ok) {
      const detail = typeof result.detail === "string" ? result.detail : typeof result.message === "string" ? result.message : "Comparaison NVIDIA impossible.";
      return Response.json({ error: detail }, { status: 502 });
    }
    const raw = textContent(result.choices?.[0]?.message?.content).replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const candidate = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1");
    const value = JSON.parse(candidate) as Record<string, unknown>;
    const verdict = value.verdict === "same" || value.verdict === "variant" || value.verdict === "different" ? value.verdict : null;
    if (!verdict) throw new Error("Verdict NVIDIA invalide.");
    const confidence = Math.max(0, Math.min(1, Number(value.confidence) || 0));
    return Response.json({ verdict, confidence, reason: String(value.reason || "") });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Comparaison NVIDIA impossible." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
