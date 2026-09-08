"use client";

import { useState, type FormEvent } from "react";
import { DashboardSection, SettingsSection, SubscribersSection } from "./admin-sections";
import { ProductsSection } from "./admin-products-section";
import { StockSection } from "./admin-stock-section";
import { OrdersSection } from "./admin-orders-section";
import { PromotionsSection } from "./admin-promotions-section";
import { SiteEditor } from "./admin-site-editor";
import { AdminEditModal } from "./admin-edit-modal";
import { AdminLayout, AdminLogin } from "./admin-layout";
import { deriveAdminLists } from "./admin-derived";
import { useAdminData, type AdminIdentity } from "./use-admin-data";
import { useAdminActions } from "./use-admin-actions";
import { useAdminUiState } from "./use-admin-ui-state";
import { request } from "./admin-shared";
import "./admin.css";

export default function Administration() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const {
    section,
    market,
    draggedSection,
    editing,
    editingType,
    search,
    productCategory,
    productVisibility,
    productStock,
    orderStatus,
    orderDate,
    setMarket,
    setDraggedSection,
    setEditing,
    setSearch,
    setProductCategory,
    setProductVisibility,
    setProductStock,
    setOrderStatus,
    setOrderDate,
    changeSection,
    addProduct,
    editProduct,
    addOrder,
    editOrder,
    addPromotion,
    editPromotion,
  } = useAdminUiState();

  const {
    checking, products, orders, promotions, subscribers, movements, versions, settings, siteSections, siteTexts, load,
    setVersions, setSettings, setSiteSections, setSiteTexts,
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
      setAdmin(result.admin as AdminIdentity);
      setPassword("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Connexion impossible.");
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
    <AdminLayout admin={admin} section={section} market={market} notice={notice} error={error} onSection={(next) => { changeSection(next); setError(""); }} onMarket={setMarket} signOut={() => void signOut()}>
      {section === "editor" && (<SiteEditor market={market} busy={busy} sections={siteSections} setSections={setSiteSections} texts={siteTexts} setTexts={setSiteTexts} draggedSection={draggedSection} setDraggedSection={setDraggedSection} moveSection={(id, nextIndex) => moveSection(setSiteSections, id, nextIndex)} versions={versions} restoreVersion={(version) => restoreVersion(version, setSiteSections, setSiteTexts)} save={(event) => void saveSiteEditor(event, siteSections, siteTexts, setSettings, setVersions)} />)}

      {section === "dashboard" && (
        <DashboardSection stats={stats} products={regionalProducts} orders={orders} market={market} goTo={changeSection} />
      )}

      {section === "products" && (<ProductsSection products={filtered} market={market} busy={busy} search={search} setSearch={setSearch} category={productCategory} setCategory={setProductCategory} visibility={productVisibility} setVisibility={setProductVisibility} stock={productStock} setStock={setProductStock} synchronize={() => void synchronizeProducts()} add={addProduct} edit={editProduct} adjustStock={(product) => void adjustStock(product)} remove={(id) => void remove("products", id)} />)}

      {section === "stock" && (<StockSection products={lowStock} movements={movements} market={market} adjustStock={(product) => void adjustStock(product)} />)}

      {section === "orders" && (<OrdersSection orders={filteredOrders} market={market} search={search} setSearch={setSearch} status={orderStatus} setStatus={setOrderStatus} date={orderDate} setDate={setOrderDate} exportOrders={() => exportOrders(filteredOrders)} add={addOrder} edit={editOrder} />)}

      {section === "promotions" && (<PromotionsSection promotions={promotions} market={market} add={addPromotion} edit={editPromotion} remove={(id) => void remove("promotions", id)} />)}

      {section === "subscribers" && <SubscribersSection subscribers={subscribers} />}

      {section === "settings" && (
        <SettingsSection market={market} settings={settings} setSettings={setSettings} passwords={passwords} setPasswords={setPasswords} busy={busy} saveSettings={(event) => void saveSettings(event, settings)} changePassword={(event) => void changePassword(event)} />
      )}

      {editing && <AdminEditModal editing={editing} editingType={editingType} setEditing={setEditing} save={(event) => void saveEditing(event, editing, editingType, setEditing)} update={(field, value) => updateEditing(setEditing, field, value)} upload={(file) => void upload(file, setEditing)} busy={busy} market={market} products={products} />}
    </AdminLayout>
  );
}
