"use client";

import { useState, type FormEvent } from "react";
import { defaultProducts, removedProductNames } from "@/lib/default-catalog";
import {
  readSiteSections,
  readSiteTexts,
} from "@/lib/site-editor";
import { markets, type Market } from "@/lib/markets";
import { DashboardSection, SettingsSection, SubscribersSection } from "./admin-sections";
import { OrdersSection, ProductsSection, PromotionsSection, StockSection } from "./admin-commerce-sections";
import { SiteEditor } from "./admin-site-editor";
import { AdminEditModal } from "./admin-edit-modal";
import { AdminLayout, AdminLogin } from "./admin-layout";
import { deriveAdminLists } from "./admin-derived";
import { useAdminData, type AdminIdentity } from "./use-admin-data";
import { blankProduct, orderLabels, request, type Row, type Section } from "./admin-shared";
import "./admin.css";

export default function Administration() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<Section>("dashboard");
  const [market, setMarket] = useState<Market>("conakry");
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

  const {
    checking, products, orders, promotions, subscribers, movements, versions, settings, siteSections, siteTexts, load,
    setProducts, setOrders, setPromotions, setSubscribers, setMovements, setVersions, setSettings, setSiteSections, setSiteTexts,
  } = useAdminData({ market, admin, setAdmin, flash, setError });

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

  if (checking) return <main className="cms-loading">Chargement de l’administration…</main>;
  if (!admin) return <AdminLogin email={email} password={password} error={error} busy={busy} setEmail={setEmail} setPassword={setPassword} signIn={signIn} />;

  const { regionalProducts, filteredProducts: filtered, filteredOrders, lowStock, stats } = deriveAdminLists({ products, orders, subscribers, market, search, productCategory, productVisibility, productStock, orderStatus, orderDate });

  return (
    <AdminLayout admin={admin} section={section} market={market} notice={notice} error={error} onSection={(next) => { setSection(next); setEditing(null); setSearch(""); setError(""); }} onMarket={setMarket} signOut={() => void signOut()}>
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

        {editing && <AdminEditModal editing={editing} editingType={editingType} setEditing={setEditing} save={save} update={update} upload={upload} busy={busy} market={market} products={products} />}
    </AdminLayout>
  );
}
