import fs from "node:fs";

const path = "app/storefront/storefront-page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("<StorefrontPromo")) process.exit(0);

source = source
  .replace('import { useEffect, useRef, useState, type FormEvent } from "react";', 'import { useEffect, useRef, useState } from "react";')
  .replace('import StorefrontNavigation from "./storefront-navigation";', 'import StorefrontNavigation from "./storefront-navigation";\nimport StorefrontPromo from "./storefront-promo";')
  .replace('import { useStorefrontSettings } from "../hooks/use-storefront-settings";', 'import { useStorefrontSettings } from "../hooks/use-storefront-settings";\nimport { useStorefrontPromo } from "../hooks/use-storefront-promo";')
  .replace('  const [promoOpen, setPromoOpen] = useState(false);\n', '')
  .replace('  const [email, setEmail] = useState("");\n  const [requested, setRequested] = useState(false);\n', '')
  .replace('  const [consent, setConsent] = useState(false);\n', '')
  .replace('    storePhone, whatsappNumber, whatsappUrl, facebookUrl, address, mapsUrl, mapEmbedUrl,\n    isEnglish, say, editable, sectionStyle, sectionVisible,\n  } = useStorefrontSettings(storeSettings, market, language, promoOpen);', '    storePhone, whatsappNumber, whatsappUrl, facebookUrl, address, mapsUrl, mapEmbedUrl, welcomeDiscount,\n    isEnglish, say, editable, sectionStyle, sectionVisible,\n  } = useStorefrontSettings(storeSettings, market, language);\n  const promo = useStorefrontPromo({ language, market, whatsappNumber, whatsappUrl, welcomeDiscount, say });');

const promoEffectStart = '  useEffect(() => {\n    if (window.sessionStorage.getItem("envol-promo-dismissed") === "yes") return;';
const quickScrollStart = '  function stopQuickScroll() {';
const promoStartIndex = source.indexOf(promoEffectStart);
const quickIndex = source.indexOf(quickScrollStart, promoStartIndex);
if (promoStartIndex < 0 || quickIndex < 0) throw new Error("Bloc logique promo introuvable");
source = source.slice(0, promoStartIndex) + source.slice(quickIndex);

const requestStart = '  async function requestDiscount(';
const chooseStart = '  function chooseCategory(category: string) {';
const requestIndex = source.indexOf(requestStart);
const chooseIndex = source.indexOf(chooseStart, requestIndex);
if (requestIndex >= 0 && chooseIndex > requestIndex) source = source.slice(0, requestIndex) + source.slice(chooseIndex);

source = source
  .replace('onClick={() => setPromoOpen(true)}', 'onClick={promo.openPromo}')
  .replace('onClick={() => setPromoOpen(true)} className="button button-light"', 'onClick={promo.openPromo} className="button button-light"');

const modalStart = '      {promoOpen && <div className="promo-backdrop"';
const productStart = '      {selectedProduct && <ProductLightbox';
const modalIndex = source.indexOf(modalStart);
const productIndex = source.indexOf(productStart, modalIndex);
if (modalIndex < 0 || productIndex < 0) throw new Error("Bloc modal promo introuvable");
const promoComponent = `      <StorefrontPromo\n        open={promo.promoOpen}\n        email={promo.email}\n        requested={promo.requested}\n        consent={promo.consent}\n        discount={welcomeDiscount}\n        say={say}\n        onClose={promo.closePromo}\n        onEmailChange={promo.setEmail}\n        onConsentChange={promo.setConsent}\n        onSubmit={promo.requestDiscount}\n      />\n\n`;
source = source.slice(0, modalIndex) + promoComponent + source.slice(productIndex);

fs.writeFileSync(path, source, "utf8");
