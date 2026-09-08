"use client";

import { useState } from "react";
import { markets, type Market } from "@/lib/markets";
import { blankProduct, type Row, type Section } from "./admin-shared";

export type AdminEditingType = "product" | "promotion" | "order";

export function useAdminUiState() {
  const [section, setSection] = useState<Section>("dashboard");
  const [market, setMarket] = useState<Market>("conakry");
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editingType, setEditingType] = useState<AdminEditingType>("product");
  const [search, setSearch] = useState("");
  const [productCategory, setProductCategory] = useState("all");
  const [productVisibility, setProductVisibility] = useState("all");
  const [productStock, setProductStock] = useState("all");
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderDate, setOrderDate] = useState("");

  function changeSection(next: Section) {
    setSection(next);
    setEditing(null);
    setSearch("");
  }

  function addProduct() {
    setEditingType("product");
    setEditing({ ...blankProduct, [`visible_${market}`]: true });
  }

  function editProduct(product: Row) {
    setEditingType("product");
    setEditing({
      ...product,
      visible: Boolean(product.visible),
      visible_qc: Boolean(product.visible_qc),
      visible_conakry: Boolean(product.visible_conakry),
      featured: Boolean(product.featured),
    });
  }

  function addOrder() {
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
  }

  function editOrder(order: Row) {
    setEditingType("order");
    setEditing({ ...order });
  }

  function addPromotion() {
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
  }

  function editPromotion(promotion: Row) {
    setEditingType("promotion");
    setEditing({ ...promotion, active: Boolean(promotion.active) });
  }

  return {
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
  };
}
