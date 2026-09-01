import { marketPrice, markets, type Market } from "@/lib/markets";
import type { Row } from "./admin-shared";
import { categories, orderLabels } from "./admin-shared";

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

export function StockSection({ products, movements, market, adjustStock }: { products: Row[]; movements: Row[]; market: Market; adjustStock: (product: Row) => void }) {
  return <>
    <section className="cms-panel"><div className="cms-panel-title"><h2>Alertes de stock · {markets[market].label}</h2><span>{products.length} produit(s)</span></div><div className="cms-table-wrap"><table><thead><tr><th>Produit</th><th>Stock actuel</th><th>Seuil d’alerte</th><th></th></tr></thead><tbody>{products.map((product) => <tr key={String(product.id)}><td><strong>{String(product.name_fr)}</strong></td><td><span className="cms-stock-alert">{String(product[`stock_${market}`] || 0)}</span></td><td>{String(product.alert_threshold || 2)}</td><td><button className="cms-inline" onClick={() => adjustStock(product)}>Ajuster le stock</button></td></tr>)}</tbody></table></div>{!products.length && <p className="cms-empty">Aucune alerte de stock pour cette boutique.</p>}</section>
    <section className="cms-panel cms-stock-history"><div className="cms-panel-title"><h2>Historique des mouvements</h2></div><div className="cms-table-wrap"><table><thead><tr><th>Date</th><th>Produit</th><th>Variation</th><th>Nouveau stock</th><th>Motif</th></tr></thead><tbody>{movements.map((movement) => <tr key={String(movement.id)}><td>{new Date(String(movement.created_at)).toLocaleString("fr-CA")}</td><td>{String(movement.product_name)}</td><td className={Number(movement.delta) < 0 ? "cms-stock-alert" : "cms-stock-added"}>{Number(movement.delta) > 0 ? "+" : ""}{String(movement.delta)}</td><td>{String(movement.new_stock)}</td><td>{String(movement.reason)}</td></tr>)}</tbody></table></div>{!movements.length && <p className="cms-empty">Les ajustements apparaîtront ici.</p>}</section>
  </>;
}

export function OrdersSection({ orders, market, search, setSearch, status, setStatus, date, setDate, exportOrders, add, edit }: {
  orders: Row[]; market: Market; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; date: string; setDate: (value: string) => void; exportOrders: () => void; add: () => void; edit: (order: Row) => void;
}) {
  return <section className="cms-panel">
    <div className="cms-panel-title"><h2>Suivi des commandes · {markets[market].label}</h2><div className="cms-product-actions"><button className="cms-secondary" onClick={exportOrders}>Exporter CSV</button><button className="cms-secondary" onClick={() => window.print()}>Imprimer / PDF</button><button className="cms-primary" onClick={add}>+ Nouvelle commande</button></div></div>
    <div className="cms-order-filters"><input className="cms-search" placeholder="Client, téléphone ou produit…" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tous les statuts</option>{Object.entries(orderLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
    <div className="cms-table-wrap"><table><thead><tr><th>Date</th><th>Client</th><th>Produit</th><th>Total</th><th>Statut</th><th></th></tr></thead><tbody>{orders.map((order) => <tr key={String(order.id)}><td>{new Date(String(order.created_at)).toLocaleDateString("fr-CA")}</td><td><strong>{String(order.customer_name)}</strong><small>{String(order.customer_phone)}</small></td><td>{String(order.product_name)}</td><td>{marketPrice(order.total, market)}</td><td><span className={`cms-status ${String(order.status)}`}>{orderLabels[String(order.status)]}</span></td><td><button className="cms-inline" onClick={() => edit(order)}>Modifier</button></td></tr>)}</tbody></table></div>
    {!orders.length && <p className="cms-empty">Aucune commande ne correspond à vos filtres.</p>}
  </section>;
}

export function PromotionsSection({ promotions, market, add, edit, remove }: { promotions: Row[]; market: Market; add: () => void; edit: (promotion: Row) => void; remove: (id: string) => void }) {
  return <section className="cms-panel"><div className="cms-panel-title"><h2>Offres et réductions · {markets[market].label}</h2><button className="cms-primary" onClick={add}>+ Créer une promotion</button></div>
    {promotions.map((promotion) => <article className="cms-promo" key={String(promotion.id)}><div><span className="cms-promo-badge">−{promotion.discount_type === "amount" ? marketPrice(promotion.discount_amount, market) : `${String(promotion.discount_percent)} %`}</span><h3>{String(promotion.title_fr)} {promotion.promo_code && <small>· {String(promotion.promo_code)}</small>}</h3><p>{String(promotion.description_fr)}</p><p>{promotion.region === "both" ? "Les deux boutiques" : markets[promotion.region === "qc" ? "qc" : "conakry"].label} · {String(promotion.usage_count || 0)} utilisation(s){promotion.usage_limit ? ` / ${String(promotion.usage_limit)}` : ""}</p></div><div><span className={`cms-status ${promotion.active ? "available" : "sold"}`}>{promotion.active ? "Active" : "Inactive"}</span><button className="cms-inline" onClick={() => edit(promotion)}>Modifier</button><button className="cms-inline danger" onClick={() => remove(String(promotion.id))}>Supprimer</button></div></article>)}
    {!promotions.length && <p className="cms-empty">Aucune promotion créée pour cette boutique.</p>}
  </section>;
}
