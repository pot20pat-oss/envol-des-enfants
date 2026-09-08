import { marketPrice, markets, type Market } from "@/lib/markets";
import { categories, type Row } from "./admin-shared";

export function ProductsSection({ products, market, busy, search, setSearch, category, setCategory, visibility, setVisibility, stock, setStock, synchronize, add, edit, adjustStock, remove }: {
  products: Row[]; market: Market; busy: boolean; search: string; setSearch: (value: string) => void;
  category: string; setCategory: (value: string) => void; visibility: string; setVisibility: (value: string) => void;
  stock: string; setStock: (value: string) => void; synchronize: () => void; add: () => void;
  edit: (product: Row) => void; adjustStock: (product: Row) => void; remove: (id: string) => void;
}) {
  const reset = () => { setSearch(""); setCategory("all"); setVisibility("all"); setStock("all"); };
  return <section className="cms-panel">
    <div className="cms-panel-title"><input className="cms-search" placeholder="Nom, marque ou numéro d’article…" value={search} onChange={(event) => setSearch(event.target.value)} /><div className="cms-product-actions"><button className="cms-secondary" disabled={busy} onClick={synchronize}>↻ Synchroniser la boutique</button><button className="cms-primary" onClick={add}>+ Ajouter un produit</button></div></div>
    <div className="cms-product-filters">
      <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Toutes les catégories</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Visibilité<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="all">Tous</option><option value="visible">Visibles</option><option value="hidden">Masqués</option></select></label>
      <label>Stock<select value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">Tous</option><option value="available">En stock</option><option value="low">Stock faible</option><option value="empty">Épuisés</option></select></label>
      <span className="cms-filter-count">{products.length} résultat(s)</span><button type="button" className="cms-secondary" onClick={reset}>Réinitialiser</button>
    </div>
    <div className="cms-table-wrap"><table><thead><tr><th>Produit</th><th>No d’article</th><th>Catégorie</th><th>Prix · {markets[market].label}</th><th>Stock</th><th>Visibilité</th><th></th></tr></thead><tbody>
      {products.map((product) => <tr key={String(product.id)}>
        <td><div className="cms-product-cell">{product.image_url ? <img src={String(product.image_url)} alt="" /> : <span className="cms-product-placeholder">□</span>}<div><strong>{String(product.name_fr)}</strong><small>{String(product.name_en || "")}{product.featured ? " · ★ Vedette" : ""}</small></div></div></td>
        <td><strong className="cms-article-number">{String(product.article_number || "—")}</strong></td><td>{categories[String(product.category)] || String(product.category)}</td><td>{marketPrice(product[`price_${market}`], market)}</td>
        <td><span className={Number(product[`stock_${market}`] || 0) <= Number(product.alert_threshold || 2) ? "cms-stock-alert" : ""}>{String(product[`stock_${market}`] || 0)}</span>{" "}<button className="cms-inline" onClick={() => adjustStock(product)}>Ajuster</button></td>
        <td><span className={`cms-status ${product[`visible_${market}`] ? "available" : "sold"}`}>{product[`visible_${market}`] ? "Visible" : "Masqué"}</span><small>{product.visible_conakry ? "GN " : ""}{product.visible_qc ? "QC" : ""}</small></td>
        <td><button className="cms-inline" onClick={() => edit(product)}>Modifier</button><button className="cms-inline danger" onClick={() => remove(String(product.id))}>Supprimer</button></td>
      </tr>)}
    </tbody></table></div>{!products.length && <p className="cms-empty">Aucun produit trouvé.</p>}
  </section>;
}
