import fs from "node:fs";

const path = "app/storefront/storefront-page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("<StorefrontNavigation")) {
  console.log("Navigation déjà extraite.");
  process.exit(0);
}

source = source
  .replace('import { PhoneIcon, WhatsAppIcon } from "./product-icons";', 'import { PhoneIcon, WhatsAppIcon } from "./product-icons";\nimport StorefrontNavigation from "./storefront-navigation";')
  .replace('  const [openMenu, setOpenMenu] = useState<string | null>(null);\n', '');

const effectStart = '  useEffect(() => {\n    if (!openMenu) return;';
const effectEnd = '  }, [openMenu]);\n\n';
const effectStartIndex = source.indexOf(effectStart);
const effectEndIndex = source.indexOf(effectEnd, effectStartIndex);
if (effectStartIndex < 0 || effectEndIndex < 0) throw new Error("Effet menu introuvable");
source = source.slice(0, effectStartIndex) + source.slice(effectEndIndex + effectEnd.length);

source = source.replace('    setOpenMenu(null);\n', '');

const headerStart = '      <header className="header wrap">';
const navEnd = '      </div></nav>\n\n';
const headerStartIndex = source.indexOf(headerStart);
const navEndIndex = source.indexOf(navEnd, headerStartIndex);
if (headerStartIndex < 0 || navEndIndex < 0) throw new Error("Bloc header/navigation introuvable");

const replacement = `      <StorefrontNavigation\n        language={language}\n        market={market}\n        storePhone={storePhone}\n        whatsappUrl={whatsappUrl}\n        availableCategories={availableCategories}\n        say={say}\n        sectionVisible={sectionVisible}\n        changeLanguage={changeLanguage}\n        chooseCategory={chooseCategory}\n      />\n\n`;
source = source.slice(0, headerStartIndex) + replacement + source.slice(navEndIndex + navEnd.length);

fs.writeFileSync(path, source, "utf8");
console.log("Header/navigation extraits.");
