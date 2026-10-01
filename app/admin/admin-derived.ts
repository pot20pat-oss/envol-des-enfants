import { markets, type Market } from "@/lib/markets";
import type { Row } from "./admin-shared";

export function deriveAdminLists({ products, orders, subscribers, market, search, productCategory, productVisibility, productStock, orderStatus, orderDate }: { products: Row[]; orders: Row[]; subscribers: Row[]; market: Market; search: string; productCategory: string; productVisibility: string; productStock: string; orderStatus: string; orderDate: string }) {
  const regionalProducts = products.filter((item) => Boolean(item[`visible_${market}`]));
  const filteredProducts = products.filter((item) => {
    const normalizeSearch = (value: unknown) => String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr")
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const query = normalizeSearch(search);
    const categoryLabel = categories[item.category] || item.category;
    const searchable = normalizeSearch(
      `${item.article_number || ""} ${item.name_fr || ""} ${item.name_en || ""} ${item.category || ""} ${categoryLabel} ${item.brand || ""} ${item.description_fr || ""} ${item.description_en || ""}`,
    );
    const vehicleQuery = /\bvehicule(s)?\b/.test(query) && /\belectrique(s)?\b/.test(query);
    const isVehicleCategory = ["vehicules", "voitures_electriques", "motos_electriques", "velos", "vehicules_12_24v", "vehicules_age", "autonomie", "accessoires_vehicules"].includes(String(item.category));
    const hasElectricTerm = /\belectri(qu|c)[a-z0-9]*\b/.test(searchable) || ["voitures_electriques", "motos_electriques", "vehicules_12_24v"].includes(String(item.category));
    const matchesSearch = !query || (vehicleQuery ? isVehicleCategory && hasElectricTerm : searchable.includes(query));
    const matchesCategory = productCategory === "all" || item.category === productCategory;
    const qc=Boolean(item.visible_qc),conakry=Boolean(item.visible_conakry); const matchesVisibility = productVisibility === "all" || (productVisibility === "visible" ? Boolean(item[`visible_${market}`]) : productVisibility === "hidden" ? !qc&&!conakry : productVisibility === "qc" ? qc&&!conakry : productVisibility === "conakry" ? conakry&&!qc : productVisibility === "both" ? qc&&conakry : true);
    const stock = Number(item[`stock_${market}`] || 0);
    const matchesStock = productStock === "all" || (productStock === "available" ? stock > 0 : productStock === "low" ? stock > 0 && stock <= Number(item.alert_threshold || 2) : stock <= 0);
    return matchesSearch && matchesCategory && matchesVisibility && matchesStock;
  });
  const filteredOrders = orders.filter((item) => (orderStatus === "all" || item.status === orderStatus) && (!orderDate || String(item.created_at || "").startsWith(orderDate)) && (!search.trim() || `${item.customer_name} ${item.customer_phone} ${item.product_name}`.toLowerCase().includes(search.toLowerCase())));
  const lowStock = regionalProducts.filter((item) => Number(item[`stock_${market}`] || 0) <= Number(item.alert_threshold || 2));
  const stats = [
    { title: `Produits · ${markets[market].label}`, value: regionalProducts.length, tone: "blue" },
    { title: "Commandes à traiter", value: orders.filter((item) => ["new", "confirmed", "preparing"].includes(String(item.status))).length, tone: "orange" },
    { title: "Abonnés", value: subscribers.length, tone: "green" },
    { title: "Alertes de stock", value: lowStock.length, tone: "red" },
  ];
  return { regionalProducts, filteredProducts, filteredOrders, lowStock, stats };
}
