import fs from "node:fs";

const path = "app/storefront/storefront-page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes('useStoreLanguage()') && source.includes('useStoreMarket()')) {
  console.log("Storefront déjà raccordé aux hooks.");
  process.exit(0);
}

source = source
  .replace('import { defaultProducts, type Product, type Translation } from "@/lib/default-catalog";', 'import { type Product, type Translation } from "@/lib/default-catalog";')
  .replace('import { marketPrice, markets, normalizeMarket, type Market } from "@/lib/markets";', 'import { marketPrice, markets } from "@/lib/markets";')
  .replace('import { PhoneIcon, WhatsAppIcon } from "./product-icons";\n\ntype Language = "fr" | "en";', 'import { PhoneIcon, WhatsAppIcon } from "./product-icons";\nimport { useStoreLanguage } from "../hooks/use-store-language";\nimport { useStoreMarket } from "../hooks/use-store-market";');

source = source
  .replace('  const [language, setLanguage] = useState<Language>("fr");\n', '')
  .replace('  const [managedProducts, setManagedProducts] = useState<Product[] | null>(null);\n  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});\n  const [market, setMarket] = useState<Market>("conakry");\n', '')
  .replace('  const quickScrollFrame = useRef<number | null>(null);\n  const storeProducts = managedProducts === null ? market === "conakry" ? defaultProducts : [] : managedProducts;\n', '  const quickScrollFrame = useRef<number | null>(null);\n  const { language, changeLanguage } = useStoreLanguage();\n  const { market, storeSettings, storeProducts } = useStoreMarket();\n');

const marketStart = '  useEffect(() => {\n    const preferred = new URLSearchParams(window.location.search).get("region");';
const languageEnd = '  useEffect(() => {\n    document.documentElement.lang = language;\n  }, [language]);\n\n';
const startIndex = source.indexOf(marketStart);
const endIndex = source.indexOf(languageEnd, startIndex);
if (startIndex < 0 || endIndex < 0) throw new Error("Bloc marché/langue introuvable");
source = source.slice(0, startIndex) + source.slice(endIndex + languageEnd.length);

source = source.replace('  function changeLanguage(nextLanguage: Language) {\n    setLanguage(nextLanguage);\n    window.localStorage.setItem("envol-language", nextLanguage);\n  }\n\n', '');

fs.writeFileSync(path, source, "utf8");
console.log("Storefront raccordé aux hooks marché/langue.");
