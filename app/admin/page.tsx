"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { defaultProducts, removedProductNames } from "@/lib/default-catalog";
import {
  defaultSiteSections,
  editableTexts,
  readSiteSections,
  readSiteTexts,
  type SiteSection,
} from "@/lib/site-editor";
import { marketPrice, markets, type Market } from "@/lib/markets";
import "./admin.css";

type Row = Record<string, string | number | boolean | null>;
type Section =
  | "dashboard"
  | "products"
  | "stock"
  | "orders"
  | "promotions"
  | "subscribers"
  | "editor"
  | "settings";

const categories: Record<string, string> = {
  eveil: "Jouets éducatifs",
  poupees: "Mon monde de poupées et princesses",
  disney: "Disney · Poupées et princesses",
  barbie: "Barbie · Poupées et princesses",
  piscine: "Piscine & jeux d’eau",
  imitation: "Métiers & imitation",
  dinosaures: "Dinosaures & aventures",
  animaux: "Animaux & compagnons",
  bebe: "Bébé",
  vetements: "Vêtements",
  chaussures: "Chaussures",
  scolaire: "Articles scolaires",
  sacs: "Sacs et gourdes",
  vehicules: "Véhicules",
};
const labels: Record<Section, string> = {
  dashboard: "Tableau de bord",
  products: "Produits",
  stock: "Stocks",
  orders: "Commandes",
  promotions: "Promotions",
  subscribers: "Abonnés",
  editor: "Éditeur du site",
  settings: "Réglages",
};
const blankProduct: Row = {
  article_number: "",
  name_fr: "",
  name_en: "",
  description_fr: "",
  description_en: "",
  category: "eveil",
  price: 0,
  stock: 1,
  price_conakry: 0,
  price_qc: 0,
  stock_conakry: 1,
  stock_qc: 0,
  visible_conakry: true,
  visible_qc: false,
  alert_threshold: 2,
  featured: false,
  variants_json: "[]",
  images_json: "[]",
  status: "available",
  badge: "",
  ages: "3+",
  image_url: "",
  brand: "",
  material: "",
  dimensions: "",
  exchange_terms_fr: "",
  exchange_terms_en: "",
  visible: true,
};
const orderLabels: Record<string, string> = {
  new: "Nouvelle",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
};

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options.headers },
  });
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "Une erreur est survenue.",
    );
  return result;
}

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

        {section === "editor" && (
          <form className="cms-site-editor" onSubmit={saveSiteEditor}>
            <div className="cms-editor-toolbar">
              <div>
                <h2>Personnalisez la boutique · {markets[market].label}</h2>
                <p>
                  Réorganisez les sections, masquez celles que vous ne souhaitez
                  pas afficher et modifiez les textes en français et en anglais.
                  Chaque marché conserve sa propre présentation.
                </p>
              </div>
              <button className="cms-primary" disabled={busy}>
                {busy ? "Enregistrement…" : "Enregistrer le site"}
              </button>
            </div>
            <section className="cms-panel cms-section-manager">
              <div className="cms-panel-title">
                <h2>Ordre et visibilité des sections</h2>
                <button
                  type="button"
                  className="cms-inline"
                  onClick={() =>
                    setSiteSections(
                      defaultSiteSections.map((item) => ({ ...item })),
                    )
                  }
                >
                  Rétablir l’ordre initial
                </button>
              </div>
              <p className="cms-editor-help">
                Glissez les sections ou utilisez les flèches pour modifier leur
                emplacement sur la page.
              </p>
              <div className="cms-section-list">
                {siteSections.map((item, index) => (
                  <article
                    className={`cms-section-row${item.visible ? "" : " is-hidden"}${draggedSection === item.id ? " is-dragging" : ""}`}
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedSection(item.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (draggedSection) moveSection(draggedSection, index);
                      setDraggedSection(null);
                    }}
                    onDragEnd={() => setDraggedSection(null)}
                  >
                    <span className="cms-drag-handle" aria-hidden="true">
                      ⠿
                    </span>
                    <span className="cms-section-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{item.label}</strong>
                    <div className="cms-section-controls">
                      <button
                        type="button"
                        aria-label={`Monter ${item.label}`}
                        disabled={index === 0}
                        onClick={() => moveSection(item.id, index - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Descendre ${item.label}`}
                        disabled={index === siteSections.length - 1}
                        onClick={() => moveSection(item.id, index + 1)}
                      >
                        ↓
                      </button>
                      <label className="cms-visibility-toggle">
                        <input
                          type="checkbox"
                          checked={item.visible}
                          onChange={() =>
                            setSiteSections((current) =>
                              current.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, visible: !entry.visible }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <span>{item.visible ? "Visible" : "Masquée"}</span>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="cms-panel cms-copy-manager">
              <div className="cms-panel-title">
                <h2>Textes du site</h2>
                <span className="cms-language-hint">FR + EN</span>
              </div>
              <p className="cms-editor-help">
                Laissez un champ vide pour conserver le texte original.
              </p>
              <div className="cms-copy-list">
                {editableTexts.map((item) => (
                  <fieldset className="cms-copy-field" key={item.key}>
                    <legend>{item.label}</legend>
                    <div className="cms-copy-languages">
                      {(["fr", "en"] as const).map((language) => (
                        <label key={language}>
                          <span>
                            {language === "fr" ? "Français" : "English"}
                          </span>
                          {item.multiline ? (
                            <textarea
                              value={siteTexts[`${item.key}_${language}`] || ""}
                              placeholder={
                                language === "fr" ? item.french : item.english
                              }
                              onChange={(event) =>
                                setSiteTexts((current) => ({
                                  ...current,
                                  [`${item.key}_${language}`]:
                                    event.target.value,
                                }))
                              }
                            />
                          ) : (
                            <input
                              value={siteTexts[`${item.key}_${language}`] || ""}
                              placeholder={
                                language === "fr" ? item.french : item.english
                              }
                              onChange={(event) =>
                                setSiteTexts((current) => ({
                                  ...current,
                                  [`${item.key}_${language}`]:
                                    event.target.value,
                                }))
                              }
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>
            {versions.length > 0 && (
              <section className="cms-panel">
                <div className="cms-panel-title">
                  <h2>Versions précédentes · {markets[market].label}</h2>
                </div>
                {versions.slice(0, 6).map((version) => (
                  <div className="cms-list-item" key={String(version.id)}>
                    <span>
                      {new Date(String(version.created_at)).toLocaleString(
                        "fr-CA",
                      )}
                    </span>
                    <button
                      type="button"
                      className="cms-inline"
                      onClick={() => restoreVersion(version)}
                    >
                      Restaurer cette version
                    </button>
                  </div>
                ))}
              </section>
            )}
            <div className="cms-editor-footer">
              <a href={`/?region=${market}`} target="_blank" rel="noreferrer">
                Aperçu de la boutique {markets[market].label} ↗
              </a>
              <button className="cms-primary" disabled={busy}>
                Enregistrer toutes les modifications
              </button>
            </div>
          </form>
        )}

        {section === "dashboard" && (
          <>
            <div className="cms-stats">
              {stats.map((stat) => (
                <article className={`cms-stat ${stat.tone}`} key={stat.title}>
                  <span>{stat.title}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </div>
            <div className="cms-dashboard-grid">
              <section className="cms-panel">
                <div className="cms-panel-title">
                  <h2>Derniers produits · {markets[market].label}</h2>
                  <button onClick={() => setSection("products")}>
                    Tout voir →
                  </button>
                </div>
                {regionalProducts.length ? (
                  regionalProducts.slice(0, 6).map((product) => (
                    <div className="cms-list-item" key={String(product.id)}>
                      <strong>{String(product.name_fr)}</strong>
                      <span>
                        {marketPrice(product[`price_${market}`], market)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="cms-empty">
                    Aucun produit activé pour cette boutique.
                  </p>
                )}
              </section>
              <section className="cms-panel">
                <div className="cms-panel-title">
                  <h2>Commandes récentes</h2>
                  <button onClick={() => setSection("orders")}>
                    Tout voir →
                  </button>
                </div>
                {orders.length ? (
                  orders.slice(0, 6).map((order) => (
                    <div className="cms-list-item" key={String(order.id)}>
                      <strong>{String(order.customer_name)}</strong>
                      <span>{String(order.product_name)}</span>
                    </div>
                  ))
                ) : (
                  <p className="cms-empty">
                    Aucune commande enregistrée pour cette région.
                  </p>
                )}
              </section>
            </div>
          </>
        )}

        {section === "products" && (
          <section className="cms-panel">
            <div className="cms-panel-title">
              <input
                className="cms-search"
                placeholder="Nom, marque ou numéro d’article…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="cms-product-actions">
                <button
                  className="cms-secondary"
                  disabled={busy}
                  onClick={() => void synchronizeProducts()}
                >
                  ↻ Synchroniser la boutique
                </button>
                <button
                  className="cms-primary"
                  onClick={() => {
                    setEditingType("product");
                    setEditing({
                      ...blankProduct,
                      [`visible_${market}`]: true,
                    });
                  }}
                >
                  + Ajouter un produit
                </button>
              </div>
            </div>
            <div className="cms-product-filters">
              <label>Catégorie<select value={productCategory} onChange={(event) => setProductCategory(event.target.value)}><option value="all">Toutes les catégories</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label>Visibilité<select value={productVisibility} onChange={(event) => setProductVisibility(event.target.value)}><option value="all">Tous</option><option value="visible">Visibles</option><option value="hidden">Masqués</option></select></label>
              <label>Stock<select value={productStock} onChange={(event) => setProductStock(event.target.value)}><option value="all">Tous</option><option value="available">En stock</option><option value="low">Stock faible</option><option value="empty">Épuisés</option></select></label>
              <span className="cms-filter-count">{filtered.length} résultat(s)</span>
              <button type="button" className="cms-secondary" onClick={() => { setSearch(""); setProductCategory("all"); setProductVisibility("all"); setProductStock("all"); }}>Réinitialiser</button>
            </div>
            <div className="cms-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>No d’article</th>
                    <th>Catégorie</th>
                    <th>Prix · {markets[market].label}</th>
                    <th>Stock</th>
                    <th>Visibilité</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={String(product.id)}>
                      <td>
                        <div className="cms-product-cell">
                          {product.image_url ? <img src={String(product.image_url)} alt="" /> : <span className="cms-product-placeholder">□</span>}
                          <div>
                            <strong>{String(product.name_fr)}</strong>
                            <small>
                              {String(product.name_en || "")}
                              {product.featured ? " · ★ Vedette" : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td><strong className="cms-article-number">{String(product.article_number || "—")}</strong></td>
                      <td>
                        {categories[String(product.category)] ||
                          String(product.category)}
                      </td>
                      <td>{marketPrice(product[`price_${market}`], market)}</td>
                      <td>
                        <span
                          className={
                            Number(product[`stock_${market}`] || 0) <=
                            Number(product.alert_threshold || 2)
                              ? "cms-stock-alert"
                              : ""
                          }
                        >
                          {String(product[`stock_${market}`] || 0)}
                        </span>{" "}
                        <button
                          className="cms-inline"
                          onClick={() => void adjustStock(product)}
                        >
                          Ajuster
                        </button>
                      </td>
                      <td>
                        <span
                          className={`cms-status ${product[`visible_${market}`] ? "available" : "sold"}`}
                        >
                          {product[`visible_${market}`] ? "Visible" : "Masqué"}
                        </span>
                        <small>
                          {product.visible_conakry ? "GN " : ""}
                          {product.visible_qc ? "QC" : ""}
                        </small>
                      </td>
                      <td>
                        <button
                          className="cms-inline"
                          onClick={() => {
                            setEditingType("product");
                            setEditing({
                              ...product,
                              visible: Boolean(product.visible),
                              visible_qc: Boolean(product.visible_qc),
                              visible_conakry: Boolean(product.visible_conakry),
                              featured: Boolean(product.featured),
                            });
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          className="cms-inline danger"
                          onClick={() =>
                            void remove("products", String(product.id))
                          }
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <p className="cms-empty">Aucun produit trouvé.</p>
            )}
          </section>
        )}

        {section === "stock" && (
          <>
            <section className="cms-panel">
              <div className="cms-panel-title">
                <h2>Alertes de stock · {markets[market].label}</h2>
                <span>{lowStock.length} produit(s)</span>
              </div>
              <div className="cms-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Stock actuel</th>
                      <th>Seuil d’alerte</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((product) => (
                      <tr key={String(product.id)}>
                        <td>
                          <strong>{String(product.name_fr)}</strong>
                        </td>
                        <td>
                          <span className="cms-stock-alert">
                            {String(product[`stock_${market}`] || 0)}
                          </span>
                        </td>
                        <td>{String(product.alert_threshold || 2)}</td>
                        <td>
                          <button
                            className="cms-inline"
                            onClick={() => void adjustStock(product)}
                          >
                            Ajuster le stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!lowStock.length && (
                <p className="cms-empty">
                  Aucune alerte de stock pour cette boutique.
                </p>
              )}
            </section>
            <section className="cms-panel cms-stock-history">
              <div className="cms-panel-title">
                <h2>Historique des mouvements</h2>
              </div>
              <div className="cms-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Produit</th>
                      <th>Variation</th>
                      <th>Nouveau stock</th>
                      <th>Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={String(movement.id)}>
                        <td>
                          {new Date(String(movement.created_at)).toLocaleString(
                            "fr-CA",
                          )}
                        </td>
                        <td>{String(movement.product_name)}</td>
                        <td
                          className={
                            Number(movement.delta) < 0
                              ? "cms-stock-alert"
                              : "cms-stock-added"
                          }
                        >
                          {Number(movement.delta) > 0 ? "+" : ""}
                          {String(movement.delta)}
                        </td>
                        <td>{String(movement.new_stock)}</td>
                        <td>{String(movement.reason)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!movements.length && (
                <p className="cms-empty">Les ajustements apparaîtront ici.</p>
              )}
            </section>
          </>
        )}

        {section === "orders" && (
          <section className="cms-panel">
            <div className="cms-panel-title">
              <h2>Suivi des commandes · {markets[market].label}</h2>
              <div className="cms-product-actions">
                <button className="cms-secondary" onClick={exportOrders}>
                  Exporter CSV
                </button>
                <button
                  className="cms-secondary"
                  onClick={() => window.print()}
                >
                  Imprimer / PDF
                </button>
                <button
                  className="cms-primary"
                  onClick={() => {
                    setEditingType("order");
                    setEditing({
                      customer_name: "",
                      customer_phone: "",
                      product_name: "",
                      quantity: 1,
                      total: 0,
                      status: "new",
                      notes: "",
                      region: market,
                      currency: markets[market].currency,
                      delivery_zone: "",
                    });
                  }}
                >
                  + Nouvelle commande
                </button>
              </div>
            </div>
            <div className="cms-order-filters">
              <input
                className="cms-search"
                placeholder="Client, téléphone ou produit…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                value={orderStatus}
                onChange={(event) => setOrderStatus(event.target.value)}
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(orderLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
            </div>
            <div className="cms-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Client</th>
                    <th>Produit</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={String(order.id)}>
                      <td>
                        {new Date(String(order.created_at)).toLocaleDateString(
                          "fr-CA",
                        )}
                      </td>
                      <td>
                        <strong>{String(order.customer_name)}</strong>
                        <small>{String(order.customer_phone)}</small>
                      </td>
                      <td>{String(order.product_name)}</td>
                      <td>{marketPrice(order.total, market)}</td>
                      <td>
                        <span className={`cms-status ${String(order.status)}`}>
                          {orderLabels[String(order.status)]}
                        </span>
                      </td>
                      <td>
                        <button
                          className="cms-inline"
                          onClick={() => {
                            setEditingType("order");
                            setEditing({ ...order });
                          }}
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredOrders.length && (
              <p className="cms-empty">
                Aucune commande ne correspond à vos filtres.
              </p>
            )}
          </section>
        )}

        {section === "promotions" && (
          <section className="cms-panel">
            <div className="cms-panel-title">
              <h2>Offres et réductions · {markets[market].label}</h2>
              <button
                className="cms-primary"
                onClick={() => {
                  setEditingType("promotion");
                  setEditing({
                    title_fr: "",
                    title_en: "",
                    description_fr: "",
                    description_en: "",
                    discount_percent: 10,
                    discount_type: "percent",
                    discount_amount: 0,
                    minimum_purchase: 0,
                    usage_limit: 0,
                    promo_code: "",
                    region: market,
                    active: true,
                    starts_at: "",
                    ends_at: "",
                  });
                }}
              >
                + Créer une promotion
              </button>
            </div>
            {promotions.map((promotion) => (
              <article className="cms-promo" key={String(promotion.id)}>
                <div>
                  <span className="cms-promo-badge">
                    −
                    {promotion.discount_type === "amount"
                      ? marketPrice(promotion.discount_amount, market)
                      : `${String(promotion.discount_percent)} %`}
                  </span>
                  <h3>
                    {String(promotion.title_fr)}{" "}
                    {promotion.promo_code && (
                      <small>· {String(promotion.promo_code)}</small>
                    )}
                  </h3>
                  <p>{String(promotion.description_fr)}</p>
                  <p>
                    {promotion.region === "both"
                      ? "Les deux boutiques"
                      : markets[promotion.region === "qc" ? "qc" : "conakry"]
                          .label}{" "}
                    · {String(promotion.usage_count || 0)} utilisation(s)
                    {promotion.usage_limit
                      ? ` / ${String(promotion.usage_limit)}`
                      : ""}
                  </p>
                </div>
                <div>
                  <span
                    className={`cms-status ${promotion.active ? "available" : "sold"}`}
                  >
                    {promotion.active ? "Active" : "Inactive"}
                  </span>
                  <button
                    className="cms-inline"
                    onClick={() => {
                      setEditingType("promotion");
                      setEditing({
                        ...promotion,
                        active: Boolean(promotion.active),
                      });
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    className="cms-inline danger"
                    onClick={() =>
                      void remove("promotions", String(promotion.id))
                    }
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            ))}
            {!promotions.length && (
              <p className="cms-empty">
                Aucune promotion créée pour cette boutique.
              </p>
            )}
          </section>
        )}

        {section === "subscribers" && (
          <section className="cms-panel">
            <div className="cms-panel-title">
              <h2>Abonnés à l’offre de bienvenue</h2>
              <span>
                {subscribers.length} inscription
                {subscribers.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="cms-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Adresse courriel</th>
                    <th>Langue</th>
                    <th>Consentement</th>
                    <th>Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={String(subscriber.id)}>
                      <td>
                        <strong>{String(subscriber.email)}</strong>
                      </td>
                      <td>{String(subscriber.language).toUpperCase()}</td>
                      <td>{subscriber.consent ? "✓ Confirmé" : "Non"}</td>
                      <td>
                        {new Date(
                          String(subscriber.created_at),
                        ).toLocaleDateString("fr-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!subscribers.length && (
              <p className="cms-empty">
                Les nouvelles inscriptions apparaîtront ici.
              </p>
            )}
          </section>
        )}

        {section === "settings" && (
          <div className="cms-settings-grid">
            <form className="cms-panel cms-form" onSubmit={saveSettings}>
              <h2>Informations de la boutique · {markets[market].label}</h2>
              <p>
                Ces coordonnées, horaires, livraisons et préférences ne
                s’appliquent qu’à la boutique {markets[market].label}.
              </p>
              {(
                [
                  ["store_name", "Nom commercial"],
                  ["phone", "Téléphone"],
                  ["whatsapp", "Numéro WhatsApp"],
                  ["facebook", "Page Facebook"],
                  ["address", "Adresse de la boutique"],
                  ["map_url", "Lien Google Maps"],
                  ["opening_hours", "Horaires d’ouverture"],
                  ["welcome_discount", "Rabais de bienvenue (%)"],
                  ["delivery_conditions", "Conditions de livraison"],
                  ["delivery_zones", "Zones et quartiers desservis"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={
                      settings[`${market}_${key}`] ??
                      (market === "conakry" ? settings[key] || "" : "")
                    }
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        [`${market}_${key}`]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <button className="cms-primary" disabled={busy}>
                Enregistrer les réglages · {markets[market].label}
              </button>
            </form>
            <form className="cms-panel cms-form" onSubmit={changePassword}>
              <h2>Modifier mon mot de passe</h2>
              <label>
                Mot de passe actuel
                <input
                  type="password"
                  autoComplete="current-password"
                  value={passwords.current_password}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      current_password: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                Nouveau mot de passe
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={passwords.new_password}
                  onChange={(event) =>
                    setPasswords((current) => ({
                      ...current,
                      new_password: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <p>
                Utilisez au moins 12 caractères. Chaque administrateur possède
                son propre mot de passe.
              </p>
              <button className="cms-primary" disabled={busy}>
                Modifier mon mot de passe
              </button>
            </form>
          </div>
        )}

        <div className="cms-quick-scroll" aria-label="Défilement rapide">
          <button type="button" aria-label="Revenir complètement en haut" title="Retour en haut" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
          <button type="button" aria-label="Aller complètement en bas" title="Aller en bas" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}>↓</button>
        </div>

        {editing && (
          <div
            className="cms-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) setEditing(null);
            }}
          >
            <form className="cms-editor cms-form" onSubmit={save}>
              <div className="cms-panel-title">
                <h2>
                  {editing.id ? "Modifier" : "Ajouter"}{" "}
                  {editingType === "product"
                    ? "un produit"
                    : editingType === "promotion"
                      ? "une promotion"
                      : "une commande"}
                </h2>
                <button
                  type="button"
                  className="cms-close"
                  onClick={() => setEditing(null)}
                >
                  ×
                </button>
              </div>
              {editingType === "product" && (
                <label>
                  Disponible dans quelle boutique ?
                  <select
                    value={
                      editing.visible_qc && editing.visible_conakry
                        ? "both"
                        : editing.visible_qc
                          ? "qc"
                          : editing.visible_conakry
                            ? "conakry"
                            : ""
                    }
                    onChange={(event) => {
                      const availability = event.target.value;
                      setEditing((current) =>
                        current
                          ? {
                              ...current,
                              visible_qc:
                                availability === "qc" ||
                                availability === "both",
                              visible_conakry:
                                availability === "conakry" ||
                                availability === "both",
                            }
                          : current,
                      );
                    }}
                    required
                  >
                    <option value="" disabled>
                      Choisir une boutique
                    </option>
                    <option value="qc">Québec seulement</option>
                    <option value="conakry">Conakry seulement</option>
                    <option value="both">Québec et Conakry</option>
                  </select>
                </label>
              )}
              {editingType === "product" && (
                <>
                  {editing.id && (
                    <label>
                      Numéro d’article
                      <input
                        className="cms-article-number-input"
                        value={String(editing.article_number || "Attribué automatiquement")}
                        readOnly
                      />
                    </label>
                  )}
                  <div className="cms-form-grid">
                    <label>
                      Nom du produit · FR
                      <input
                        value={String(editing.name_fr || "")}
                        onChange={(event) =>
                          update("name_fr", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Product name · EN
                      <input
                        value={String(editing.name_en || "")}
                        onChange={(event) =>
                          update("name_en", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Catégorie
                      <select
                        value={String(editing.category || "eveil")}
                        onChange={(event) =>
                          update("category", event.target.value)
                        }
                      >
                        {Object.entries(categories).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Âge conseillé
                      <input
                        value={String(editing.ages || "")}
                        onChange={(event) => update("ages", event.target.value)}
                      />
                    </label>
                  </div>
                  <fieldset className="cms-market-fields">
                    <legend>Conakry · GNF</legend>
                    <label className="cms-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(editing.visible_conakry)}
                        onChange={(event) =>
                          update("visible_conakry", event.target.checked)
                        }
                      />{" "}
                      Disponible dans la boutique de Conakry
                    </label>
                    <div className="cms-form-grid">
                      <label>
                        Prix · GNF
                        <input
                          type="number"
                          min={0}
                          value={Number(
                            editing.price_conakry ?? editing.price ?? 0,
                          )}
                          onChange={(event) =>
                            update("price_conakry", Number(event.target.value))
                          }
                        />
                      </label>
                      <label>
                        Stock · Conakry
                        <input
                          type="number"
                          min={0}
                          value={Number(
                            editing.stock_conakry ?? editing.stock ?? 0,
                          )}
                          onChange={(event) =>
                            update("stock_conakry", Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Prix promotionnel · GNF
                      <input
                        type="number"
                        min={0}
                        value={Number(editing.promo_price_conakry || 0)}
                        onChange={(event) =>
                          update(
                            "promo_price_conakry",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </fieldset>
                  <fieldset className="cms-market-fields">
                    <legend>Québec · CAD</legend>
                    <label className="cms-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(editing.visible_qc)}
                        onChange={(event) =>
                          update("visible_qc", event.target.checked)
                        }
                      />{" "}
                      Disponible dans la boutique du Québec
                    </label>
                    <div className="cms-form-grid">
                      <label>
                        Prix · CAD
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={Number(editing.price_qc || 0) / 100}
                          onChange={(event) =>
                            update(
                              "price_qc",
                              Math.round(Number(event.target.value) * 100),
                            )
                          }
                        />
                      </label>
                      <label>
                        Stock · Québec
                        <input
                          type="number"
                          min={0}
                          value={Number(editing.stock_qc || 0)}
                          onChange={(event) =>
                            update("stock_qc", Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Prix promotionnel · CAD
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={Number(editing.promo_price_qc || 0) / 100}
                        onChange={(event) =>
                          update(
                            "promo_price_qc",
                            Math.round(Number(event.target.value) * 100),
                          )
                        }
                      />
                    </label>
                  </fieldset>
                  <div className="cms-form-grid">
                    <label>
                      Disponibilité
                      <select
                        value={String(editing.status || "available")}
                        onChange={(event) =>
                          update("status", event.target.value)
                        }
                      >
                        <option value="available">Disponible</option>
                        <option value="reserved">Réservé</option>
                        <option value="sold">Épuisé</option>
                      </select>
                    </label>
                    <label>
                      Étiquette
                      <select
                        value={String(editing.badge || "")}
                        onChange={(event) =>
                          update("badge", event.target.value)
                        }
                      >
                        <option value="">Aucune</option>
                        <option value="new">Nouveauté</option>
                        <option value="school">Rentrée scolaire</option>
                      </select>
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Seuil d’alerte du stock
                      <input
                        type="number"
                        min={0}
                        value={Number(editing.alert_threshold ?? 2)}
                        onChange={(event) =>
                          update("alert_threshold", Number(event.target.value))
                        }
                      />
                    </label>
                    <label>
                      Variantes · couleurs, tailles
                      <input
                        value={String(editing.variants_json || "[]")}
                        onChange={(event) =>
                          update("variants_json", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Description · FR
                    <textarea
                      value={String(editing.description_fr || "")}
                      onChange={(event) =>
                        update("description_fr", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Description · EN
                    <textarea
                      value={String(editing.description_en || "")}
                      onChange={(event) =>
                        update("description_en", event.target.value)
                      }
                    />
                  </label>
                  <div className="cms-form-grid">
                    <label>
                      Marque
                      <input
                        value={String(editing.brand || "")}
                        onChange={(event) =>
                          update("brand", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Matière
                      <input
                        value={String(editing.material || "")}
                        onChange={(event) =>
                          update("material", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Dimensions
                    <input
                      value={String(editing.dimensions || "")}
                      onChange={(event) =>
                        update("dimensions", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Photo principale du produit
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void upload(event.target.files?.[0])}
                    />
                  </label>
                  {editing.image_url && (
                    <img
                      className="cms-image-preview"
                      src={String(editing.image_url)}
                      alt="Aperçu du produit"
                    />
                  )}
                  <label>
                    Photos supplémentaires · liens JSON
                    <input
                      value={String(editing.images_json || "[]")}
                      onChange={(event) =>
                        update("images_json", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Conditions d’échange · FR
                    <textarea
                      value={String(editing.exchange_terms_fr || "")}
                      onChange={(event) =>
                        update("exchange_terms_fr", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Exchange terms · EN
                    <textarea
                      value={String(editing.exchange_terms_en || "")}
                      onChange={(event) =>
                        update("exchange_terms_en", event.target.value)
                      }
                    />
                  </label>
                  <label className="cms-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.featured)}
                      onChange={(event) =>
                        update("featured", event.target.checked)
                      }
                    />{" "}
                    Mettre ce produit en vedette
                  </label>
                </>
              )}
              {editingType === "promotion" && (
                <>
                  <div className="cms-form-grid">
                    <label>
                      Titre · FR
                      <input
                        value={String(editing.title_fr || "")}
                        onChange={(event) =>
                          update("title_fr", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Title · EN
                      <input
                        value={String(editing.title_en || "")}
                        onChange={(event) =>
                          update("title_en", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Description · FR
                    <textarea
                      value={String(editing.description_fr || "")}
                      onChange={(event) =>
                        update("description_fr", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Description · EN
                    <textarea
                      value={String(editing.description_en || "")}
                      onChange={(event) =>
                        update("description_en", event.target.value)
                      }
                    />
                  </label>
                  <div className="cms-form-grid">
                    <label>
                      Boutique
                      <select
                        value={String(editing.region || market)}
                        onChange={(event) =>
                          update("region", event.target.value)
                        }
                      >
                        <option value="conakry">Conakry</option>
                        <option value="qc">Québec</option>
                        <option value="both">Les deux boutiques</option>
                      </select>
                    </label>
                    <label>
                      Code promotionnel
                      <input
                        value={String(editing.promo_code || "")}
                        onChange={(event) =>
                          update("promo_code", event.target.value.toUpperCase())
                        }
                        placeholder="BIENVENUE10"
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Type de rabais
                      <select
                        value={String(editing.discount_type || "percent")}
                        onChange={(event) =>
                          update("discount_type", event.target.value)
                        }
                      >
                        <option value="percent">Pourcentage</option>
                        <option value="amount">Montant fixe</option>
                      </select>
                    </label>
                    {editing.discount_type === "amount" ? (
                      <label>
                        Montant · {markets[market].currency}
                        <input
                          type="number"
                          min={0}
                          step={market === "qc" ? "0.01" : "1"}
                          value={
                            market === "qc"
                              ? Number(editing.discount_amount || 0) / 100
                              : Number(editing.discount_amount || 0)
                          }
                          onChange={(event) =>
                            update(
                              "discount_amount",
                              market === "qc"
                                ? Math.round(Number(event.target.value) * 100)
                                : Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        Pourcentage de rabais
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Number(editing.discount_percent || 0)}
                          onChange={(event) =>
                            update(
                              "discount_percent",
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Achat minimum · {markets[market].currency}
                      <input
                        type="number"
                        min={0}
                        step={market === "qc" ? "0.01" : "1"}
                        value={
                          market === "qc"
                            ? Number(editing.minimum_purchase || 0) / 100
                            : Number(editing.minimum_purchase || 0)
                        }
                        onChange={(event) =>
                          update(
                            "minimum_purchase",
                            market === "qc"
                              ? Math.round(Number(event.target.value) * 100)
                              : Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      Nombre maximal d’utilisations
                      <input
                        type="number"
                        min={0}
                        value={Number(editing.usage_limit || 0)}
                        onChange={(event) =>
                          update("usage_limit", Number(event.target.value))
                        }
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Début
                      <input
                        type="date"
                        value={String(editing.starts_at || "")}
                        onChange={(event) =>
                          update("starts_at", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Fin
                      <input
                        type="date"
                        value={String(editing.ends_at || "")}
                        onChange={(event) =>
                          update("ends_at", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className="cms-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.active)}
                      onChange={(event) =>
                        update("active", event.target.checked)
                      }
                    />{" "}
                    Promotion active
                  </label>
                </>
              )}
              {editingType === "order" && (
                <>
                  <div className="cms-form-grid">
                    <label>
                      Nom du client
                      <input
                        value={String(editing.customer_name || "")}
                        onChange={(event) =>
                          update("customer_name", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Téléphone
                      <input
                        value={String(editing.customer_phone || "")}
                        onChange={(event) =>
                          update("customer_phone", event.target.value)
                        }
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Produit commandé
                    <input
                      list="cms-product-options"
                      value={String(editing.product_name || "")}
                      onChange={(event) =>
                        update("product_name", event.target.value)
                      }
                      required
                    />
                    <datalist id="cms-product-options">
                      {products.map((product) => (
                        <option
                          key={String(product.id)}
                          value={`${product.article_number ? `[${String(product.article_number)}] ` : ""}${String(product.name_fr)}`}
                        />
                      ))}
                    </datalist>
                  </label>
                  <div className="cms-form-grid">
                    <label>
                      Quantité
                      <input
                        type="number"
                        min={1}
                        value={Number(editing.quantity || 1)}
                        onChange={(event) =>
                          update("quantity", Number(event.target.value))
                        }
                      />
                    </label>
                    <label>
                      Total · {markets[market].currency}
                      <input
                        type="number"
                        min={0}
                        step={market === "qc" ? "0.01" : "1"}
                        value={
                          market === "qc"
                            ? Number(editing.total || 0) / 100
                            : Number(editing.total || 0)
                        }
                        onChange={(event) =>
                          update(
                            "total",
                            market === "qc"
                              ? Math.round(Number(event.target.value) * 100)
                              : Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Statut
                      <select
                        value={String(editing.status || "new")}
                        onChange={(event) =>
                          update("status", event.target.value)
                        }
                      >
                        {Object.entries(orderLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Zone de livraison
                      <input
                        value={String(editing.delivery_zone || "")}
                        onChange={(event) =>
                          update("delivery_zone", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Notes
                    <textarea
                      value={String(editing.notes || "")}
                      onChange={(event) => update("notes", event.target.value)}
                    />
                  </label>
                </>
              )}
              <div className="cms-editor-actions">
                <button
                  type="button"
                  className="cms-secondary"
                  onClick={() => setEditing(null)}
                >
                  Annuler
                </button>
                <button className="cms-primary" disabled={busy}>
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
