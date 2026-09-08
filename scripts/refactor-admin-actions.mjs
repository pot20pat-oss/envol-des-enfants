import fs from "node:fs";

const path = "app/admin/page.tsx";
let source = fs.readFileSync(path, "utf8");

if (source.includes("useAdminActions({")) process.exit(0);

source = source
  .replace('import { defaultProducts, removedProductNames } from "@/lib/default-catalog";\n', '')
  .replace('import {\n  readSiteSections,\n  readSiteTexts,\n} from "@/lib/site-editor";\n', '')
  .replace('import { useAdminData, type AdminIdentity } from "./use-admin-data";', 'import { useAdminData, type AdminIdentity } from "./use-admin-data";\nimport { useAdminActions } from "./use-admin-actions";')
  .replace('import { blankProduct, orderLabels, request, type Row, type Section } from "./admin-shared";', 'import { blankProduct, request, type Row, type Section } from "./admin-shared";')
  .replace('  const [busy, setBusy] = useState(false);\n  const [passwords, setPasswords] = useState({\n    current_password: "",\n    new_password: "",\n  });\n\n', '');

const dataHookEnd = '  } = useAdminData({ market, admin, setAdmin, setNotice, setError });\n';
if (!source.includes(dataHookEnd)) throw new Error("Hook useAdminData introuvable");
source = source.replace(dataHookEnd, dataHookEnd + `\n  const {\n    busy, setBusy, passwords, setPasswords, updateEditing, saveEditing, remove, upload, saveSettings,\n    synchronizeProducts, moveSection, saveSiteEditor, changePassword, adjustStock, exportOrders, restoreVersion,\n  } = useAdminActions({ market, load, setError, setNotice });\n`);

const actionsPattern = /  function update\(field: string, value: string \| number \| boolean\) \{[\s\S]*?\n  function restoreVersion\(version: Row\) \{[\s\S]*?\n  \}\n\n  if \(checking\)/;
if (!actionsPattern.test(source)) throw new Error("Bloc actions métier introuvable");
source = source.replace(actionsPattern, '  if (checking)');

source = source
  .replace('moveSection={moveSection}', 'moveSection={(id, nextIndex) => moveSection(setSiteSections, id, nextIndex)}')
  .replace('restoreVersion={restoreVersion}', 'restoreVersion={(version) => restoreVersion(version, setSiteSections, setSiteTexts)}')
  .replace('save={saveSiteEditor}', 'save={(event) => void saveSiteEditor(event, siteSections, siteTexts, setSettings, setVersions)}')
  .replace('synchronize={() => void synchronizeProducts()}', 'synchronize={() => void synchronizeProducts()}')
  .replace('adjustStock={(product) => void adjustStock(product)}', 'adjustStock={(product) => void adjustStock(product)}')
  .replace('remove={(id) => void remove("products", id)}', 'remove={(id) => void remove("products", id)}')
  .replace('exportOrders={exportOrders}', 'exportOrders={() => exportOrders(filteredOrders)}')
  .replace('remove={(id) => void remove("promotions", id)}', 'remove={(id) => void remove("promotions", id)}')
  .replace('saveSettings={saveSettings}', 'saveSettings={(event) => void saveSettings(event, settings)}')
  .replace('changePassword={changePassword}', 'changePassword={(event) => void changePassword(event)}')
  .replace('save={save}', 'save={(event) => void saveEditing(event, editing, editingType, setEditing)}')
  .replace('update={update}', 'update={(field, value) => updateEditing(setEditing, field, value)}')
  .replace('upload={upload}', 'upload={(file) => void upload(file, setEditing)}');

fs.writeFileSync(path, source, "utf8");
