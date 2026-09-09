import * as v from "valibot";

import { numberValue, stringValue } from "@/lib/cms";
import {
  optionalBooleanInput,
  optionalNumericInput,
  optionalTextInput,
} from "@/lib/api-validation";

const optionalProductFields = {
  name_en: optionalTextInput,
  description_fr: optionalTextInput,
  description_en: optionalTextInput,
  price: optionalNumericInput,
  stock: optionalNumericInput,
  status: optionalTextInput,
  badge: optionalTextInput,
  ages: optionalTextInput,
  image_url: optionalTextInput,
  image_sheet: optionalTextInput,
  image_position: optionalNumericInput,
  brand: optionalTextInput,
  material: optionalTextInput,
  dimensions: optionalTextInput,
  exchange_terms_fr: optionalTextInput,
  exchange_terms_en: optionalTextInput,
  visible: optionalBooleanInput,
  price_qc: optionalNumericInput,
  price_conakry: optionalNumericInput,
  stock_qc: optionalNumericInput,
  stock_conakry: optionalNumericInput,
  visible_qc: optionalBooleanInput,
  visible_conakry: optionalBooleanInput,
  alert_threshold: optionalNumericInput,
  featured: optionalBooleanInput,
  promo_price_qc: optionalNumericInput,
  promo_price_conakry: optionalNumericInput,
  variants_json: optionalTextInput,
  images_json: optionalTextInput,
};

export const createProductSchema = v.looseObject({
  name_fr: v.string(),
  category: v.string(),
  ...optionalProductFields,
});

export const updateProductSchema = v.looseObject({
  id: v.string(),
  name_fr: v.string(),
  category: v.optional(v.string()),
  ...optionalProductFields,
});

type ProductInput = Record<string, unknown>;

export function createProductBindings(
  data: ProductInput,
  id: string,
  articleNumber: string,
  name: string,
  category: string,
  now: string,
) {
  const conakryPrice = numberValue(data.price_conakry ?? data.price);
  const conakryStock = numberValue(data.stock_conakry ?? data.stock, 1);

  return [
    id,
    articleNumber,
    name,
    stringValue(data.name_en),
    stringValue(data.description_fr),
    stringValue(data.description_en),
    category,
    conakryPrice,
    conakryStock,
    stringValue(data.status, "available"),
    stringValue(data.badge) || null,
    stringValue(data.ages, "3+"),
    stringValue(data.image_url) || null,
    stringValue(data.image_sheet) || null,
    numberValue(data.image_position),
    stringValue(data.brand) || null,
    stringValue(data.material) || null,
    stringValue(data.dimensions) || null,
    stringValue(data.exchange_terms_fr) || null,
    stringValue(data.exchange_terms_en) || null,
    data.visible === false ? 0 : 1,
    numberValue(data.price_qc),
    conakryPrice,
    numberValue(data.stock_qc),
    conakryStock,
    data.visible_qc ? 1 : 0,
    data.visible_conakry === false || data.visible_conakry === 0 ? 0 : 1,
    numberValue(data.alert_threshold, 2),
    data.featured ? 1 : 0,
    numberValue(data.promo_price_qc) || null,
    numberValue(data.promo_price_conakry) || null,
    stringValue(data.variants_json, "[]"),
    stringValue(data.images_json, "[]"),
    now,
    now,
  ];
}

export function updateProductBindings(data: ProductInput, id: string, now: string) {
  const conakryPrice = numberValue(data.price_conakry ?? data.price);
  const conakryStock = numberValue(data.stock_conakry ?? data.stock);

  return [
    stringValue(data.name_fr),
    stringValue(data.name_en),
    stringValue(data.description_fr),
    stringValue(data.description_en),
    stringValue(data.category),
    conakryPrice,
    conakryStock,
    stringValue(data.status, "available"),
    stringValue(data.badge) || null,
    stringValue(data.ages, "3+"),
    stringValue(data.image_url) || null,
    stringValue(data.image_sheet) || null,
    numberValue(data.image_position),
    stringValue(data.brand) || null,
    stringValue(data.material) || null,
    stringValue(data.dimensions) || null,
    stringValue(data.exchange_terms_fr) || null,
    stringValue(data.exchange_terms_en) || null,
    data.visible === false || data.visible === 0 ? 0 : 1,
    numberValue(data.price_qc),
    conakryPrice,
    numberValue(data.stock_qc),
    conakryStock,
    data.visible_qc ? 1 : 0,
    data.visible_conakry === false || data.visible_conakry === 0 ? 0 : 1,
    numberValue(data.alert_threshold, 2),
    data.featured ? 1 : 0,
    numberValue(data.promo_price_qc) || null,
    numberValue(data.promo_price_conakry) || null,
    stringValue(data.variants_json, "[]"),
    stringValue(data.images_json, "[]"),
    now,
    id,
  ];
}
