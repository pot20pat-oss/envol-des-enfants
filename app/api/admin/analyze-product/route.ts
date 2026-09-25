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
  const candidate = (start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    // NVIDIA peut occasionnellement échapper ou fermer incorrectement une chaîne.
    // Récupérer les champs individuellement évite de perdre une bonne analyse entière.
    const field = (name: string): string => {
      const match = candidate.match(new RegExp(`"${name}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*})`));
      return match?.[1]?.replace(/\\n/g, " ").replace(/\\\"/g, '"').trim() || "";
    };
    const confidenceMatch = candidate.match(/"confidence"\s*:\s*([0-9.]+)/);
    const recovered = {
      name_fr: field("name_fr"),
      name_en: field("name_en"),
      description_fr: field("description_fr"),
      description_en: field("description_en"),
      category: field("category"),
      brand: field("brand"),
      ages: field("ages"),
      confidence: confidenceMatch ? Number(confidenceMatch[1]) : 0,
    };
    if (recovered.name_fr && recovered.name_en) parsed = recovered;
  }

  if (!parsed) {
    // Dernier filet: certains modèles renvoient une fiche lisible mais pas un JSON
    // parfaitement fermé. Extraire les valeurs sans rejeter toute l'analyse.
    const looseField = (name: string): string => {
      const patterns = [
        new RegExp(`["']?${name}["']?\\s*:\\s*["']([^"'\\n\\r}]*)`, "i"),
        new RegExp(`${name}\\s*[:=-]\\s*([^\\n\\r,}]*)`, "i"),
      ];
      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match?.[1]) return match[1].trim();
      }
      return "";
    };
    const nameFr = looseField("name_fr");
    const nameEn = looseField("name_en");
    if (nameFr || nameEn) {
      parsed = {
        name_fr: nameFr || nameEn,
        name_en: nameEn || nameFr,
        description_fr: looseField("description_fr"),
        description_en: looseField("description_en"),
        category: looseField("category"),
        brand: looseField("brand"),
        ages: looseField("ages"),
        confidence: Number(looseField("confidence")) || 0.7,
      };
    }
  }

  if (!parsed) return null;

  const category =
    typeof parsed.category === "string" && parsed.category in categories
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
    ages: typeof parsed.ages === "string" && parsed.ages.trim() ? parsed.ages.trim() : "3+",
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
  };
}

