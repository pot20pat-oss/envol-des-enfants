"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { markets, type Market } from "@/lib/markets";
import { type Row } from "./admin-shared";

type CsvSheet = { headers: string[]; rows: string[][]; filename: string };
type Comparison = {
  id: string;
  article: string;
  productName: string;
  cmsPrice: number;
  cmsStock: number;
  visible: boolean;
  sku: string;
  qboName: string;
  qboSku: string;
  qboStock: string;
  qboItemId: string;
  qboType: string;
  status: "exact_sku" | "duplicate_cms" | "duplicate_quickbooks" |
    "not_found" | "missing_article" | "not_inventory";
};
const normalized = (value: unknown) => String(value ?? "").trim().toLocaleUpperCase("en");
const cleanHeader = (s: string) => s.trim().toLocaleLowerCase("fr")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

/** RFC 4180-style CSV parser with UTF-8 BOM, quotes, newlines and ; / tab support. */
function parseCsv(contents: string): string[][] {
  const text = contents.replace(/^\uFEFF/, "");
  const firstLine = text.slice(0, text.indexOf("\n") >= 0 ? text.indexOf("\n") : 4000);
  const count = (separator: string) => {
    let amount = 0, quoted = false;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (quoted && firstLine[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && firstLine[i] === separator) amount++;
    }
    return amount;
  };
  const delimiter = ["\t", ";", ","].sort((a, b) => count(b) - count(a))[0];
  const result: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(field); field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(cell => cell.trim())) result.push(row);
      if (result.length > 20001) throw new Error("Export trop volumineux (maximum 20 000 lignes).");
      row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV incomplet : guillemet non fermé.");
  row.push(field);
  if (row.some(cell => cell.trim())) result.push(row);
  if (result.length < 2) throw new Error("Le fichier doit contenir une ligne d'en-têtes et des produits.");
  return result;
}
function suggestedColumn(headers: string[], variants: string[]): number {
  return headers.findIndex(header => variants.includes(cleanHeader(header)));
}
function exportCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function downloadCsv(records: Comparison[], region: Market) {
  const labels = ["Région", "Produit CMS ID", "Article CMS", "Nom CMS",
    "SKU CMS proposé", "Stock CMS", "Prix CMS", "Visible CMS",
    "État du rapprochement", "SKU QuickBooks", "Nom QuickBooks",
    "Stock QuickBooks (lecture seulement)", "Identifiant QuickBooks", "Type QuickBooks"];
  const body = records.map(row => [
    region, row.id, row.article, row.productName, row.sku, row.cmsStock,
    row.cmsPrice, row.visible ? "oui" : "non", row.status,
    row.qboSku, row.qboName, row.qboStock, row.qboItemId, row.qboType,
  ]);
  const csv = [labels, ...body].map(line => line.map(exportCell).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "rapprochement-quickbooks-" + region + ".csv";
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(url);
}

export function QuickBooksReconciliationSection({
  products, market,
}: { products: Row[]; market: Market }) {
  const [sheet, setSheet] = useState<CsvSheet | null>(null);
  const [error, setError] = useState("");
  const [skuIndex, setSkuIndex] = useState(-1);
  const [nameIndex, setNameIndex] = useState(-1);
  const [stockIndex, setStockIndex] = useState(-1);
  const [idIndex, setIdIndex] = useState(-1);
  const [typeIndex, setTypeIndex] = useState(-1);
  const [filter, setFilter] = useState("all");

  async function openCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(""); setSheet(null);
    if (!file) return;
    if (file.size > 5_000_000) { setError("Fichier trop volumineux (maximum 5 Mo)."); return; }
    if (!/\.csv$/i.test(file.name)) { setError("Enregistre d'abord l'export QuickBooks au format CSV UTF-8."); return; }
    try {
      const rows = parseCsv(await file.text());
      const headers = rows[0].map(header => header.trim());
      if (headers.length < 2) throw new Error("En-têtes CSV insuffisants.");
      setSheet({ headers, rows: rows.slice(1), filename: file.name });
      setSkuIndex(suggestedColumn(headers,
        ["sku", "ugs", "reference", "referenceduproduit", "numerodarticle", "codedarticle", "itemsku"]));
      setNameIndex(suggestedColumn(headers,
        ["name", "nom", "productservice", "produitservice", "produitservicenom", "productname", "nomduproduit"]));
      setStockIndex(suggestedColumn(headers,
        ["qtyonhand", "quantityonhand", "quantiteenstock", "quantite", "quantity"]));
      setIdIndex(suggestedColumn(headers,
        ["id", "itemid", "productid", "identifiant", "identifiantarticle"]));
      setTypeIndex(suggestedColumn(headers,
        ["type","itemtype","producttype","typedarticle","typeduproduit"]));
      setFilter("all");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fichier CSV invalide.");
    }
  }

  const { comparisons, totals } = useMemo(() => {
    const rows: Comparison[] = [];
    const cmsCounts = new Map<string,number>();
    for (const product of products) {
      const article = normalized(product.article_number);
      if (article) cmsCounts.set(article, (cmsCounts.get(article) || 0) + 1);
    }
    const importedBySku = new Map<string, string[][]>();
    if (sheet && skuIndex >= 0) for (const record of sheet.rows) {
      const sku = normalized(record[skuIndex]);
      if (sku) importedBySku.set(sku, [...(importedBySku.get(sku) || []), record]);
    }
    for (const product of products) {
      const article = String(product.article_number ?? "").trim();
      const id = String(product.id ?? "");
      const candidate = (market === "qc" ? "ENV-QC-" : "ENV-CN-") + article;
      const possible = article
        ? [...new Set([normalized(article), normalized(candidate)])]
          .flatMap(key => importedBySku.get(key) || [])
        : [];
      const deduplicated = [...new Set(possible)];
      const lone = deduplicated.length === 1 ? deduplicated[0] : null;
      const qbType = lone && typeIndex >= 0 ? normalized(lone[typeIndex]) : "";
      const nonInventory = !!qbType && !["INVENTORY", "INVENTAIRE", "STOCK", "PRODUIT EN STOCK", "PRODUIT STOCKE", "PRODUIT STOCKÉ"].includes(qbType);
      const status: Comparison["status"] = !article ? "missing_article"
        : (cmsCounts.get(normalized(article)) || 0) > 1 ? "duplicate_cms"
        : deduplicated.length > 1 ? "duplicate_quickbooks"
        : deduplicated.length === 1 && nonInventory ? "not_inventory"
        : deduplicated.length === 1 ? "exact_sku" : "not_found";
      const match = status === "exact_sku" ? deduplicated[0] : null;
      rows.push({
        id, article, productName: String(product.name_fr || ""),
        cmsPrice: Number(product[market === "qc" ? "price_qc" : "price_conakry"] || 0),
        cmsStock: Number(product[market === "qc" ? "stock_qc" : "stock_conakry"] || 0),
        visible: Number(product[market === "qc" ? "visible_qc" : "visible_conakry"]) === 1 ||
          product[market === "qc" ? "visible_qc" : "visible_conakry"] === true,
        sku: article ? candidate : "",
        qboName: match && nameIndex >= 0 ? String(match[nameIndex] || "") : "",
        qboSku: match && skuIndex >= 0 ? String(match[skuIndex] || "") : "",
        qboStock: match && stockIndex >= 0 ? String(match[stockIndex] || "") : "",
        qboItemId: match && idIndex >= 0 ? String(match[idIndex] || "") : "",
        qboType: match && typeIndex >= 0 ? String(match[typeIndex] || "") : "",
        status,
      });
    }
    return {
      comparisons: rows,
      totals: {
        exact: rows.filter(r => r.status === "exact_sku").length,
        unmatched: rows.filter(r => r.status === "not_found").length,
        duplicates: rows.filter(r => r.status === "duplicate_cms" ||
          r.status === "duplicate_quickbooks").length,
        noArticle: rows.filter(r => r.status === "missing_article").length,
      },
    };
  }, [products, market, sheet, skuIndex, nameIndex, stockIndex, idIndex, typeIndex]);

  const displayed = comparisons.filter(item => filter === "all" || item.status === filter).slice(0, 80);
  const columnSelector = (label: string, index: number, change: (value: number) => void) =>
    <label style={{display:"grid",gap:6,flex:"1 1 190px"}}>{label}
      <select value={index} onChange={event=>change(Number(event.target.value))}>
        <option value={-1}>Non disponible</option>
        {sheet?.headers.map((head,i)=><option key={i} value={i}>{head || "Colonne " + (i+1)}</option>)}
      </select>
    </label>;
  return <section className="cms-panel">
    <div className="cms-panel-title"><h2>Rapprochement QuickBooks · {markets[market].label}</h2></div>
    <p><strong>Lecture seule :</strong> cet outil sert à comparer un export CSV de la
      véritable compagnie QuickBooks avec le catalogue du CMS. Aucune donnée du fichier
      QuickBooks n'est envoyée au serveur : le traitement se fait dans ce navigateur.
      Il ne crée ni association, ni facture, ni écriture de stock.</p>
    <p>Dans QuickBooks, exporte la liste des <strong>produits et services</strong>, incluant
      idéalement SKU / référence, nom, quantité en stock et identifiant de l'article.
      Si QuickBooks fournit un fichier Excel, enregistre une copie au format CSV UTF-8.</p>
    <div className="cms-panel cms-form" style={{padding:18,marginTop:18}}>
      <h3>1. Importer l'export QuickBooks pour comparaison</h3>
      <label>Fichier CSV (reste dans le navigateur)
        <input type="file" accept=".csv,text/csv" onChange={event=>void openCsv(event)} />
      </label>
      {error && <p className="cms-error" role="alert">{error}</p>}
      {sheet && <>
        <p>Fichier : <strong>{sheet.filename}</strong> · {sheet.rows.length} lignes lues</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {columnSelector("Colonne SKU / référence",skuIndex,setSkuIndex)}
          {columnSelector("Colonne nom",nameIndex,setNameIndex)}
          {columnSelector("Colonne quantité",stockIndex,setStockIndex)}
          {columnSelector("Colonne ID QuickBooks (facultative)",idIndex,setIdIndex)}
          {columnSelector("Colonne type d’article (Inventory)",typeIndex,setTypeIndex)}
        </div>
        {skuIndex < 0 && <p className="cms-error">
          Sélectionne la colonne SKU / référence. Aucun rapprochement n'est autorisé par le seul nom du produit.
        </p>}
      </>}
    </div>
    <div className="cms-panel" style={{padding:18,marginTop:18}}>
      <h3>2. Résultat — {markets[market].label}</h3>
      <p>Produits CMS examinés : <strong>{comparisons.length}</strong> · SKU exacts (non vérifiés) :
        <strong> {sheet && skuIndex >= 0 ? totals.exact : "—"}</strong> ·
        Doublons : <strong>{totals.duplicates}</strong> · Références absentes :
        <strong> {totals.noArticle}</strong></p>
      <p>Un SKU identique n'est qu'un indice : il faut vérifier manuellement le produit,
        son marché, son type Inventory, son identifiant QuickBooks et sa valorisation
        avant toute association.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",marginBlock:12}}>
        <label>Filtre
          <select value={filter} onChange={event=>setFilter(event.target.value)}>
            <option value="all">Tous les produits</option>
            <option value="exact_sku">SKU exacts non vérifiés</option>
            <option value="not_found">Sans correspondance</option>
            <option value="duplicate_cms">Références CMS en double</option>
            <option value="duplicate_quickbooks">SKU QuickBooks en double</option>
            <option value="missing_article">Sans référence CMS</option>
            <option value="not_inventory">Type QuickBooks non admissible</option>
          </select>
        </label>
        <button type="button" className="cms-secondary" disabled={!sheet || skuIndex < 0}
          onClick={()=>downloadCsv(comparisons,market)}>Exporter le rapport CSV</button>
      </div>
      <div className="cms-table-wrap"><table>
        <thead><tr><th>Article CMS</th><th>Produit CMS</th><th>SKU proposé</th>
          <th>Correspondance</th><th>Article QuickBooks</th><th>Stock CMS / QB</th></tr></thead>
        <tbody>{displayed.map(item=><tr key={item.id}>
          <td>{item.article || "—"}</td>
          <td>{item.productName}<small>{item.visible ? "Visible" : "Masqué"}</small></td>
          <td>{item.sku || "—"}</td>
          <td>{sheet && skuIndex >= 0 ? ({
            exact_sku:"SKU identique — à vérifier", duplicate_cms:"Doublon CMS",
            duplicate_quickbooks:"Doublon QuickBooks", not_found:"Non trouvé",
            missing_article:"Référence absente",
            not_inventory:"SKU présent, mais type non Inventory",
          })[item.status] : "Importer un CSV"}</td>
          <td>{item.qboName || "—"}{item.qboItemId&&<small>ID : {item.qboItemId}</small>}</td>
          <td>{item.cmsStock} / {item.qboStock || "—"}</td>
        </tr>)}</tbody>
      </table></div>
      {comparisons.length > displayed.length &&
        <p>Affichage limité à 80 lignes. Le rapport exporté contient les {comparisons.length} produits.</p>}
    </div>
    <p><strong>État :</strong> associations QuickBooks désactivées, écritures CMS et QuickBooks
      désactivées. Le Québec et Conakry doivent être rapprochés séparément.</p>
  </section>;
}
