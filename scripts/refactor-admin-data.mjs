import fs from "node:fs";

const path = "app/admin/page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("useAdminData({")) process.exit(0);

source = source
  .replace('import { useEffect, useState, type FormEvent } from "react";', 'import { useState, type FormEvent } from "react";')
  .replace('  defaultSiteSections,\n  readSiteSections,\n  readSiteTexts,\n  type SiteSection,\n', '  readSiteSections,\n  readSiteTexts,\n')
  .replace('import { deriveAdminLists } from "./admin-derived";', 'import { deriveAdminLists } from "./admin-derived";\nimport { useAdminData, type AdminIdentity } from "./use-admin-data";')
  .replace('  const [admin, setAdmin] = useState<{ email: string; name: string } | null>(\n    null,\n  );\n  const [checking, setChecking] = useState(true);', '  const [admin, setAdmin] = useState<AdminIdentity | null>(null);');

const dataStatePattern = /  const \[products, setProducts\][\s\S]*?  const \[draggedSection, setDraggedSection\] = useState<string \| null>\(null\);/;
if (!dataStatePattern.test(source)) throw new Error("États de données admin introuvables");
source = source.replace(dataStatePattern, '  const [draggedSection, setDraggedSection] = useState<string | null>(null);');

const effectsPattern = /  useEffect\(\(\) => \{\n    request\("\/api\/admin\/session"\)[\s\S]*?\n  async function signIn/;
if (!effectsPattern.test(source)) throw new Error("Chargement admin introuvable");
source = source.replace(effectsPattern, `  const {\n    checking, products, orders, promotions, subscribers, movements, versions, settings, siteSections, siteTexts, load,\n    setProducts, setOrders, setPromotions, setSubscribers, setMovements, setVersions, setSettings, setSiteSections, setSiteTexts,\n  } = useAdminData({ market, admin, setAdmin, flash, setError });\n\n  async function signIn`);

fs.writeFileSync(path, source, "utf8");