function buildPrompt(categoryList: string): string {
  return `Tu analyses la photo d'un produit destiné à une boutique pour enfants.

Ta tâche est d'identifier LE PRODUIT VENDU et de produire une fiche e-commerce courte, exacte et utile.

RÈGLES ABSOLUES:
- Chaque requête concerne UNIQUEMENT la photo jointe. Ignore tout produit ou résultat d'une analyse précédente.
- Ne copie jamais un exemple dans name_fr/name_en. Les noms doivent être dérivés de la photo actuelle.

1. ANALYSE VISUELLE
- Base ton identification principalement sur ce qui est réellement visible.
- Identifie d'abord le TYPE PHYSIQUE DE PRODUIT, avant toute marque ou licence.
- Les personnages, franchises et logos visibles décrivent le THÈME du produit, jamais son type.
- Tu DOIS lire le texte clairement visible sur l'emballage lorsqu'il nomme le type de produit, l'activité ou le modèle. Ce texte d'identification est prioritaire sur une ressemblance visuelle approximative.
- Fais une vérification croisée obligatoire: (A) ce que montre l'objet, (B) le nom/type imprimé sur l'emballage. Si A et B semblent diverger, n'invente pas: choisis l'identification explicitement soutenue par l'emballage et baisse confidence.
- Ne confonds jamais le MATÉRIAU ou le contenu d'un kit avec le PRODUIT vendu. Exemple: de petits pots de peinture dans un kit ne font pas du produit de la pâte à modeler.
- Pour un kit créatif, nomme l'ACTIVITÉ ou l'OBJET À RÉALISER plutôt que seulement un composant visible dans la boîte.
- Si l'emballage contient un titre explicite qui décrit le produit, utilise ce texte visible comme preuve principale du type de produit et traduis-le correctement pour name_fr/name_en.
- Si l'identification exacte est incertaine, utilise un nom générique précis, mais jamais une formulation vide comme "produit pour enfants", "jouet pour enfants", "produit de décoration" ou "article pour enfants" si le type réel est visuellement identifiable.
- Identifie le TYPE CONCRET de l'article avant de rédiger: pâte à modeler, coffret créatif, poupée, véhicule, livre de coloriage, sac, jeu éducatif, etc.
- Quand plusieurs éléments sont visibles dans un même emballage ou ensemble, décris l'ensemble et les principaux éléments réellement visibles.
- Si une marque est lisible, combine-la avec le type concret du produit dans le nom quand cela améliore l'identification.
- N'invente jamais une information qui n'est pas visible ou raisonnablement certaine.
- Une réponse très générique ne peut jamais avoir une confiance élevée: si tu n'arrives pas à identifier précisément le type de produit, confidence doit être inférieur ou égal à 0.65.
- confidence = 1 uniquement si le type de produit ET son identification sont clairement établis visuellement ET concordent avec tout texte d'identification lisible sur l'emballage; ne donne jamais 1 par défaut.
- Si le nom proposé contredit un titre/type clairement lisible sur l'emballage, la réponse est invalide: corrige le nom avant de répondre.
- Avant de produire le JSON, fais silencieusement ce contrôle: "Mon name_fr/name_en décrit-il bien le produit complet vendu, et non un accessoire ou un matériau visible dans la boîte ?"

2. LECTURE DU TEXTE SUR L'EMBALLAGE
- AVANT de classer le produit, lis d'abord les mots les plus grands et les plus centraux de la face avant.
- Sépare mentalement: MARQUE/ÉDITEUR, TITRE DU PRODUIT, SOUS-TITRE/ACTIVITÉ, ÂGE/QUANTITÉ.
- Si un titre de produit est clairement lisible, name_fr doit conserver son sens précis. Ne le remplace jamais par une famille générique voisine.
- Les mots décrivant une compétence ou une activité sont déterminants: nombres, lettres, formes, couleurs, dessin, coloriage, écriture, lecture, puzzle, peinture, modelage, etc. Ne transforme pas une activité d'apprentissage des nombres en coloriage simplement parce que la couverture est illustrée.
- Pour un livre/cahier, distingue obligatoirement APPRENTISSAGE, ACTIVITÉS, COLORIAGE, DESSIN et HISTOIRE. Ce ne sont pas des synonymes.
- Si un nombre ou une plage fait partie du titre visible, conserve-la dans le nom lorsqu'elle identifie le contenu du produit.
- Si la marque ou l'éditeur est clairement lisible, conserve-le dans brand plutôt que de l'inventer à partir du style graphique.
- Effectue un second contrôle silencieux avant le JSON: relis le titre visible lettre par lettre et vérifie que name_fr/name_en décrivent la même activité.
- Si le texte principal est lisible mais ton nom ne reprend pas son sens, confidence doit être <= 0.45 et tu dois corriger le nom avant de répondre.
- Ne recopie jamais un long paragraphe imprimé et ne raconte jamais une histoire. Le texte visible sert à identifier précisément le produit.

3. MARQUE ET LICENCE
- N'invente jamais une marque.
- Utilise une marque seulement si elle est clairement visible ou identifiable avec une forte certitude.
- Une licence ou un personnage visible peut être mentionné si l'identification est fiable.

4. NOMS
- name_fr doit obligatoirement être en FRANÇAIS.
- name_en doit obligatoirement être en ANGLAIS.
- Une marque, licence ou franchise SEULE (ex. un univers de personnages) n'est JAMAIS un nom de produit acceptable.
- Le nom doit toujours contenir le TYPE PHYSIQUE CONCRET de l'article visible: tablette à dessin, livre, coffret, poupée, sac, véhicule, jeu, etc.
- Si une licence est visible, combine-la avec le type: "[type concret] [licence]" et non simplement "[licence]".
- Avant le JSON, pose-toi obligatoirement: "Si j'enlève la marque/licence de mon nom, reste-t-il un type de produit?" Si non, le nom est invalide et doit être corrigé.
- name_fr et name_en doivent décrire le MÊME objet, chacun dans sa langue.
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
Si le produit est un livre, cahier ou article scolaire:
- commence par TRANSCRIRE mentalement le titre principal visible avant de choisir le type d'article;
- identifie l'activité exacte annoncée par ce titre;
- un livre illustré n'est PAS automatiquement un livre de coloriage;
- un cahier d'apprentissage n'est PAS automatiquement un cahier d'activités;
- décris le type d'article, son sujet d'apprentissage ou activité principale, et la marque/éditeur ou licence seulement si visible;
- ne décris jamais l'intrigue ou une histoire imprimée.

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

async function nvidiaCall(apiKey: string, messages: unknown[], maxTokens = 500): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NVIDIA_TIMEOUT_MS);
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: NVIDIA_MODEL, temperature: 0, max_tokens: maxTokens, messages }),
    });
    const result = await response.json() as NvidiaResponse;
    if (!response.ok) throw new Error(
      typeof result.detail === "string" ? result.detail :
      typeof result.message === "string" ? result.message :
      `Erreur NVIDIA HTTP ${response.status}.`
    );
    return responseText(result.choices?.[0]?.message?.content).trim();
  } finally {
    clearTimeout(timeout);
  }
}

function parseFacts(content: string): Record<string, unknown> | null {
  const cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { return JSON.parse(cleaned.slice(a, b + 1).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1")); }
    catch {}
  }

  // Le passage "vision" n'a pas besoin de JSON parfait. Accepter aussi un
  // format ligne par ligne beaucoup plus fiable avec les modèles vision.
  const facts: Record<string, string> = {};
  for (const line of cleaned.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*:\s*(.+?)\s*$/i);
    if (match) facts[match[1].toLowerCase()] = match[2].trim();
  }
  if (facts.physical_object || facts.main_text) {
    return {
      main_text: facts.main_text || "",
      secondary_text: facts.secondary_text || "",
      brand_or_publisher: facts.brand_or_publisher || "",
      physical_object: facts.physical_object || "incertain",
      visible_parts: facts.visible_parts || "",
      object_interaction: facts.object_interaction || "",
      text_certainty: facts.text_certainty || "low",
      activity_or_purpose: facts.activity_or_purpose || "",
      age_text: facts.age_text || "",
      characters_or_license: facts.characters_or_license || "",
      uncertainties: facts.uncertainties || "",
    };
  }
  return null;
}

async function analyzeWithNvidia(
  apiKey: string,
  image: string,
  categoryList: string,
): Promise<ProductSuggestion> {
  let lastError = "NVIDIA n'a pas retourné une analyse exploitable.";

  for (let attempt = 1; attempt <= NVIDIA_MAX_ATTEMPTS; attempt += 1) {
    try {
      // PASSAGE 1: observation factuelle. Aucune classification commerciale ici.
      const rawFacts = await nvidiaCall(apiKey, [
        {
          role: "system",
          content: "You are a visual evidence extractor. Inspect only the current image. Do not guess a catalog category or product name. Follow the requested labeled-line format exactly.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Observe cette photo de produit. Extrais les PREUVES VISIBLES avant toute interprétation.
Réponds en lignes simples, UNE valeur par ligne. Pas de JSON:
MAIN_TEXT: texte principal lisible
SECONDARY_TEXT: autre texte utile
BRAND_OR_PUBLISHER: marque ou éditeur lisible
PHYSICAL_OBJECT: type physique concret
VISIBLE_PARTS: objets et pièces physiques visibles
OBJECT_INTERACTION: action démontrée avec ces objets
ACTIVITY_OR_PURPOSE: activité démontrée
TEXT_CERTAINTY: high, medium ou low
AGE_TEXT: âge lisible
CHARACTERS_OR_LICENSE: licence/personnages
UNCERTAINTIES: ce qui reste incertain

Règles:
- main_text: transcris fidèlement les gros mots/titres lisibles, sans traduction.
- physical_object: donne obligatoirement le TYPE PHYSIQUE concret visible (livre, coffret créatif, tablette à dessin, jeu, poupée, véhicule, etc.), jamais un titre, une marque ou une référence.
- Si tu ne peux pas déterminer le type physique, écris "incertain" et explique pourquoi dans uncertainties.
- visible_parts: inventorie les objets concrets reconnaissables; ne les remplace pas par le mot générique "kit".
- object_interaction: indique l'action démontrée par l'ensemble des objets seulement si elle est visible ou lisible.
- activity_or_purpose: déduis l'activité de la combinaison objets + texte fiable.
- TEXT_CERTAINTY reflète la lisibilité réelle. Si medium/low, ne transforme pas la lecture en marque ou titre certain.
- Une illustration n'est pas une preuve de coloriage ou modelage.
- "Coloriage" exige une surface destinée au dessin/coloriage. Peinture ou pinceaux avec un objet 3D doit orienter vers "à peindre/décorer".
- Un texte court, logo, marque, série ou référence (par ex. quelques mots stylisés) ne doit jamais remplacer physical_object.
- N'utilise aucune information d'une requête précédente.`,
            },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ], 420);

      // Ne bloque jamais toute l'analyse parce que le modèle vision n'a pas
      // respecté notre format. Le texte brut reste une preuve exploitable par
      // le passage de raisonnement suivant.
      const facts = parseFacts(rawFacts) || {
        main_text: rawFacts.slice(0, 3000),
        secondary_text: "",
        brand_or_publisher: "",
        physical_object: "incertain",
        visible_parts: "",
        object_interaction: "",
        text_certainty: "low",
        activity_or_purpose: "",
        age_text: "",
        characters_or_license: "",
        uncertainties: "La réponse vision n'a pas respecté le format structuré; utiliser le texte brut et rester prudent.",
      };

      // PASSAGE 2: raisonnement à partir des faits extraits, pas à partir d'un exemple de produit.
      const rawSuggestion = await nvidiaCall(apiKey, [
        {
          role: "system",
          content: "You create ecommerce product records from supplied visual evidence. Never contradict the evidence. Return one valid JSON object only.",
        },
        {
          role: "user",
          content: `${buildPrompt(categoryList)}

PREUVES EXTRAITES DE LA PHOTO ACTUELLE:
${JSON.stringify(facts)}

RÈGLE DE VALIDATION SUPPLÉMENTAIRE:
Le nom et la catégorie doivent être directement justifiables par ces preuves. Une marque/licence/référence seule n'est pas un produit.
Le nom DOIT contenir un type physique concret compatible avec physical_object. Si physical_object vaut "incertain", reste générique mais décris l'objet visible; n'utilise jamais seulement main_text.
Si main_text nomme clairement une activité ou un apprentissage ET text_certainty est high, le nom doit en conserver le sens.
Donne priorité à physical_object + visible_parts + object_interaction pour identifier le produit.
N'utilise brand_or_publisher dans le nom que si text_certainty est high.
Ne choisis "coloriage" que si les preuves montrent réellement une activité de dessin/coloriage; si peinture/pinceaux servent à décorer des objets physiques, nomme l'objet et l'activité à peindre/décorer.
Si name_fr et name_en sont exactement identiques, cela n'est acceptable que pour un nom propre accompagné d'un type de produit traduit; sinon corrige les deux noms.`,
        },
      ], 650);

      const suggestion = parseSuggestion(rawSuggestion);
      if (!suggestion || (!suggestion.name_fr && !suggestion.name_en)) {
        lastError = "NVIDIA a produit une fiche invalide.";
        continue;
      }

      // PASSAGE 3: contrôleur indépendant. Il rejette les contradictions grossières.
      const rawCheck = await nvidiaCall(apiKey, [
        {
          role: "system",
          content: 'Audit a product identification against visual evidence. Return JSON only: {"valid":true|false,"reason":"","confidence":0..1}.',
        },
        {
          role: "user",
          content: `PREUVES: ${JSON.stringify(facts)}
FICHE: ${JSON.stringify(suggestion)}
Vérifie surtout que le TYPE physique du produit, l'activité et le texte principal concordent.
REJETTE la fiche si:
- le nom ne contient aucun type physique concret;
- le nom est seulement une marque, licence, série, référence ou transcription de main_text;
- name_fr et name_en sont identiques alors qu'un type de produit devrait être traduit;
- la classification contredit le titre ou l'activité visible;
- la fiche dit "coloriage" alors que les objets montrent de la peinture/décoration d'objets physiques;
- une marque ou un titre provenant d'un texte medium/low est présenté comme certain.
Une fiche comme {"name_fr":"Tyma + Story E","name_en":"Tyma + Story E"} doit être rejetée car elle ne dit pas ce que le produit est.`,
        },
      ], 180);

      const check = parseFacts(rawCheck);
      // Un audit mal formaté ne doit pas faire échouer une bonne fiche. On
      // rejette uniquement quand le contrôleur dit explicitement valid=false.
      if (check?.valid === false || String(check?.valid).toLowerCase() === "false") {
        lastError = `Identification rejetée par le contrôle de cohérence: ${String(check.reason || "contradiction visuelle")}`;
        continue;
      }

      const auditConfidence = Number(check?.confidence);
      if (Number.isFinite(auditConfidence)) suggestion.confidence = Math.min(suggestion.confidence, Math.max(0, Math.min(1, auditConfidence)));
      return suggestion;
    } catch (failure) {
      lastError = failure instanceof Error ? failure.message : "Erreur pendant l'analyse NVIDIA.";
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