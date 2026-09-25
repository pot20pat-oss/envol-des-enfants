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
    .map((part) =>
      part && typeof part === "object" && "text" in part
        ? String(part.text || "")
        : ""
    )
    .join("");
}

function parseSuggestion(content: string): ProductSuggestion | null {
  const cleaned = content
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const candidate = cleaned.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;

    const category =
      typeof parsed.category === "string" && parsed.category in categories
        ? parsed.category
        : "eveil";

    const confidence = Number(parsed.confidence);

    return {
      name_fr:
        typeof parsed.name_fr === "string" ? parsed.name_fr.trim() : "",
      name_en:
        typeof parsed.name_en === "string" ? parsed.name_en.trim() : "",
      description_fr:
        typeof parsed.description_fr === "string"
          ? parsed.description_fr.trim()
          : "",
      description_en:
        typeof parsed.description_en === "string"
          ? parsed.description_en.trim()
          : "",
      category,
      brand: typeof parsed.brand === "string" ? parsed.brand.trim() : "",
      ages:
        typeof parsed.ages === "string" && parsed.ages.trim()
          ? parsed.ages.trim()
          : "3+",
      confidence: Number.isFinite(confidence)
        ? Math.min(1, Math.max(0, confidence))
        : 0,
    };
  } catch {
    return null;
  }
}

async function callNvidia(
  apiKey: string,
  model: string,
  image: string,
  categoryList: string,
): Promise<ProductSuggestion | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);

  try {
    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 360,
          response_format: { type: "json_object" },

          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyse VISUELLEMENT ce produit pour une boutique de jouets.

OBJECTIF:
Identifier rapidement et précisément le produit à partir de la photo.

RÈGLES:
- Utilise uniquement ce qui est réellement visible sur la photo.
- Identifie d'abord le TYPE DE PRODUIT réellement vendu.
- Le texte visible sur l'emballage peut servir à identifier la marque, la licence, le personnage ou le nom du produit.
- NE RECOPIE JAMAIS le texte marketing, une histoire, un résumé, des dialogues ou des phrases imprimées sur le produit dans les descriptions.
- NE RÉSUME JAMAIS l'histoire d'un personnage, d'un film, d'un livre ou d'une licence.
- N'invente jamais une marque, une fonction, un personnage, une matière ou une caractéristique.
- Si le modèle exact est incertain, utilise un nom générique précis.
- name_fr doit obligatoirement être en FRANÇAIS.
- name_en doit obligatoirement être en ANGLAIS.
- description_fr doit obligatoirement être rédigée en FRANÇAIS.
- description_en doit obligatoirement être rédigée en ANGLAIS.
- Les deux descriptions doivent décrire LE PRODUIT À VENDRE et non son histoire ou son personnage.
- Description FR: 1 ou 2 phrases courtes de fiche e-commerce.
- Description EN: traduction naturelle et fidèle de la description FR, en 1 ou 2 phrases.
- Pour un livre, cahier, ensemble créatif ou article scolaire: décris le type d'article, le thème/licence et l'activité visible. Ne raconte jamais le contenu de l'histoire.
- Pour un jouet: décris uniquement le type de jouet et les éléments/fonctions clairement visibles.
- Si une caractéristique n'est pas visible ou certaine, omets-la.
- L'âge doit rester prudent si l'emballage ne l'indique pas clairement.
- confidence doit refléter la certitude réelle de l'identification.

EXEMPLE IMPORTANT:
Si l'image montre un livre de dessin Disney Princess avec du texte racontant l'histoire de Cendrillon:
- BON: "Livre de dessin Disney Princess pour enfants, conçu pour une activité créative autour de l'univers des princesses Disney."
- MAUVAIS: raconter que Cendrillon poursuit ses rêves, parler de Bruno ou recopier le texte imprimé sur la couverture.
Réponds UNIQUEMENT en JSON valide avec exactement:

{
  "name_fr": "",
  "name_en": "",
  "description_fr": "",
  "description_en": "",
  "category": "",
  "brand": "",
  "ages": "",
  "confidence": 0
}

CATEGORY doit obligatoirement être une des clés suivantes:

${categoryList}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    const result = (await response.json()) as NvidiaResponse;

    if (!response.ok) {
      return null;
    }

    return parseSuggestion(
      responseText(result.choices?.[0]?.message?.content),
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  if (!(await currentAdmin(request))) return forbidden();

  const parsed = await validateJsonBody(request, analyzeSchema);
  if (!parsed.success) return parsed.response;

  const runtime = cmsEnv();

  if (!runtime.NVIDIA_API_KEY) {
    return Response.json(
      {
        error:
          "La clé NVIDIA n’est pas configurée dans Cloudflare.",
      },
      { status: 503 },
    );
  }

  const key = imageKey(parsed.data.image_url);

  if (!key) {
    return Response.json(
      {
        error:
          "Téléversez d’abord une photo du produit dans le CMS.",
      },
      { status: 400 },
    );
  }

  const object = await runtime.BUCKET.get(key);

  if (!object) {
    return Response.json(
      {
        error: "La photo du produit est introuvable.",
      },
      { status: 404 },
    );
  }

  const contentType =
    object.httpMetadata?.contentType || "image/jpeg";

  const image =
    `data:${contentType};base64,${arrayBufferToBase64(
      await object.arrayBuffer(),
    )}`;

  const categoryList = Object.entries(categories)
    .map(([value, label]) => `${value}: ${label}`)
    .join("\n");

  /*
   * Ordre:
   *
   * 1. modèle configuré dans Cloudflare, s'il existe
   * 2. GLM 5.3 Flash
   * 3. Llama Vision comme secours
   *
   * Chaque modèle dispose de 18 secondes maximum.
   */

  const models = [
    runtime.NVIDIA_VISION_MODEL,
    "zai-org/GLM-5.3-Flash",
    "meta/llama-3.2-11b-vision-instruct",
  ].filter(
    (model, index, all): model is string =>
      Boolean(model) &&
      all.indexOf(model) === index,
  );

  for (const model of models) {
    /*
     * Deux essais maximum.
     * On ne bloque donc plus indéfiniment le CMS.
     */

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const suggestion = await callNvidia(
        runtime.NVIDIA_API_KEY,
        model,
        image,
        categoryList,
      );

      if (suggestion) {
        return Response.json({
          suggestion,
          model,
        });
      }
    }
  }

  return Response.json(
    {
      error:
        "L’analyse NVIDIA n’a pas répondu correctement. Les modèles de secours ont également été essayés. Cliquez sur Réessayer.",
    },
    { status: 502 },
  );
}