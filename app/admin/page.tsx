"use client";

import { useEffect, useState, type FormEvent } from "react";
import "./admin.css";

type Row = Record<string, string | number | boolean | null>;
type Section = "dashboard" | "products" | "orders" | "promotions" | "subscribers" | "settings";

const categories: Record<string, string> = { eveil: "Jouets éducatifs", poupees: "Mon monde de poupées", bebe: "Bébé", vetements: "Vêtements", chaussures: "Chaussures", scolaire: "Fournitures scolaires", sacs: "Sacs et gourdes", vehicules: "Véhicules" };
const labels: Record<Section, string> = { dashboard: "Tableau de bord", products: "Produits", orders: "Commandes", promotions: "Promotions", subscribers: "Abonnés", settings: "Réglages" };
const blankProduct: Row = { name_fr: "", name_en: "", description_fr: "", description_en: "", category: "eveil", price: 0, stock: 1, status: "available", badge: "", ages: "3+", image_url: "", brand: "", material: "", dimensions: "", exchange_terms_fr: "", exchange_terms_en: "", visible: true };
const formatPrice = (value: unknown) => `${Number(value || 0).toLocaleString("fr-GN")} GNF`;

async function request(path: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(path, { ...options, headers: options.body instanceof FormData ? options.headers : { "Content-Type": "application/json", ...options.headers } });
  const result = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Une erreur est survenue.");
  return result;
}

