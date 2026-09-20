import { marketPrice, markets, type Market } from "@/lib/markets";
import { orderLabels, type Row } from "./admin-shared";

type OrderItem = {
  article_number?: string;
  name?: string;
  quantity?: number;
};

function orderItems(order: Row): OrderItem[] {
  try {
    const parsed = JSON.parse(String(order.items_json || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function OrdersSection({ orders, market, search, setSearch, status, setStatus, date, setDate, exportOrders, add, edit, remove }: {
  orders: Row[]; market: Market; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; date: string; setDate: (value: string) => void; exportOrders: () => void; add: () => void; edit: (order: Row) => void; remove: (order: Row) => void;
}) {
  return <section className="cms-panel">
    <div className="cms-panel-title"><h2>Suivi des commandes · {markets[market].label}</h2><div className="cms-product-actions"><button className="cms-secondary" onClick={exportOrders}>Exporter CSV</button><button className="cms-secondary" onClick={() => window.print()}>Imprimer / PDF</button><button className="cms-primary" onClick={add}>+ Nouvelle commande</button></div></div>
    <div className="cms-order-filters"><input className="cms-search" placeholder="Client, téléphone, no d’article ou produit…" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tous les statuts</option>{Object.entries(orderLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
    <div className="cms-table-wrap"><table><thead><tr><th>Date</th><th>Client</th><th>Panier / produits</th><th>Total</th><th>Statut</th><th></th></tr></thead><tbody>{orders.map((order) => {
      const items = orderItems(order);
      return <tr key={String(order.id)}><td>{new Date(String(order.created_at)).toLocaleDateString("fr-CA")}</td><td><strong>{String(order.customer_name)}</strong><small>{String(order.customer_phone)}</small>{order.customer_email&&<small>{String(order.customer_email)}</small>}{order.delivery_address&&<small>{String(order.delivery_address)}</small>}</td><td>{items.length ? items.map((item, index) => <div key={index}><strong>{Number(item.quantity || 1)}× {String(item.name || "")}</strong>{item.article_number && <small>No d’article : {item.article_number}</small>}</div>) : String(order.product_name)}{order.source==="storefront"&&<small>Commande envoyée depuis le panier client</small>}</td><td>{marketPrice(order.total, market)}</td><td><span className={`cms-status ${String(order.status)}`}>{orderLabels[String(order.status)]}</span></td><td><button className="cms-inline" onClick={() => edit(order)}>Modifier</button>{String(order.status)==="cancelled"&&<button className="cms-danger" onClick={() => remove(order)}>Supprimer</button>}</td></tr>;
    })}</tbody></table></div>
    {!orders.length && <p className="cms-empty">Aucune commande ne correspond à vos filtres.</p>}
  </section>;
}
