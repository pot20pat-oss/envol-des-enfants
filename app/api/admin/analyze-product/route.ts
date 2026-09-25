import * as v from "valibot";

import { categories } from "@/app/admin/admin-shared";
import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const analyzeSchema = v.object({
  image_url: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

type NvidiaResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
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

const NVIDIA_MODEL = "meta/llama-3.2-11b-vision-instruct";
const NVIDIA_TIMEOUT_MS = 25_000;
const NVIDIA_MAX_ATTEMPTS = 2;

function imageKey(imageUrl: string): string | null {
  const prefix = "/api/images/";

  if (!imageUrl.startsWith(prefix)) return null;

  const key = decodeURIComponent(imageUrl.slice(prefix.length));

  return key.startsWith("products/") && !key.includes("..")
    ? key
    : null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + 32_768),
    );
  }

  return btoa(binary);
}

function responseText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (
        part &&
        typeof part === "object" &&
        "text" in part
      ) {
        return String(part.text || "");
      }

      return "";
    })
    .join("");
}

function parseSuggestion(
  content: string,
): ProductSuggestion | null {
  const cleaned = content
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;

  let candidate = cleaned.slice(start, end + 1)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");

  try {
    const parsed = JSON.parse(candidate) as Record<
      string,
      unknown
    >;

    const category =
      typeof parsed.category === "string" &&
      parsed.category in categories
        ? parsed.category
        : "eveil";

    const confidence = Number(parsed.confidence);

    return {
      name_fr:
        typeof parsed.name_fr === "string"
          ? parsed.name_fr.trim()
          : "",

      name_en:
        typeof parsed.name_en === "string"
          ? parsed.name_en.trim()
          : "",

      description_fr:
        typeof parsed.description_fr === "string"
          ? parsed.description_fr.trim()
          : "",

      description_en:
        typeof parsed.description_en === "string"
          ? parsed.description_en.trim()
          : "",

      category,

      brand:
        typeof parsed.brand === "string"
          ? parsed.brand.trim()
          : "",

      ages:
        typeof parsed.ages === "string" &&
        parsed.ages.trim()
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

function buildPrompt(categoryList: string): string {
  return `Tu analyses la photo d'un produit destiné à une boutique pour enfants.

Ta tâche est d'identifier LE PRODUIT VENDU et de produire une fiche e-commerce courte, exacte et utile.

RÈGLES ABSOLUES:

1. ANALYSE VISUELLE
- Base ton identification principalement sur ce qui est réellement visible.
- Identifie d'abord le TYPE DE PRODUIT.
- Tu peux lire le texte visible uniquement pour identifier le produit, la marque, la licence ou le modèle.
- Si l'identification exacte est incertaine, utilise un nom générique précis, mais jamais une formulation vide comme "produit pour enfants", "jouet pour enfants", "produit de décoration" ou "article pour enfants" si le type réel est visuellement identifiable.
- Identifie le TYPE CONCRET de l'article avant de rédiger: pâte à modeler, coffret créatif, poupée, véhicule, livre de coloriage, sac, jeu éducatif, etc.
- Quand plusieurs éléments sont visibles dans un même emballage ou ensemble, décris l'ensemble et les principaux éléments réellement visibles.
- Si une marque est lisible, combine-la avec le type concret du produit dans le nom quand cela améliore l'identification.
- N'invente jamais une information qui n'est pas visible ou raisonnablement certaine.
- Une réponse très générique ne peut jamais avoir une confiance élevée: si tu n'arrives pas à identifier précisément le type de produit, confidence doit être inférieur ou égal à 0.65.
- confidence = 1 uniquement si le type de produit ET son identification sont clairement établis visuellement; ne donne jamais 1 par défaut.

2. TEXTE SUR L'EMBALLAGE
- Ne recopie jamais un paragraphe imprimé sur le produit.
- Ne transforme jamais le texte de l'emballage en description.
- Ne raconte jamais une histoire imprimée sur un livre, une boîte ou un emballage.
- Ne résume jamais l'histoire d'un personnage, film, dessin animé ou livre.
- Le texte visible sert seulement à IDENTIFIER le produit.

3. MARQUE ET LICENCE
- N'invente jamais une marque.
- Utilise une marque seulement si elle est clairement visible ou identifiable avec une forte certitude.
- Une licence ou un personnage visible peut être mentionné si l'identification est fiable.

4. NOMS
- name_fr doit obligatoirement être en FRANÇAIS.
- name_en doit obligatoirement être en ANGLAIS.
- Les noms doivent être courts et adaptés à un catalogue e-commerce.

5. DESCRIPTION FRANÇAISE
- description_fr doit obligatoirement être en FRANÇAIS.
- Maximum 2 phrases courtes.
- Décris le PRODUIT vendu avec des termes concrets.
- Mentionne son type exact, sa marque si visible, son thème et les principaux éléments/accessoires clairement visibles.
- La description doit permettre à un client de comprendre ce qu'il achète sans regarder la photo.
- Refuse les descriptions génériques comme "Produit de décoration pour enfants" lorsqu'un type d'article plus précis est visible.
- Ne raconte aucune histoire.

6. DESCRIPTION ANGLAISE
- description_en doit obligatoirement être en ANGLAIS.
- Maximum 2 phrases courtes.
- Elle doit correspondre à la description française.
- Ne raconte aucune histoire.

7. LIVRES ET ARTICLES CRÉATIFS
Si le produit est un livre, cahier, livre de dessin, livre de coloriage ou article scolaire:
- décris le type d'article;
- indique le thème ou la licence si visible;
- indique l'activité principale;
- ne décris jamais l'intrigue ou l'histoire imprimée.

EXEMPLE:

Si la photo montre un livre de dessin Disney Princess contenant du texte sur Cendrillon:

BON:
" Livre de dessin Disney Princess pour enfants. Un cahier créatif sur le thème des princesses Disney pour dessiner et s'amuser. "

MAUVAIS:
" Cendrillon travaille dur pour réaliser ses rêves et aime son chien Bruno... "

8. ÂGE
- Utilise l'âge imprimé s'il est clairement visible.
- Sinon reste prudent.
- N'invente pas une tranche d'âge très précise sans preuve visuelle.

9. CATÉGORIE
category doit être EXACTEMENT une clé de la liste fournie ci-dessous.

10. CONFIANCE
confidence doit être un nombre entre 0 et 1.
Il représente ta certitude réelle concernant l'identification du produit.

RÉPONSE:

Réponds UNIQUEMENT avec un objet JSON valide.

Aucun markdown.
Aucune explication.
Aucun texte avant ou après le JSON.

Format exact:

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

CATÉGORIES AUTORISÉES:

${categoryList}`;
}

async function analyzeWithNvidia(
  apiKey: string,
  image: string,
  categoryList: string,
): Promise<ProductSuggestion> {
  let lastError =
    "NVIDIA n'a pas retourné une analyse exploitable.";

  for (
    let attempt = 1;
    attempt <= NVIDIA_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      NVIDIA_TIMEOUT_MS,
    );

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
            model: NVIDIA_MODEL,

            temperature: 0,

            max_tokens: 650,

            response_format: {
              type: "json_object",
            },

            messages: [
              {
                role: "system",
                content: "Return exactly one complete valid JSON object. Never use markdown, comments, trailing commas, or text outside JSON. Always close every quote, array and object.",
              },
              {
                role: "user",

                content: [
                  {
                    type: "text",
                    text: buildPrompt(categoryList),
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

      const result =
        (await response.json()) as NvidiaResponse;

      if (!response.ok) {
        lastError =
          typeof result.detail === "string"
            ? result.detail
            : typeof result.message === "string"
              ? result.message
              : `Erreur NVIDIA HTTP ${response.status}.`;

        continue;
      }

      const suggestion = parseSuggestion(
        responseText(
          result.choices?.[0]?.message?.content,
        ),
      );

      if (suggestion) {
        return suggestion;
      }

      lastError =
        "NVIDIA a répondu, mais le JSON de la fiche produit était invalide.";
    } catch (failure) {
      if (
        failure instanceof Error &&
        failure.name === "AbortError"
      ) {
        lastError =
          `NVIDIA a dépassé ${NVIDIA_TIMEOUT_MS / 1000} secondes.`;
      } else {
        lastError =
          failure instanceof Error
            ? failure.message
            : "Erreur pendant l'analyse NVIDIA.";
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(lastError);
}

export async function POST(request: Request) {
  if (!(await currentAdmin(request))) {
    return forbidden();
  }

  const parsed = await validateJsonBody(
    request,
    analyzeSchema,
  );

  if (!parsed.success) {
    return parsed.response;
  }

  const runtime = cmsEnv();

  if (!runtime.NVIDIA_API_KEY) {
    return Response.json(
      {
        error:
          "La clé NVIDIA n'est pas configurée dans Cloudflare.",
      },
      {
        status: 503,
      },
    );
  }

  const key = imageKey(parsed.data.image_url);

  if (!key) {
    return Response.json(
      {
        error:
          "Téléversez d'abord une photo du produit dans le CMS.",
      },
      {
        status: 400,
      },
    );
  }

  const object = await runtime.BUCKET.get(key);

  if (!object) {
    return Response.json(
      {
        error:
          "La photo du produit est introuvable.",
      },
      {
        status: 404,
      },
    );
  }

  const contentType =
    object.httpMetadata?.contentType ||
    "image/jpeg";

  const image =
    `data:${contentType};base64,${arrayBufferToBase64(
      await object.arrayBuffer(),
    )}`;

  const categoryList = Object.entries(categories)
    .map(
      ([value, label]) =>
        `${value}: ${label}`,
    )
    .join("\n");

  try {
    const suggestion = await analyzeWithNvidia(
      runtime.NVIDIA_API_KEY,
      image,
      categoryList,
    );

    return Response.json({
      suggestion,
      model: NVIDIA_MODEL,
    });
  } catch (failure) {
    const detail =
      failure instanceof Error
        ? failure.message
        : "Analyse NVIDIA impossible.";

    return Response.json(
      {
        error:
          `${detail} Vous pouvez cliquer sur Réessayer.`,
      },
      {
        status: 502,
      },
    );
  }
}