"use client";

import { useState, type FormEvent } from "react";
import { CustomersSection, DashboardSection, SettingsSection, SubscribersSection } from "./admin-sections";
import { ProductsSection } from "./admin-products-section";
import { StockSection } from "./admin-stock-section";
import { OrdersSection } from "./admin-orders-section";
import { PromotionsSection } from "./admin-promotions-section";
import { SiteEditor } from "./admin-site-editor";
import { AiAdvisorSection } from "./admin-ai-advisor";
import { NotificationsSection } from "./admin-notifications";
import { AdminEditModal } from "./admin-edit-modal";
import { AdminLayout, AdminLogin } from "./admin-layout";
import { deriveAdminLists } from "./admin-derived";
import { useAdminData, type AdminIdentity } from "./use-admin-data";
import { useAdminActions } from "./use-admin-actions";
import { useAdminUiState } from "./use-admin-ui-state";
import { request } from "./admin-shared";
import "./admin.css";
import "./admin-mobile.css";

export default function Administration() {
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const {
    section,
    market,
    search,
    category,
    visibility,
    stock,
    editing,
    stockEditing,
    orderEditing,
    promotionEditing,
    setSection,
    setMarket,
    setSearch,
    setCategory,
    setVisibility,
    setStock,
    setEditing,
    setStockEditing,
    setOrderEditing,
    setPromotionEditing,
  } = useAdminUiState();

  const {
    loading,
    products,
    orders,
    customers,
    promotions,
    subscribers,
    notifications,
    siteConfig,
    setProducts,
    setOrders,
    setCustomers,
    setPromotions,
    setSubscribers,
    setNotifications,
    setSiteConfig,
    reload,
  } = useAdminData(admin, market, setError);

  const derived = deriveAdminLists({ products, orders, customers, promotions, subscribers, notifications, search, category, visibility, stock, market });

  const actions = useAdminActions({
    market,
    products,
    editing,
    stockEditing,
    orderEditing,
    promotionEditing,
    setError,
    setNotice,
    setEditing,
    setStockEditing,
    setOrderEditing,
    setPromotionEditing,
    setProducts,
    setOrders,
    setCustomers,
    setPromotions,
    setSubscribers,
    reload,
  });

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const data = await request<{ admin: AdminIdentity }>("/api/admin/session", { method: "POST", body: JSON.stringify({ email, password }) });
      setAdmin(data.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    }
  }

  async function signOut() {
    await request("/api/admin/session", { method: "DELETE" });
    setAdmin(null);
  }

  if (loading) return <main className="cms-loading">Chargement…</main>;
  if (!admin) return <AdminLogin email={email} password={password} error={error} busy={false} setEmail={setEmail} setPassword={setPassword} signIn={signIn} />;

  return <AdminLayout admin={admin} section={section} market={market} notice={notice} error={error} notificationCount={derived.unreadNotifications.length} onSection={setSection} onMarket={setMarket} signOut={signOut}>
    {section === "dashboard" && <DashboardSection products={products} orders={orders} customers={customers} promotions={promotions} market={market} onSection={setSection} />}
    {section === "products" && <ProductsSection products={derived.filteredProducts} catalogProducts={products} market={market} busy={actions.busy} search={search} setSearch={setSearch} category={category} setCategory={setCategory} visibility={visibility} setVisibility={setVisibility} stock={stock} setStock={setStock} synchronize={actions.synchronize} add={actions.addProduct} edit={setEditing} adjustStock={setStockEditing} remove={actions.removeProduct} reload={reload} />}
    {section === "stock" && <StockSection products={derived.filteredProducts} market={market} search={search} setSearch={setSearch} stock={stock} setStock={setStock} adjustStock={setStockEditing} />}
    {section === "orders" && <OrdersSection orders={derived.filteredOrders} market={market} edit={setOrderEditing} remove={actions.removeOrder} />}
    {section === "customers" && <CustomersSection customers={customers} remove={actions.removeCustomer} />}
    {section === "promotions" && <PromotionsSection promotions={promotions} market={market} edit={setPromotionEditing} add={actions.addPromotion} remove={actions.removePromotion} />}
    {section === "subscribers" && <SubscribersSection subscribers={subscribers} remove={actions.removeSubscriber} />}
    {section === "advisor" && <AiAdvisorSection products={products} market={market} />}
    {section === "notifications" && <NotificationsSection notifications={notifications} setNotifications={setNotifications} />}
    {section === "editor" && <SiteEditor siteConfig={siteConfig} setSiteConfig={setSiteConfig} market={market} setNotice={setNotice} setError={setError} />}
    {section === "settings" && <SettingsSection admin={admin} />}

    <AdminEditModal editing={editing} stockEditing={stockEditing} orderEditing={orderEditing} promotionEditing={promotionEditing} market={market} busy={actions.busy} close={() => { setEditing(null); setStockEditing(null); setOrderEditing(null); setPromotionEditing(null); }} saveProduct={actions.saveProduct} saveStock={actions.saveStock} saveOrder={actions.saveOrder} savePromotion={actions.savePromotion} />
  </AdminLayout>;
}
