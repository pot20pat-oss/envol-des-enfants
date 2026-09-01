"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { defaultProducts, removedProductNames } from "@/lib/default-catalog";
import {
  defaultSiteSections,
  readSiteSections,
  readSiteTexts,
  type SiteSection,
} from "@/lib/site-editor";
import { markets, type Market } from "@/lib/markets";
import { DashboardSection, SettingsSection, SubscribersSection } from "./admin-sections";
import { OrdersSection, ProductsSection, PromotionsSection, StockSection } from "./admin-commerce-sections";
import { SiteEditor } from "./admin-site-editor";
import { AdminEditModal } from "./admin-edit-modal";
import { blankProduct, labels, orderLabels, request, type Row, type Section } from "./admin-shared";
import "./admin.css";

export default function Administration() {
  const [admin, setAdmin] = useState<{ email: string; name: string } | null>(
    null,
  );
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<Section>("dashboard");
  const [market, setMarket] = useState<Market>("conakry");
  const [products, setProducts] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [promotions, setPromotions] = useState<Row[]>([]);
  const [subscribers, setSubscribers] = useState<Row[]>([]);
  const [movements, setMovements] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [siteSections, setSiteSections] = useState<SiteSection[]>(
    defaultSiteSections.map((item) => ({ ...item })),
  );
  const [siteTexts, setSiteTexts] = useState<Record<string, string>>({});
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editingType, setEditingType] = useState<
    "product" | "promotion" | "order"
  >("product");
  const [search, setSearch] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [productVisibility, setProductVisibility] = useState("all");
  const [productStock, setProductStock] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderDate, setOrderDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
  });
  const quickScrollFrame = useRef<number | null>(null);

  useEffect(() => {
    request("/api/admin/session")
      .then((result) => {
        if (result.authenticated)
          setAdmin(result.admin as { email: string; name: string });
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    if (admin) void load();
  }, [admin, market]);

  async function load() {
    const results = await Promise.allSettled([
      request("/api/admin/products"),
      request(`/api/admin/orders?region=${market}`),
      request(`/api/admin/promotions?region=${market}`),
      request(`/api/admin/subscribers?region=${market}`),
      request("/api/admin/settings"),
      request(`/api/admin/stock?region=${market}`),
      request(`/api/admin/site-versions?region=${market}`),
    ]);
    const loadedProducts =
      results[0].status === "fulfilled"
        ? (results[0].value.products as Row[])
        : null;
    if (loadedProducts) setProducts(loadedProducts);
    if (results[1].status === "fulfilled")
      setOrders(results[1].value.orders as Row[]);
    if (results[2].status === "fulfilled")
      setPromotions(results[2].value.promotions as Row[]);
    if (results[3].status === "fulfilled")
      setSubscribers(results[3].value.subscribers as Row[]);
    if (results[5].status === "fulfilled")
      setMovements(results[5].value.movements as Row[]);
    if (results[6].status === "fulfilled")
      setVersions(results[6].value.versions as Row[]);
    if (results[4].status === "fulfilled") {
      const loadedSettings = results[4].value.settings as Record<
        string,
        string
      >;
      setSettings(loadedSettings);
      setSiteSections(
        readSiteSections(
          loadedSettings[`${market}_site_sections`] ||
            (market === "conakry" ? loadedSettings.site_sections : undefined),
        ),
      );
      setSiteTexts(
        readSiteTexts(
          loadedSettings[`${market}_site_texts`] ||
            (market === "conakry" ? loadedSettings.site_texts : undefined),
        ),
      );
      if (
        loadedProducts?.length === 0 &&
        loadedSettings.catalog_initialized !== "true"
      ) {
        try {
          const result = await request("/api/admin/products/import", {
            method: "POST",
            body: JSON.stringify({ products: defaultProducts }),
          });
          const refreshed = await request("/api/admin/products");
          setProducts(refreshed.products as Row[]);
          setSettings((current) => ({
            ...current,
            catalog_initialized: "true",
          }));
          flash(
            `${Number(result.imported || 0)} produits importés automatiquement depuis la boutique.`,
          );
        } catch (failure) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Import automatique impossible.",
          );
        }
      }
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAdmin(result.admin as { email: string; name: string });
      setPassword("");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Connexion impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await request("/api/admin/session", { method: "DELETE" });
    setAdmin(null);
  }
  function update(field: string, value: string | number | boolean) {
    setEditing((current) =>
      current ? { ...current, [field]: value } : current,
    );
  }
  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const paths = {
        product: "/api/admin/products",
        promotion: "/api/admin/promotions",
        order: "/api/admin/orders",
      };
      await request(paths[editingType], {
        method: editingType === "product" && editing.id ? "PUT" : "POST",
        body: JSON.stringify(editing),
      });
      setEditing(null);
      await load();
      flash("Modifications enregistrées.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Enregistrement impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(type: "products" | "promotions", id: string) {
    if (!window.confirm("Supprimer définitivement cet élément ?")) return;
    await request(`/api/admin/${type}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
    flash("Élément supprimé.");
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await request("/api/admin/upload", {
        method: "POST",
        body: data,
      });
      update("image_url", String(result.url));
      flash("Photo téléversée.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Téléversement impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await request("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(settings),
      });
      flash("Réglages enregistrés.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Enregistrement impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function synchronizeProducts() {
    setBusy(true);
    setError("");
    try {
      const result = await request("/api/admin/products/import", {
        method: "POST",
        body: JSON.stringify({
          products: defaultProducts,
          removedProductNames,
        }),
      });
      await load();
      flash(
        `${Number(result.imported || 0)} produit(s) ajouté(s), ${Number(result.updated || 0)} mis à jour, ${Number(result.removed || 0)} retiré(s).`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Synchronisation impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  function moveSection(id: string, nextIndex: number) {
    setSiteSections((current) => {
      const previousIndex = current.findIndex((item) => item.id === id);
      if (previousIndex < 0 || nextIndex < 0 || nextIndex >= current.length)
        return current;
      const updated = [...current];
      const [moved] = updated.splice(previousIndex, 1);
      updated.splice(nextIndex, 0, moved);
      return updated;
    });
  }

  async function saveSiteEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const changes = {
      [`${market}_site_sections`]: JSON.stringify(siteSections),
      [`${market}_site_texts`]: JSON.stringify(siteTexts),
    };
    try {
      await request("/api/admin/site-versions", {
        method: "POST",
        body: JSON.stringify({
          region: market,
          settings_json: JSON.stringify(changes),
        }),
      });
      await request("/api/admin/settings", {
        method: "POST",
        body: JSON.stringify(changes),
      });
      setSettings((current) => ({ ...current, ...changes }));
      const history = await request(
        `/api/admin/site-versions?region=${market}`,
      );
      setVersions(history.versions as Row[]);
      flash(
        `Site ${markets[market].label} mis à jour : textes, ordre et visibilité enregistrés.`,
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Modification du site impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/password", {
        method: "POST",
        body: JSON.stringify(passwords),
      });
      setPasswords({ current_password: "", new_password: "" });
      flash("Mot de passe modifié.");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Modification impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function adjustStock(product: Row) {
    const current = Number(product[`stock_${market}`] || 0);
    const answer = window.prompt(
      `Nouveau stock pour ${String(product.name_fr)} · ${markets[market].label}`,
      String(current),
    );
    if (answer === null || !/^\d+$/.test(answer.trim())) return;
    const reason =
      window.prompt("Motif de l’ajustement", "Inventaire manuel") ||
      "Inventaire manuel";
    await request("/api/admin/stock", {
      method: "POST",
      body: JSON.stringify({
        product_id: product.id,
        region: market,
        stock: Number(answer),
        reason,
      }),
    });
    await load();
    flash("Stock ajusté et mouvement enregistré.");
  }

  function exportOrders() {
    const rows = [
      [
        "Date",
        "Client",
        "Téléphone",
        "Produit",
        "Quantité",
        "Total",
        "Devise",
        "Statut",
        "Zone",
      ],
      ...filteredOrders.map((order) => [
        order.created_at,
        order.customer_name,
        order.customer_phone,
        order.product_name,
        order.quantity,
        order.total,
        order.currency,
        orderLabels[String(order.status)],
        order.delivery_zone,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `commandes-${market}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function restoreVersion(version: Row) {
    try {
      const snapshot = JSON.parse(String(version.settings_json)) as Record<
        string,
        string
      >;
      setSiteSections(readSiteSections(snapshot[`${market}_site_sections`]));
      setSiteTexts(readSiteTexts(snapshot[`${market}_site_texts`]));
      flash("Version restaurée dans l’éditeur. Enregistrez pour la publier.");
    } catch {
      setError("Cette version ne peut pas être restaurée.");
    }
  }

  function stopQuickScroll() {
    if (quickScrollFrame.current !== null) window.clearInterval(quickScrollFrame.current);
    quickScrollFrame.current = null;
  }

  function startQuickScroll(direction: -1 | 1) {
    stopQuickScroll();
    const startedAt = Date.now();
    const scroll = () => {
      const speed = Math.min(28, 8 + (Date.now() - startedAt) / 180);
      window.scrollBy({ top: direction * speed, behavior: "auto" });
    };
    scroll();
    quickScrollFrame.current = window.setInterval(scroll, 16);
  }

  useEffect(() => {
    const stop = () => stopQuickScroll();
    window.addEventListener("mouseup", stop);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("touchend", stop);
    window.addEventListener("touchcancel", stop);
    window.addEventListener("blur", stop);
    return () => {
      stop();
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("touchend", stop);
      window.removeEventListener("touchcancel", stop);
      window.removeEventListener("blur", stop);
    };
  }, []);

  if (checking)
    return <main className="cms-loading">Chargement de l’administration…</main>;
  if (!admin)
    return (
      <main className="cms-login">
        <form className="cms-login-card" onSubmit={signIn}>
          <img src="/envol-reference.png" alt="Envol des Enfants" />
          <span className="cms-eyebrow">Espace de gestion sécurisé</span>
          <h1>
            Votre boutique,
            <br />
            <em>au bout des doigts.</em>
          </h1>
          <p>
            Connectez-vous pour gérer vos produits, vos commandes et vos
            promotions.
          </p>
          {error && <div className="cms-error">{error}</div>}
          <label>
            Adresse courriel
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button disabled={busy}>
            {busy ? "Connexion…" : "Accéder à mon administration →"}
          </button>
          <a href="/">← Retour à la boutique</a>
        </form>
      </main>
    );

  const regionalProducts = products.filter((item) =>
    Boolean(item[`visible_${market}`]),
  );
  const filtered = products.filter((item) => {
    const matchesSearch = `${item.article_number || ""} ${item.name_fr} ${item.name_en} ${item.category} ${item.brand || ""}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = productCategory === "all" || item.category === productCategory;
    const matchesVisibility = productVisibility === "all" || (productVisibility === "visible" ? Boolean(item[`visible_${market}`]) : !Boolean(item[`visible_${market}`]));
    const stock = Number(item[`stock_${market}`] || 0);
    const matchesStock = productStock === "all" || (productStock === "available" ? stock > 0 : productStock === "low" ? stock > 0 && stock <= Number(item.alert_threshold || 2) : stock <= 0);
    return matchesSearch && matchesCategory && matchesVisibility && matchesStock;
  });
  const filteredOrders = orders.filter(
    (item) =>
      (orderStatus === "all" || item.status === orderStatus) &&
      (!orderDate || String(item.created_at || "").startsWith(orderDate)) &&
      (!search.trim() ||
        `${item.customer_name} ${item.customer_phone} ${item.product_name}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const lowStock = regionalProducts.filter(
    (item) =>
      Number(item[`stock_${market}`] || 0) <= Number(item.alert_threshold || 2),
  );
  const stats = [
    {
      title: `Produits · ${markets[market].label}`,
      value: regionalProducts.length,
      tone: "blue",
    },
    {
      title: "Commandes à traiter",
      value: orders.filter((item) =>
        ["new", "confirmed", "preparing"].includes(String(item.status)),
      ).length,
      tone: "orange",
    },
    { title: "Abonnés", value: subscribers.length, tone: "green" },
    { title: "Alertes de stock", value: lowStock.length, tone: "red" },
  ];

  return (
    <main className="cms-app">
      <aside className="cms-sidebar">
        <a className="cms-logo" href="/">
          <img src="/envol-reference.png" alt="Envol des Enfants" />
        </a>
        <span className="cms-eyebrow">Administration</span>
        <nav>
          {(Object.keys(labels) as Section[]).map((key) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              onClick={() => {
                setSection(key);
                setEditing(null);
                setSearch("");
                setError("");
              }}
            >
              <span>
                {
                  (
                    {
                      dashboard: "◉",
                      products: "▣",
                      stock: "▤",
                      orders: "☷",
                      promotions: "✦",
                      subscribers: "♡",
                      editor: "✎",
                      settings: "⚙",
                    } as Record<Section, string>
                  )[key]
                }
              </span>
              {labels[key]}
            </button>
          ))}
        </nav>
        <div className="cms-account">
          <strong>{admin.name}</strong>
          <small>{admin.email}</small>
          <button onClick={() => void signOut()}>Déconnexion</button>
        </div>
      </aside>
      <div className="cms-main">
        <header className="cms-topbar">
          <div>
            <span className="cms-eyebrow">
              Envol des Enfants · {markets[market].label}
            </span>
            <h1>{labels[section]}</h1>
          </div>
          <div className="cms-top-actions">
            <div
              className="cms-market-switch"
              role="group"
              aria-label="Choisir la boutique"
            >
              <button
                className={market === "conakry" ? "active" : ""}
                onClick={() => setMarket("conakry")}
              >
                Conakry · GNF
              </button>
              <button
                className={market === "qc" ? "active" : ""}
                onClick={() => setMarket("qc")}
              >
                Québec · CAD
              </button>
            </div>
            <a href={`/?region=${market}`} target="_blank">
              Voir la boutique ↗
            </a>
          </div>
        </header>
        {notice && <div className="cms-notice">✓ {notice}</div>}
        {error && <div className="cms-error">{error}</div>}

        {section === "editor" && (<SiteEditor market={market} busy={busy} sections={siteSections} setSections={setSiteSections} texts={siteTexts} setTexts={setSiteTexts} draggedSection={draggedSection} setDraggedSection={setDraggedSection} moveSection={moveSection} versions={versions} restoreVersion={restoreVersion} save={saveSiteEditor} />)}

        {section === "dashboard" && (
          <DashboardSection stats={stats} products={regionalProducts} orders={orders} market={market} goTo={setSection} />
        )}

        {section === "products" && (<ProductsSection products={filtered} market={market} busy={busy} search={search} setSearch={setSearch} category={productCategory} setCategory={setProductCategory} visibility={productVisibility} setVisibility={setProductVisibility} stock={productStock} setStock={setProductStock} synchronize={() => void synchronizeProducts()} add={() => { setEditingType("product"); setEditing({ ...blankProduct, [`visible_${market}`]: true }); }} edit={(product) => { setEditingType("product"); setEditing({ ...product, visible: Boolean(product.visible), visible_qc: Boolean(product.visible_qc), visible_conakry: Boolean(product.visible_conakry), featured: Boolean(product.featured) }); }} adjustStock={(product) => void adjustStock(product)} remove={(id) => void remove("products", id)} />)}

        {section === "stock" && (<StockSection products={lowStock} movements={movements} market={market} adjustStock={(product) => void adjustStock(product)} />)}

        {section === "orders" && (<OrdersSection orders={filteredOrders} market={market} search={search} setSearch={setSearch} status={orderStatus} setStatus={setOrderStatus} date={orderDate} setDate={setOrderDate} exportOrders={exportOrders} add={() => { setEditingType("order"); setEditing({ customer_name: "", customer_phone: "", product_name: "", quantity: 1, total: 0, status: "new", notes: "", region: market, currency: markets[market].currency, delivery_zone: "" }); }} edit={(order) => { setEditingType("order"); setEditing({ ...order }); }} />)}

        {section === "promotions" && (<PromotionsSection promotions={promotions} market={market} add={() => { setEditingType("promotion"); setEditing({ title_fr: "", title_en: "", description_fr: "", description_en: "", discount_percent: 10, discount_type: "percent", discount_amount: 0, minimum_purchase: 0, usage_limit: 0, promo_code: "", region: market, active: true, starts_at: "", ends_at: "" }); }} edit={(promotion) => { setEditingType("promotion"); setEditing({ ...promotion, active: Boolean(promotion.active) }); }} remove={(id) => void remove("promotions", id)} />)}

        {section === "subscribers" && (
          <SubscribersSection subscribers={subscribers} />
        )}

        {section === "settings" && (
          <SettingsSection market={market} settings={settings} setSettings={setSettings} passwords={passwords} setPasswords={setPasswords} busy={busy} saveSettings={saveSettings} changePassword={changePassword} />
        )}

        <div className="cms-quick-scroll" aria-label="Défilement rapide">
          <button type="button" aria-label="Revenir complètement en haut" title="Retour en haut" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
          <button type="button" aria-label="Aller complètement en bas" title="Aller en bas" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}>↓</button>
        </div>

        {editing && <AdminEditModal editing={editing} editingType={editingType} setEditing={setEditing} save={save} update={update} upload={upload} busy={busy} market={market} products={products} />}
      </div>
    </main>
  );
}