export default function Administration() {
  const [admin, setAdmin] = useState<{ email: string; name: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<Section>("dashboard");
  const [products, setProducts] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [promotions, setPromotions] = useState<Row[]>([]);
  const [subscribers, setSubscribers] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | null>(null);
  const [editingType, setEditingType] = useState<"product" | "promotion" | "order">("product");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });

  useEffect(() => { request("/api/admin/session").then((result) => { if (result.authenticated) setAdmin(result.admin as { email: string; name: string }); }).catch(() => {}).finally(() => setChecking(false)); }, []);
  useEffect(() => { if (admin) void load(); }, [admin]);

  async function load() {
    const results = await Promise.allSettled([request("/api/admin/products"), request("/api/admin/orders"), request("/api/admin/promotions"), request("/api/admin/subscribers"), request("/api/admin/settings")]);
    if (results[0].status === "fulfilled") setProducts(results[0].value.products as Row[]);
    if (results[1].status === "fulfilled") setOrders(results[1].value.orders as Row[]);
    if (results[2].status === "fulfilled") setPromotions(results[2].value.promotions as Row[]);
    if (results[3].status === "fulfilled") setSubscribers(results[3].value.subscribers as Row[]);
    if (results[4].status === "fulfilled") setSettings(results[4].value.settings as Record<string, string>);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await request("/api/admin/session", { method: "POST", body: JSON.stringify({ email, password }) }); setAdmin(result.admin as { email: string; name: string }); setPassword(""); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }

  async function signOut() { await request("/api/admin/session", { method: "DELETE" }); setAdmin(null); }
  function update(field: string, value: string | number | boolean) { setEditing((current) => current ? { ...current, [field]: value } : current); }
  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3500); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setBusy(true); setError("");
    try {
      const paths = { product: "/api/admin/products", promotion: "/api/admin/promotions", order: "/api/admin/orders" };
      await request(paths[editingType], { method: editingType === "product" && editing.id ? "PUT" : "POST", body: JSON.stringify(editing) });
      setEditing(null); await load(); flash("Modifications enregistrées.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }

  async function remove(type: "products" | "promotions", id: string) {
    if (!window.confirm("Supprimer définitivement cet élément ?")) return;
    await request(`/api/admin/${type}?id=${encodeURIComponent(id)}`, { method: "DELETE" }); await load(); flash("Élément supprimé.");
  }

  async function upload(file?: File) {
    if (!file) return; setBusy(true);
    try { const data = new FormData(); data.append("file", file); const result = await request("/api/admin/upload", { method: "POST", body: data }); update("image_url", String(result.url)); flash("Photo téléversée."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Téléversement impossible."); }
    finally { setBusy(false); }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try { await request("/api/admin/settings", { method: "POST", body: JSON.stringify(settings) }); flash("Réglages enregistrés."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request("/api/admin/password", { method: "POST", body: JSON.stringify(passwords) }); setPasswords({ current_password: "", new_password: "" }); flash("Mot de passe modifié."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Modification impossible."); }
    finally { setBusy(false); }
  }

  if (checking) return <main className="cms-loading">Chargement de l’administration…</main>;
  if (!admin) return <main className="cms-login"><form className="cms-login-card" onSubmit={signIn}><img src="/envol-reference.png" alt="Envol des Enfants"/><span className="cms-eyebrow">Espace de gestion sécurisé</span><h1>Votre boutique,<br/><em>au bout des doigts.</em></h1><p>Connectez-vous pour gérer vos produits, vos commandes et vos promotions.</p>{error && <div className="cms-error">{error}</div>}<label>Adresse courriel<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button disabled={busy}>{busy ? "Connexion…" : "Accéder à mon administration →"}</button><a href="/">← Retour à la boutique</a></form></main>;

  const filtered = products.filter((item) => `${item.name_fr} ${item.name_en} ${item.category}`.toLowerCase().includes(search.toLowerCase()));
  const stats = [{ title: "Produits en catalogue", value: products.length, tone: "blue" }, { title: "Commandes à traiter", value: orders.filter((item) => item.status === "new").length, tone: "orange" }, { title: "Abonnés", value: subscribers.length, tone: "green" }, { title: "Produits en rupture", value: products.filter((item) => Number(item.stock) === 0 || item.status === "sold").length, tone: "red" }];

  return <main className="cms-app"><aside className="cms-sidebar"><a className="cms-logo" href="/"><img src="/envol-reference.png" alt="Envol des Enfants"/></a><span className="cms-eyebrow">Administration</span><nav>{(Object.keys(labels) as Section[]).map((key) => <button key={key} className={section === key ? "active" : ""} onClick={() => { setSection(key); setEditing(null); setError(""); }}><span>{({ dashboard: "◉", products: "▣", orders: "☷", promotions: "✦", subscribers: "♡", settings: "⚙" } as Record<Section,string>)[key]}</span>{labels[key]}</button>)}</nav><div className="cms-account"><strong>{admin.name}</strong><small>{admin.email}</small><button onClick={() => void signOut()}>Déconnexion</button></div></aside><div className="cms-main"><header className="cms-topbar"><div><span className="cms-eyebrow">Envol des Enfants · Conakry</span><h1>{labels[section]}</h1></div><a href="/" target="_blank">Voir la boutique ↗</a></header>{notice && <div className="cms-notice">✓ {notice}</div>}{error && <div className="cms-error">{error}</div>}

  {section === "dashboard" && <><div className="cms-stats">{stats.map((stat) => <article className={`cms-stat ${stat.tone}`} key={stat.title}><span>{stat.title}</span><strong>{stat.value}</strong></article>)}</div><div className="cms-dashboard-grid"><section className="cms-panel"><div className="cms-panel-title"><h2>Derniers produits</h2><button onClick={() => setSection("products")}>Tout voir →</button></div>{products.length ? products.slice(0, 6).map((product) => <div className="cms-list-item" key={String(product.id)}><strong>{String(product.name_fr)}</strong><span>{formatPrice(product.price)}</span></div>) : <p className="cms-empty">Ajoutez votre premier produit pour alimenter votre catalogue.</p>}</section><section className="cms-panel"><div className="cms-panel-title"><h2>Commandes récentes</h2><button onClick={() => setSection("orders")}>Tout voir →</button></div>{orders.length ? orders.slice(0, 6).map((order) => <div className="cms-list-item" key={String(order.id)}><strong>{String(order.customer_name)}</strong><span>{String(order.product_name)}</span></div>) : <p className="cms-empty">Aucune commande enregistrée pour le moment.</p>}</section></div></>}

  {section === "products" && <section className="cms-panel"><div className="cms-panel-title"><input className="cms-search" placeholder="Rechercher un produit…" value={search} onChange={(event) => setSearch(event.target.value)}/><button className="cms-primary" onClick={() => { setEditingType("product"); setEditing({ ...blankProduct }); }}>+ Ajouter un produit</button></div><div className="cms-table-wrap"><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>État</th><th></th></tr></thead><tbody>{filtered.map((product) => <tr key={String(product.id)}><td><strong>{String(product.name_fr)}</strong><small>{String(product.name_en || "")}</small></td><td>{categories[String(product.category)] || String(product.category)}</td><td>{formatPrice(product.price)}</td><td>{String(product.stock)}</td><td><span className={`cms-status ${product.status}`}>{({ available: "Disponible", reserved: "Réservé", sold: "Épuisé" } as Record<string,string>)[String(product.status)]}</span></td><td><button className="cms-inline" onClick={() => { setEditingType("product"); setEditing({ ...product, visible: Boolean(product.visible) }); }}>Modifier</button><button className="cms-inline danger" onClick={() => void remove("products", String(product.id))}>Supprimer</button></td></tr>)}</tbody></table></div>{!filtered.length && <p className="cms-empty">Aucun produit trouvé.</p>}</section>}

  {section === "orders" && <section className="cms-panel"><div className="cms-panel-title"><h2>Suivi des commandes</h2><button className="cms-primary" onClick={() => { setEditingType("order"); setEditing({ customer_name: "", customer_phone: "", product_name: "", quantity: 1, total: 0, status: "new", notes: "" }); }}>+ Nouvelle commande</button></div><div className="cms-table-wrap"><table><thead><tr><th>Client</th><th>Produit</th><th>Total</th><th>Statut</th><th></th></tr></thead><tbody>{orders.map((order) => <tr key={String(order.id)}><td><strong>{String(order.customer_name)}</strong><small>{String(order.customer_phone)}</small></td><td>{String(order.product_name)}</td><td>{formatPrice(order.total)}</td><td><span className={`cms-status ${String(order.status)}`}>{({ new: "Nouvelle", preparing: "En préparation", delivered: "Livrée", cancelled: "Annulée" } as Record<string,string>)[String(order.status)]}</span></td><td><button className="cms-inline" onClick={() => { setEditingType("order"); setEditing({ ...order }); }}>Modifier</button></td></tr>)}</tbody></table></div>{!orders.length && <p className="cms-empty">Aucune commande enregistrée.</p>}</section>}

  {section === "promotions" && <section className="cms-panel"><div className="cms-panel-title"><h2>Offres et réductions</h2><button className="cms-primary" onClick={() => { setEditingType("promotion"); setEditing({ title_fr: "", title_en: "", description_fr: "", description_en: "", discount_percent: 10, active: true, starts_at: "", ends_at: "" }); }}>+ Créer une promotion</button></div>{promotions.map((promotion) => <article className="cms-promo" key={String(promotion.id)}><div><span className="cms-promo-badge">−{String(promotion.discount_percent)} %</span><h3>{String(promotion.title_fr)}</h3><p>{String(promotion.description_fr)}</p></div><div><span className={`cms-status ${promotion.active ? "available" : "sold"}`}>{promotion.active ? "Active" : "Inactive"}</span><button className="cms-inline" onClick={() => { setEditingType("promotion"); setEditing({ ...promotion, active: Boolean(promotion.active) }); }}>Modifier</button><button className="cms-inline danger" onClick={() => void remove("promotions", String(promotion.id))}>Supprimer</button></div></article>)}{!promotions.length && <p className="cms-empty">Aucune promotion créée.</p>}</section>}

  {section === "subscribers" && <section className="cms-panel"><div className="cms-panel-title"><h2>Abonnés à l’offre de bienvenue</h2><span>{subscribers.length} inscription{subscribers.length > 1 ? "s" : ""}</span></div><div className="cms-table-wrap"><table><thead><tr><th>Adresse courriel</th><th>Langue</th><th>Consentement</th><th>Inscription</th></tr></thead><tbody>{subscribers.map((subscriber) => <tr key={String(subscriber.id)}><td><strong>{String(subscriber.email)}</strong></td><td>{String(subscriber.language).toUpperCase()}</td><td>{subscriber.consent ? "✓ Confirmé" : "Non"}</td><td>{new Date(String(subscriber.created_at)).toLocaleDateString("fr-CA")}</td></tr>)}</tbody></table></div>{!subscribers.length && <p className="cms-empty">Les nouvelles inscriptions apparaîtront ici.</p>}</section>}

  {section === "settings" && <div className="cms-settings-grid"><form className="cms-panel cms-form" onSubmit={saveSettings}><h2>Informations de la boutique</h2>{([["store_name", "Nom commercial"], ["phone", "Téléphone"], ["whatsapp", "Numéro WhatsApp"], ["facebook", "Page Facebook"], ["address", "Adresse de la boutique"], ["opening_hours", "Horaires d’ouverture"], ["welcome_discount", "Rabais de bienvenue (%)"], ["delivery_conditions", "Conditions de livraison"]] as const).map(([key,label]) => <label key={key}>{label}<input value={settings[key] || ""} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))}/></label>)}<button className="cms-primary" disabled={busy}>Enregistrer les réglages</button></form><form className="cms-panel cms-form" onSubmit={changePassword}><h2>Modifier mon mot de passe</h2><label>Mot de passe actuel<input type="password" autoComplete="current-password" value={passwords.current_password} onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))} required/></label><label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={12} value={passwords.new_password} onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))} required/></label><p>Utilisez au moins 12 caractères. Chaque administrateur possède son propre mot de passe.</p><button className="cms-primary" disabled={busy}>Modifier mon mot de passe</button></form></div>}

  {editing && <div className="cms-overlay" onClick={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><form className="cms-editor cms-form" onSubmit={save}><div className="cms-panel-title"><h2>{editing.id ? "Modifier" : "Ajouter"} {editingType === "product" ? "un produit" : editingType === "promotion" ? "une promotion" : "une commande"}</h2><button type="button" className="cms-close" onClick={() => setEditing(null)}>×</button></div>
    {editingType === "product" && <><div className="cms-form-grid"><label>Nom du produit · FR<input value={String(editing.name_fr || "")} onChange={(event) => update("name_fr", event.target.value)} required/></label><label>Product name · EN<input value={String(editing.name_en || "")} onChange={(event) => update("name_en", event.target.value)}/></label></div><div className="cms-form-grid"><label>Catégorie<select value={String(editing.category || "eveil")} onChange={(event) => update("category", event.target.value)}>{Object.entries(categories).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Âge conseillé<input value={String(editing.ages || "")} onChange={(event) => update("ages", event.target.value)}/></label></div><div className="cms-form-grid"><label>Prix · GNF<input type="number" min={0} value={Number(editing.price || 0)} onChange={(event) => update("price", Number(event.target.value))} required/></label><label>Quantité en stock<input type="number" min={0} value={Number(editing.stock || 0)} onChange={(event) => update("stock", Number(event.target.value))}/></label></div><div className="cms-form-grid"><label>Disponibilité<select value={String(editing.status || "available")} onChange={(event) => update("status", event.target.value)}><option value="available">Disponible</option><option value="reserved">Réservé</option><option value="sold">Épuisé</option></select></label><label>Étiquette<select value={String(editing.badge || "")} onChange={(event) => update("badge", event.target.value)}><option value="">Aucune</option><option value="new">Nouveauté</option><option value="school">Rentrée scolaire</option></select></label></div><label>Description · FR<textarea value={String(editing.description_fr || "")} onChange={(event) => update("description_fr", event.target.value)}/></label><label>Description · EN<textarea value={String(editing.description_en || "")} onChange={(event) => update("description_en", event.target.value)}/></label><div className="cms-form-grid"><label>Marque<input value={String(editing.brand || "")} onChange={(event) => update("brand", event.target.value)}/></label><label>Matière<input value={String(editing.material || "")} onChange={(event) => update("material", event.target.value)}/></label></div><label>Dimensions<input value={String(editing.dimensions || "")} onChange={(event) => update("dimensions", event.target.value)}/></label><label>Photo du produit<input type="file" accept="image/*" onChange={(event) => void upload(event.target.files?.[0])}/></label>{editing.image_url && <img className="cms-image-preview" src={String(editing.image_url)} alt="Aperçu du produit"/>}<label>Conditions d’échange · FR<textarea value={String(editing.exchange_terms_fr || "")} onChange={(event) => update("exchange_terms_fr", event.target.value)}/></label><label>Exchange terms · EN<textarea value={String(editing.exchange_terms_en || "")} onChange={(event) => update("exchange_terms_en", event.target.value)}/></label><label className="cms-checkbox"><input type="checkbox" checked={Boolean(editing.visible)} onChange={(event) => update("visible", event.target.checked)}/> Afficher ce produit dans la boutique</label></>}
    {editingType === "promotion" && <><div className="cms-form-grid"><label>Titre · FR<input value={String(editing.title_fr || "")} onChange={(event) => update("title_fr", event.target.value)} required/></label><label>Title · EN<input value={String(editing.title_en || "")} onChange={(event) => update("title_en", event.target.value)}/></label></div><label>Description · FR<textarea value={String(editing.description_fr || "")} onChange={(event) => update("description_fr", event.target.value)}/></label><label>Description · EN<textarea value={String(editing.description_en || "")} onChange={(event) => update("description_en", event.target.value)}/></label><label>Pourcentage de rabais<input type="number" min={0} max={100} value={Number(editing.discount_percent || 0)} onChange={(event) => update("discount_percent", Number(event.target.value))}/></label><div className="cms-form-grid"><label>Début<input type="date" value={String(editing.starts_at || "")} onChange={(event) => update("starts_at", event.target.value)}/></label><label>Fin<input type="date" value={String(editing.ends_at || "")} onChange={(event) => update("ends_at", event.target.value)}/></label></div><label className="cms-checkbox"><input type="checkbox" checked={Boolean(editing.active)} onChange={(event) => update("active", event.target.checked)}/> Promotion active</label></>}
    {editingType === "order" && <><div className="cms-form-grid"><label>Nom du client<input value={String(editing.customer_name || "")} onChange={(event) => update("customer_name", event.target.value)} required/></label><label>Téléphone<input value={String(editing.customer_phone || "")} onChange={(event) => update("customer_phone", event.target.value)} required/></label></div><label>Produit commandé<input value={String(editing.product_name || "")} onChange={(event) => update("product_name", event.target.value)} required/></label><div className="cms-form-grid"><label>Quantité<input type="number" min={1} value={Number(editing.quantity || 1)} onChange={(event) => update("quantity", Number(event.target.value))}/></label><label>Total · GNF<input type="number" min={0} value={Number(editing.total || 0)} onChange={(event) => update("total", Number(event.target.value))}/></label></div><label>Statut<select value={String(editing.status || "new")} onChange={(event) => update("status", event.target.value)}><option value="new">Nouvelle</option><option value="preparing">En préparation</option><option value="delivered">Livrée</option><option value="cancelled">Annulée</option></select></label><label>Notes<textarea value={String(editing.notes || "")} onChange={(event) => update("notes", event.target.value)}/></label></>}
    <div className="cms-editor-actions"><button type="button" className="cms-secondary" onClick={() => setEditing(null)}>Annuler</button><button className="cms-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button></div></form></div>}
  </div></main>;
}
