import { markets, type Market } from "@/lib/markets";
import type { Row } from "./admin-shared";

export function deriveAdminLists({ products, orders, subscribers, market, search, productCategory, productVisibility, productStock, orderStatus, orderDate }: { products: Row[]; orders: Row[]; subscribers: Row[]; market: Market; search: string; productCategory: string; productVisibility: string; productStock: string; orderStatus: string; orderDate: string }) {
  const regionalProducts = products.filter((item) => Boolean(item[`visible_${market}`]));
  const filteredProducts = products.filter((item) => {
    const matchesSearch = `${item.article_number || ""} ${item.name_fr} ${item.name_en} ${item.category} ${item.brand || ""}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = productCategory === "all" || item.category === productCategory;
    const matchesVisibility = productVisibility === "all" || (productVisibility === "visible" ? Boolean(item[`visible_${market}`]) : !Boolean(item[`visible_${market}`]));
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
