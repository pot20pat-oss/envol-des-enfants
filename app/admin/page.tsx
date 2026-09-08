"use client";

import { useState, type FormEvent } from "react";
import { markets, type Market } from "@/lib/markets";
import { DashboardSection, SettingsSection, SubscribersSection } from "./admin-sections";
import { OrdersSection, ProductsSection, PromotionsSection, StockSection } from "./admin-commerce-sections";
import { SiteEditor } from "./admin-site-editor";
import { AdminEditModal } from "./admin-edit-modal";
import { AdminLayout, AdminLogin } from "./admin-layout";
import { deriveAdminLists } from "./admin-derived";
import { useAdminData, type AdminIdentity } from "./use-admin-data";
import { useAdminActions } from "./use-admin-actions";
import { blankProduct, request, type Row, type Section } from "./admin-shared";
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
  const {
    checking, products, orders, promotions, subscribers, movements, versions, settings, siteSections, siteTexts, load,
    setProducts, setOrders, setPromotions, setSubscribers, setMovements, setVersions, setSettings, setSiteSections, setSiteTexts,
  } = useAdminData({ market, admin, setAdmin, setNotice, setError });

  const {
    busy, setBusy, passwords, setPasswords, updateEditing, saveEditing, remove, upload, saveSettings,
    synchronizeProducts, moveSection, saveSiteEditor, changePassword, adjustStock, exportOrders, restoreVersion,
  } = useAdminActions({ market, load, setError, setNotice });

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
  if (checking) return <main className="cms-loading">Chargement de l’administration…</main>;
  if (!admin) return <AdminLogin email={email} password={password} error={error} busy={busy} setEmail={setEmail} setPassword={setPassword} signIn={signIn} />;

  const { regionalProducts, filteredProducts: filtered, filteredOrders, lowStock, stats } = deriveAdminLists({ products, orders, subscribers, market, search, productCategory, productVisibility, productStock, orderStatus, orderDate });

  return (
    <AdminLayout admin={admin} section={section} market={market} notice={notice} error={error} onSection={(next) => { setSection(next); setEditing(null); setSearch(""); setError(""); }} onMarket={setMarket} signOut={() => void signOut()}>
        {section === "editor" && (<SiteEditor market={market} busy={busy} sections={siteSections} setSections={setSiteSections} texts={siteTexts} setTexts={setSiteTexts} draggedSection={draggedSection} setDraggedSection={setDraggedSection} moveSection={(id, nextIndex) => moveSection(setSiteSections, id, nextIndex)} versions={versions} restoreVersion={(version) => restoreVersion(version, setSiteSections, setSiteTexts)} save={(event) => void saveSiteEditor(event, siteSections, siteTexts, setSettings, setVersions)} />)}

        {section === "dashboard" && (
          <DashboardSection stats={stats} products={regionalProducts} orders={orders} market={market} goTo={setSection} />
        )}

        {section === "products" && (<ProductsSection products={filtered} market={market} busy={busy} search={search} setSearch={setSearch} category={productCategory} setCategory={setProductCategory} visibility={productVisibility} setVisibility={setProductVisibility} stock={productStock} setStock={setProductStock} synchronize={() => void synchronizeProducts()} add={() => { setEditingType("product"); setEditing({ ...blankProduct, [`visible_${market}`]: true }); }} edit={(product) => { setEditingType("product"); setEditing({ ...product, visible: Boolean(product.visible), visible_qc: Boolean(product.visible_qc), visible_conakry: Boolean(product.visible_conakry), featured: Boolean(product.featured) }); }} adjustStock={(product) => void adjustStock(product)} remove={(id) => void remove("products", id)} />)}

        {section === "stock" && (<StockSection products={lowStock} movements={movements} market={market} adjustStock={(product) => void adjustStock(product)} />)}

        {section === "orders" && (<OrdersSection orders={filteredOrders} market={market} search={search} setSearch={setSearch} status={orderStatus} setStatus={setOrderStatus} date={orderDate} setDate={setOrderDate} exportOrders={() => exportOrders(filteredOrders)} add={() => { setEditingType("order"); setEditing({ customer_name: "", customer_phone: "", product_name: "", quantity: 1, total: 0, status: "new", notes: "", region: market, currency: markets[market].currency, delivery_zone: "" }); }} edit={(order) => { setEditingType("order"); setEditing({ ...order }); }} />)}

        {section === "promotions" && (<PromotionsSection promotions={promotions} market={market} add={() => { setEditingType("promotion"); setEditing({ title_fr: "", title_en: "", description_fr: "", description_en: "", discount_percent: 10, discount_type: "percent", discount_amount: 0, minimum_purchase: 0, usage_limit: 0, promo_code: "", region: market, active: true, starts_at: "", ends_at: "" }); }} edit={(promotion) => { setEditingType("promotion"); setEditing({ ...promotion, active: Boolean(promotion.active) }); }} remove={(id) => void remove("promotions", id)} />)}

        {section === "subscribers" && (
          <SubscribersSection subscribers={subscribers} />
        )}

        {section === "settings" && (
          <SettingsSection market={market} settings={settings} setSettings={setSettings} passwords={passwords} setPasswords={setPasswords} busy={busy} saveSettings={(event) => void saveSettings(event, settings)} changePassword={(event) => void changePassword(event)} />
        )}

        {editing && <AdminEditModal editing={editing} editingType={editingType} setEditing={setEditing} save={(event) => void saveEditing(event, editing, editingType, setEditing)} update={(field, value) => updateEditing(setEditing, field, value)} upload={(file) => void upload(file, setEditing)} busy={busy} market={market} products={products} />}
    </AdminLayout>
  );
}
