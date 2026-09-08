import fs from "node:fs";

const path = "app/storefront/storefront-page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("<StorefrontHero") && source.includes("<StorefrontFeaturedCollections") && source.includes("<StorefrontQuickScroll")) process.exit(0);

source = source
  .replace('import { useEffect, useRef, useState } from "react";', 'import { useState } from "react";')
  .replace('import { marketPrice, markets } from "@/lib/markets";', 'import { markets } from "@/lib/markets";')
  .replace('import StorefrontPromo from "./storefront-promo";', 'import StorefrontPromo from "./storefront-promo";\nimport StorefrontHero from "./storefront-hero";\nimport StorefrontFeaturedCollections from "./storefront-featured-collections";\nimport StorefrontQuickScroll from "./storefront-quick-scroll";')
  .replace('  const quickScrollFrame = useRef<number | null>(null);\n', '');

const featuredDataPattern = /  const featuredCollections = \[[\s\S]*?\n  \];\n\n/;
if (!featuredDataPattern.test(source)) throw new Error("Données collections vedettes introuvables");
source = source.replace(featuredDataPattern, "");

const scrollPattern = /  function stopQuickScroll\(\) \{[\s\S]*?\n\n  function chooseCategory\(category: string\) \{/;
if (!scrollPattern.test(source)) throw new Error("Logique de défilement rapide introuvable");
source = source.replace(scrollPattern, '  function chooseCategory(category: string) {');

const heroPattern = /      <section className="hero wrap" id="accueil"[\s\S]*?\n\n      <StorefrontCatalog/;
if (!heroPattern.test(source)) throw new Error("Hero/ruban introuvable");
source = source.replace(heroPattern, `      <StorefrontHero\n        market={market}\n        storePhone={storePhone}\n        whatsappNumber={whatsappNumber}\n        whatsappUrl={whatsappUrl}\n        facebookUrl={facebookUrl}\n        say={say}\n        editable={editable}\n        sectionStyle={sectionStyle}\n      />\n\n      <StorefrontCatalog`);

const featuredPattern = /      \{featuredCollections\.filter\([\s\S]*?\n\n      <section className="promise"/;
if (!featuredPattern.test(source)) throw new Error("Rendu collections vedettes introuvable");
source = source.replace(featuredPattern, `      <StorefrontFeaturedCollections\n        products={storeProducts}\n        language={language}\n        market={market}\n        say={say}\n        onSelectProduct={(search) => { setActive("all"); setStatus("all"); setQuery(search); }}\n      />\n\n      <section className="promise"`);

const quickPattern = /      <div className="quick-scroll" aria-label=\{say\("Défilement rapide", "Quick navigation"\)\}>[\s\S]*?\n      <div className="floating-actions">/;
if (!quickPattern.test(source)) throw new Error("Rendu défilement rapide introuvable");
source = source.replace(quickPattern, '      <StorefrontQuickScroll say={say} />\n      <div className="floating-actions">');

fs.writeFileSync(path, source, "utf8");
