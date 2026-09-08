import fs from "node:fs";

const path = "app/storefront/storefront-page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("useStorefrontSettings(storeSettings")) {
  console.log("Storefront déjà raccordé au hook CMS.");
  process.exit(0);
}

source = source
  .replace('import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";', 'import { useEffect, useRef, useState, type FormEvent } from "react";')
  .replace('import { readSiteSections, readSiteTexts } from "@/lib/site-editor";\n', '')
  .replace('import { useStoreMarket } from "../hooks/use-store-market";', 'import { useStoreMarket } from "../hooks/use-store-market";\nimport { useStorefrontSettings } from "../hooks/use-storefront-settings";');

const oldSettings = `  const siteSections = readSiteSections(storeSettings.site_sections);\n  const siteTexts = readSiteTexts(storeSettings.site_texts);\n  const storePhone = storeSettings.phone || (market === "conakry" ? "+224 666 54 79 76" : "");\n  const whatsappNumber = (storeSettings.whatsapp || (market === "conakry" ? "224666547976" : "")).replace(/[^\\d]/g, "");\n  const whatsappUrl = whatsappNumber ? \`https://wa.me/\${whatsappNumber}\` : "#contact";\n  const facebookUrl = storeSettings.facebook || (market === "conakry" ? "https://www.facebook.com/rachetteboutique/" : "#contact");\n  const address = storeSettings.address || (market === "conakry" ? "Immeuble Famille Diallo, Cameroun, Dixinn, Conakry, Guinée" : "Québec, Canada");\n  const mapsUrl = storeSettings.map_url || \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(address)}\`;\n  const mapEmbedUrl = \`https://maps.google.com/maps?q=\${encodeURIComponent(address)}&t=&z=\${market === "qc" && !storeSettings.address ? "6" : "13"}&ie=UTF8&iwloc=&output=embed\`;\n  const isEnglish = language === "en";\n  const say = (french: string, english: string) => isEnglish ? english : french;\n  const editable = (key: string, french: string, english: string) => siteTexts[\`\${key}_\${language}\`]?.trim() || say(french, english);\n  const sectionStyle = (id: string): CSSProperties => {\n    const index = siteSections.findIndex((section) => section.id === id);\n    const section = siteSections[index];\n    return { order: index < 0 ? 500 : index + 10, ...(section && !section.visible ? { display: "none" } : {}) };\n  };\n  const sectionVisible = (id: string) => siteSections.find((section) => section.id === id)?.visible !== false;\n`;

const newSettings = `  const {\n    storePhone, whatsappNumber, whatsappUrl, facebookUrl, address, mapsUrl, mapEmbedUrl,\n    isEnglish, say, editable, sectionStyle, sectionVisible,\n  } = useStorefrontSettings(storeSettings, market, language, promoOpen);\n`;

if (!source.includes(oldSettings)) throw new Error("Bloc de réglages storefront introuvable");
source = source.replace(oldSettings, newSettings);

const effectStart = '  useEffect(() => {\n    const root = document.querySelector<HTMLElement>(".editable-storefront");';
const effectEnd = '  }, [storeSettings.site_sections, storeSettings.site_texts, storeSettings.phone, storeSettings.opening_hours, storeSettings.delivery_conditions, storeSettings.welcome_discount, language, promoOpen]);\n\n';
const startIndex = source.indexOf(effectStart);
const endIndex = source.indexOf(effectEnd, startIndex);
if (startIndex < 0 || endIndex < 0) throw new Error("Effet CMS storefront introuvable");
source = source.slice(0, startIndex) + source.slice(endIndex + effectEnd.length);

fs.writeFileSync(path, source, "utf8");
console.log("Storefront raccordé au hook CMS/réglages.");
