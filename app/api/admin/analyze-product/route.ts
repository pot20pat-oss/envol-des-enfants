import * as v from "valibot";

import { categories } from "@/app/admin/admin-shared";
import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const analyzeSchema = v.object({
  image_url: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

type NvidiaResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  detail?: unknown;
  message?: unknown;
};

type ProductSuggestion = {
  name_fr: string;
  name_en: string;
  description_fr: string;
  description_en: string;
  category: string;
  brand: string;
  ages: string;
  confidence: number;
};

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

function responseText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => part && typeof part === "object" && "text" in part ? String(part.text || "") : "")
    .join("");
}

function parseSuggestion(content: string): ProductSuggestion | null {
  const cleaned=content.replace(/```(?:json)?/gi,"").replace(/```/g,"").trim();
  const candidate = cleaned.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const category = typeof parsed.category === "string" && parsed.category in categories
      ? parsed.category
      : "eveil";
    const confidence = Number(parsed.confidence);
    return {
      name_fr: typeof parsed.name_fr === "string" ? parsed.name_fr.trim() : "",
      name_en: typeof parsed.name_en === "string" ? parsed.name_en.trim() : "",
      description_fr: typeof parsed.description_fr === "string" ? parsed.description_fr.trim() : "",
      description_en: typeof parsed.description_en === "string" ? parsed.description_en.trim() : "",
      category,
      brand: typeof parsed.brand === "string" ? parsed.brand.trim() : "",
      ages: typeof parsed.ages === "string" ? parsed.ages.trim() : "3+",
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  const parsed = await validateJsonBody(request, analyzeSchema);
  if (!parsed.success) return parsed.response;

  const runtime = cmsEnv();
  if (!runtime.NVIDIA_API_KEY) {
    return Response.json({ error: "La clé NVIDIA n’est pas configurée dans Cloudflare." }, { status: 503 });
  }

  const key = imageKey(parsed.data.image_url);
  if (!key) {
    return Response.json({ error: "Téléversez d’abord une photo du produit dans le CMS." }, { status: 400 });
  }

  const object = await runtime.BUCKET.get(key);
  if (!object) return Response.json({ error: "La photo du produit est introuvable." }, { status: 404 });

  const contentType = object.httpMetadata?.contentType || "image/jpeg";
  const image = `data:${contentType};base64,${arrayBufferToBase64(await object.arrayBuffer())}`;
  const categoryList = Object.entries(categories)
    .map(([value, label]) => `${value}: ${label}`)
    .join("\n");

  const nvidiaResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: runtime.NVIDIA_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct",
      temperature: 0,
      max_tokens: 520,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Tu es un expert en identification VISUELLE de jouets. Travaille uniquement à partir des pixels de l'image jointe.

IMPORTANT:
- Ignore tout nom, description, catégorie ou métadonnée qui pourrait être associé au fichier ou au produit.
- Identifie d'abord ce que l'objet EST visuellement. Ne déduis pas son usage à partir d'une ressemblance approximative.
- Distingue la forme du jouet de sa fonction. Exemple: un jouet d'éveil en forme de camion n'est pas automatiquement un camion à ordures, un camion-benne ou un véhicule de chantier.
- N'affirme jamais une fonction (ramassage des déchets, benne basculante, musique, électronique, etc.) si elle n'est pas clairement démontrée par l'image.
- Décris les éléments réellement visibles: forme, couleurs, boutons, balles, pièces manipulables, personnages, roues, etc.
- Si le sous-type exact est incertain, utilise un nom générique exact plutôt qu'une identification spécifique inventée.
- N'invente pas de marque si elle n'est pas lisible.
- Les descriptions doivent être factuelles, sobres et commerciales, sans caractéristiques incertaines.

Choisis obligatoirement une seule clé de catégorie dans la liste ci-dessous.
Réponds uniquement avec un objet JSON valide contenant exactement: name_fr, name_en, description_fr, description_en, category, brand, ages, confidence.
confidence doit être entre 0 et 1 et doit refléter la certitude VISUELLE de l'identification.

CATÉGORIES AUTORISÉES:
${categoryList}`,
          },
          { type: "image_url", image_url: { url: image } },
        ],
      }],
    }),
  });

  const result = await nvidiaResponse.json() as NvidiaResponse;
  if (!nvidiaResponse.ok) {
    const detail = typeof result.detail === "string" ? result.detail : typeof result.message === "string" ? result.message : "Analyse NVIDIA impossible.";
    return Response.json({ error: detail }, { status: 502 });
  }

  const suggestion = parseSuggestion(responseText(result.choices?.[0]?.message?.content));
  if (!suggestion) return Response.json({ error: "NVIDIA n’a pas retourné une fiche produit JSON exploitable. Réessayez l’analyse." }, { status: 502 });

  return Response.json({ suggestion });
}
