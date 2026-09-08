import fs from "node:fs";

const path = "app/storefront/storefront-page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("<StorefrontHero") && source.includes("<StorefrontFeaturedCollections") && source.includes("<StorefrontQuickScroll")) process.exit(0);

source = source
  .replace('import { useEffect, useRef, useState } from "react";', 'import { useState } from "react";')
  .replace('import { marketPrice, markets } from "@/lib/markets";', 'import { markets } from "@/lib/markets";')
  .replace('import StorefrontPromo from "./storefront-promo";', 'import StorefrontPromo from "./storefront-promo";\nimport StorefrontHero from "./storefront-hero";\nimport StorefrontFeaturedCollections from "./storefront-featured-collections";\nimport StorefrontQuickScroll from "./storefront-quick-scroll";')
  .replace('  const quickScrollFrame = useRef<number | null>(null);\n', '');

const featuredDataStart = '  const featuredCollections = [';
const featuredDataEnd = '  ];\n\n';
const featuredDataStartIndex = source.indexOf(featuredDataStart);
const featuredDataEndIndex = source.indexOf(featuredDataEnd, featuredDataStartIndex);
if (featuredDataStartIndex < 0 || featuredDataEndIndex < 0) throw new Error("Données collections vedettes introuvables");
source = source.slice(0, featuredDataStartIndex) + source.slice(featuredDataEndIndex + featuredDataEnd.length);

const scrollStart = '  function stopQuickScroll() {';
const categoryStart = '  function chooseCategory(category: string) {';
const scrollIndex = source.indexOf(scrollStart);
const categoryIndex = source.indexOf(categoryStart, scrollIndex);
if (scrollIndex < 0 || categoryIndex < 0) throw new Error("Logique de défilement rapide introuvable");
source = source.slice(0, scrollIndex) + source.slice(categoryIndex);

const heroStart = '      <section className="hero wrap" id="accueil"';
const ribbonEnd = '      </div>\n\n      <StorefrontCatalog';
const heroIndex = source.indexOf(heroStart);
const ribbonEndIndex = source.indexOf(ribbonEnd, heroIndex);
if (heroIndex < 0 || ribbonEndIndex < 0) throw new Error("Hero/ruban introuvable");
const heroReplacement = `      <StorefrontHero\n        market={market}\n        storePhone={storePhone}\n        whatsappNumber={whatsappNumber}\n        whatsappUrl={whatsappUrl}\n        facebookUrl={facebookUrl}\n        say={say}\n        editable={editable}\n        sectionStyle={sectionStyle}\n      />\n\n      <StorefrontCatalog`;
source = source.slice(0, heroIndex) + heroReplacement + source.slice(ribbonEndIndex + ribbonEnd.length);

const featuredStart = '      {featuredCollections.filter((collection) => collection.items.length > 0).map((collection) => <section';
const promiseStart = '      <section className="promise"';
const featuredIndex = source.indexOf(featuredStart);
const promiseIndex = source.indexOf(promiseStart, featuredIndex);
if (featuredIndex < 0 || promiseIndex < 0) throw new Error("Rendu collections vedettes introuvable");
const featuredReplacement = `      <StorefrontFeaturedCollections\n        products={storeProducts}\n        language={language}\n        market={market}\n        say={say}\n        onSelectProduct={(search) => { setActive("all"); setStatus("all"); setQuery(search); }}\n      />\n\n`;
source = source.slice(0, featuredIndex) + featuredReplacement + source.slice(promiseIndex);

const quickStart = '      <div className="quick-scroll" aria-label={say("Défilement rapide", "Quick navigation")}>';
const floatingStart = '      <div className="floating-actions">';
const quickIndex = source.indexOf(quickStart);
const floatingIndex = source.indexOf(floatingStart, quickIndex);
if (quickIndex < 0 || floatingIndex < 0) throw new Error("Rendu défilement rapide introuvable");
source = source.slice(0, quickIndex) + '      <StorefrontQuickScroll say={say} />\n      ' + source.slice(floatingIndex);

fs.writeFileSync(path, source, "utf8");
