import { marketPrice, markets, type Market } from "@/lib/markets";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Row, Section } from "./admin-shared";

export function DashboardSection({ stats, products, orders, market, goTo }: {
  stats: { title: string; value: number; tone: string }[];
  products: Row[];
  orders: Row[];
  market: Market;
  goTo: (section: Section) => void;
}) {
  return <>
    <div className="cms-stats">{stats.map((stat, index) => { const target: Section = index === 0 ? "products" : index === 1 ? "orders" : index === 2 ? "subscribers" : "stock"; return <button type="button" className={`cms-stat ${stat.tone}`} key={stat.title} onClick={() => goTo(target)} style={{ textAlign: "left", cursor: "pointer" }}><span>{stat.title}</span><strong>{stat.value}</strong></button>; })}</div>
    <div className="cms-dashboard-grid">
      <section className="cms-panel">
        <div className="cms-panel-title"><h2>Derniers produits · {markets[market].label}</h2><button onClick={() => goTo("products")}>Tout voir →</button></div>
        {products.length ? products.slice(0, 6).map((product) => <div className="cms-list-item" key={String(product.id)}><strong>{String(product.name_fr)}</strong><span>{marketPrice(product[`price_${market}`], market)}</span></div>) : <p className="cms-empty">Aucun produit activé pour cette boutique.</p>}
      </section>
      <section className="cms-panel">
        <div className="cms-panel-title"><h2>Commandes récentes</h2><button onClick={() => goTo("orders")}>Tout voir →</button></div>
        {orders.length ? orders.slice(0, 6).map((order) => <div className="cms-list-item" key={String(order.id)}><strong>{String(order.customer_name)}</strong><span>{String(order.product_name)}</span></div>) : <p className="cms-empty">Aucune commande enregistrée pour cette région.</p>}
      </section>
    </div>
  </>;
}


export function CustomersSection({ customers, orders, market, remove }: { customers: Row[]; orders: Row[]; market: Market; remove: (id: string) => void }) {
  return <section className="cms-panel">
    <div className="cms-panel-title"><h2>Tous les clients</h2><span>{customers.length} compte{customers.length === 1 ? "" : "s"}</span></div>
    <div className="cms-table-wrap"><table><thead><tr><th>Client</th><th>Boutique</th><th>Coordonnées</th><th>Adresse</th><th>Commandes</th><th>Inscription</th><th>Action</th></tr></thead><tbody>
      {customers.map((customer) => {
        const email = String(customer.email || "").toLowerCase();
        const customerOrders = orders.filter((order) => String(order.customer_email || "").toLowerCase() === email);
        return <tr key={String(customer.id)}>
          <td><strong>{String(customer.name || "Sans nom")}</strong><br/><small>{String(customer.email || "")}</small></td>
          <td>{String(customer.region) === "qc" ? "Québec" : "Conakry"}</td>\n          <td>{String(customer.phone || "—")}</td>
          <td>{String(customer.address || "—")}</td>
          <td><strong>{Number(customer.order_count || customerOrders.length)}</strong>{customerOrders.length > 0 && <><br/><small>{customerOrders.slice(0, 3).map((order) => String(order.product_name)).join(" · ")}</small></>}</td>
          <td>{customer.created_at ? new Date(String(customer.created_at)).toLocaleDateString("fr-CA") : "—"}</td>
          <td><button type="button" className="cms-danger" onClick={() => remove(String(customer.id))}>Supprimer</button></td>
        </tr>;
      })}
    </tbody></table></div>
    {!customers.length && <p className="cms-empty">Aucun compte client enregistré pour cette boutique.</p>}
  </section>;
}

export function SubscribersSection({ subscribers, remove }: { subscribers: Row[]; remove: (id: string) => void }) {
  return <section className="cms-panel">
    <div className="cms-panel-title"><h2>Abonnés à l’offre de bienvenue</h2><span>{subscribers.length} inscription{subscribers.length > 1 ? "s" : ""}</span></div>
    <div className="cms-table-wrap"><table><thead><tr><th>Adresse courriel</th><th>Langue</th><th>Consentement</th><th>Inscription</th></tr></thead><tbody>
      {subscribers.map((subscriber) => <tr key={String(subscriber.id)}><td><strong>{String(subscriber.email)}</strong></td><td>{String(subscriber.language).toUpperCase()}</td><td>{subscriber.consent ? "✓ Confirmé" : "Non"}</td><td>{new Date(String(subscriber.created_at)).toLocaleDateString("fr-CA")}</td><td><button type="button" className="cms-danger" onClick={() => remove(String(subscriber.id))}>Supprimer</button></td></tr>)}
    </tbody></table></div>
    {!subscribers.length && <p className="cms-empty">Les nouvelles inscriptions apparaîtront ici.</p>}
  </section>;
}

export function SettingsSection({ market, settings, setSettings, passwords, setPasswords, busy, saveSettings, changePassword }: {
  market: Market;
  settings: Record<string, string>;
  setSettings: Dispatch<SetStateAction<Record<string, string>>>;
  passwords: { current_password: string; new_password: string };
  setPasswords: Dispatch<SetStateAction<{ current_password: string; new_password: string }>>;
  busy: boolean;
  saveSettings: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  changePassword: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const fields = [["store_name", "Nom commercial"], ["phone", "Téléphone"], ["whatsapp", "Numéro WhatsApp"], ["facebook", "Page Facebook"], ["address", "Adresse de la boutique"], ["map_url", "Lien Google Maps"], ["opening_hours", "Horaires d’ouverture"], ["welcome_discount", "Rabais de bienvenue (%)"], ["delivery_conditions", "Conditions de livraison"], ["delivery_zones", "Zones et quartiers desservis"], ["order_notification_email", "Courriel recevant les notifications de nouvelles commandes"]] as const;
  return <div className="cms-settings-grid">
    <form className="cms-panel cms-form" onSubmit={saveSettings}>
      <h2>Informations de la boutique · {markets[market].label}</h2><p>Ces coordonnées, horaires, livraisons et préférences ne s’appliquent qu’à la boutique {markets[market].label}.</p>
      {fields.map(([key, label]) => <label key={key}>{label}<input value={settings[`${market}_${key}`] ?? (market === "conakry" ? settings[key] || "" : "")} onChange={(event) => setSettings((current) => ({ ...current, [`${market}_${key}`]: event.target.value }))} /></label>)}
      <button className="cms-primary" disabled={busy}>Enregistrer les réglages · {markets[market].label}</button>
    </form>
    <form className="cms-panel cms-form" onSubmit={changePassword}>
      <h2>Modifier mon mot de passe</h2>
      <label>Mot de passe actuel<input type="password" autoComplete="current-password" value={passwords.current_password} onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))} required /></label>
      <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={12} value={passwords.new_password} onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))} required /></label>
      <p>Utilisez au moins 12 caractères. Chaque administrateur possède son propre mot de passe.</p><button className="cms-primary" disabled={busy}>Modifier mon mot de passe</button>
    </form>
  </div>;
}
