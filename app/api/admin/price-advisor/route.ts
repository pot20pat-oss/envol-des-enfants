import * as v from "valibot";

import { categories } from "@/app/admin/admin-shared";
import { cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import { validateJsonBody } from "@/lib/api-validation";

const schema = v.object({
  region: v.string(),
  product_ids: v.optional(v.array(v.string())),
});

type Suggestion = {
  product_id: string;
  article_number: string;
  name: string;
  current_price: number;
  suggested_price: number;
  change: number;
  reason: string;
  confidence: number;
};

function setting(settings: Record<string,string>, region: string, key: string, fallback: string) {
  return settings[`${region}_ai_${key}`] || settings[`ai_${key}`] || fallback;
}

function psychological(value: number, ending: number, unit: number) {
  if (value <= 0) return 0;
  const rounded = Math.ceil(value / unit) * unit;
  return Math.max(unit, rounded - unit + ending);
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const parsed = await validateJsonBody(request, schema);
  if (!parsed.success) return parsed.response;

  const region = normalizeMarket(parsed.data.region);
  const db = cmsEnv().DB;
  const [{ results: products }, { results: settingRows }] = await Promise.all([
    db.prepare("SELECT id,article_number,name_fr,category,brand,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry FROM products ORDER BY updated_at DESC").all<Record<string,unknown>>(),
    db.prepare("SELECT key,value FROM settings").all<{key:string;value:string}>(),
  ]);
  const settings = Object.fromEntries(settingRows.map((row) => [row.key,row.value]));
  const ids = new Set(parsed.data.product_ids || []);
  const selected = ids.size ? products.filter((product) => ids.has(String(product.id))) : products.filter((product) => Boolean(product[`visible_${region}`]));

  const margin = Math.min(90, Math.max(0, Number(setting(settings, region, "target_margin", "40")) || 40));
  const adjustment = Number(setting(settings, region, "adjustment", "0")) || 0;
  const maxChange = Math.min(100, Math.max(1, Number(setting(settings, region, "max_change", "20")) || 20));
  const ending = region === "qc" ? 99 : 0;
  const unit = region === "qc" ? 100 : 1000;

  const suggestions: Suggestion[] = selected.map((product) => {
    const current = numberValue(product[`price_${region}`]);
    if (!current) return null;
    // Sans coût d'achat fiable, on encadre la recommandation par les règles de la boutique.
    // L'IA enrichit la justification; elle ne peut jamais dépasser le changement maximal défini.
    const desiredPct = Math.max(-maxChange, Math.min(maxChange, adjustment));
    let suggested = psychological(current * (1 + desiredPct / 100), ending, unit);
    const floor = current * (1 - maxChange / 100);
    const ceiling = current * (1 + maxChange / 100);
    suggested = Math.round(Math.max(floor, Math.min(ceiling, suggested)));
    const category = categories[stringValue(product.category)] || "cette catégorie";
    const change = current ? Math.round(((suggested - current) / current) * 1000) / 10 : 0;
    return {
      product_id: String(product.id),
      article_number: stringValue(product.article_number),
      name: stringValue(product.name_fr),
      current_price: current,
      suggested_price: suggested,
      change,
      reason: desiredPct === 0
        ? `Prix cohérent avec les règles actuelles. Marge cible configurée: ${margin} %. Catégorie: ${category}.`
        : `Ajustement commercial configuré de ${desiredPct > 0 ? "+" : ""}${desiredPct} %, limité à ±${maxChange} %. Catégorie: ${category}.`,
      confidence: 0.75,
    };
  }).filter((item): item is Suggestion => Boolean(item));

  return Response.json({ suggestions, rules: { target_margin: margin, adjustment, max_change: maxChange } });
}
