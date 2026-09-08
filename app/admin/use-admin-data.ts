"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { defaultProducts } from "@/lib/default-catalog";
import { defaultSiteSections, readSiteSections, readSiteTexts, type SiteSection } from "@/lib/site-editor";
import type { Market } from "@/lib/markets";
import { request, type Row } from "./admin-shared";

export type AdminIdentity = { email: string; name: string };

type Options = {
  market: Market;
  admin: AdminIdentity | null;
  setAdmin: Dispatch<SetStateAction<AdminIdentity | null>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
};

export function useAdminData({ market, admin, setAdmin, setNotice, setError }: Options) {
  const [checking, setChecking] = useState(true);
  const [products, setProducts] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [promotions, setPromotions] = useState<Row[]>([]);
  const [subscribers, setSubscribers] = useState<Row[]>([]);
  const [movements, setMovements] = useState<Row[]>([]);
  const [versions, setVersions] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [siteSections, setSiteSections] = useState<SiteSection[]>(defaultSiteSections.map((item) => ({ ...item })));
  const [siteTexts, setSiteTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    request("/api/admin/session")
      .then((result) => {
        if (result.authenticated) setAdmin(result.admin as AdminIdentity);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [setAdmin]);

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      request("/api/admin/products"),
      request(`/api/admin/orders?region=${market}`),
      request(`/api/admin/promotions?region=${market}`),
      request(`/api/admin/subscribers?region=${market}`),
      request("/api/admin/settings"),
      request(`/api/admin/stock?region=${market}`),
      request(`/api/admin/site-versions?region=${market}`),
    ]);

    const loadedProducts = results[0].status === "fulfilled" ? (results[0].value.products as Row[]) : null;
    if (loadedProducts) setProducts(loadedProducts);
    if (results[1].status === "fulfilled") setOrders(results[1].value.orders as Row[]);
    if (results[2].status === "fulfilled") setPromotions(results[2].value.promotions as Row[]);
    if (results[3].status === "fulfilled") setSubscribers(results[3].value.subscribers as Row[]);
    if (results[5].status === "fulfilled") setMovements(results[5].value.movements as Row[]);
    if (results[6].status === "fulfilled") setVersions(results[6].value.versions as Row[]);

    if (results[4].status !== "fulfilled") return;

    const loadedSettings = results[4].value.settings as Record<string, string>;
    setSettings(loadedSettings);
    setSiteSections(readSiteSections(loadedSettings[`${market}_site_sections`] || (market === "conakry" ? loadedSettings.site_sections : undefined)));
    setSiteTexts(readSiteTexts(loadedSettings[`${market}_site_texts`] || (market === "conakry" ? loadedSettings.site_texts : undefined)));

    if (loadedProducts?.length === 0 && loadedSettings.catalog_initialized !== "true") {
      try {
        const result = await request("/api/admin/products/import", {
          method: "POST",
          body: JSON.stringify({ products: defaultProducts }),
        });
        const refreshed = await request("/api/admin/products");
        setProducts(refreshed.products as Row[]);
        setSettings((current) => ({ ...current, catalog_initialized: "true" }));
        setNotice(`${Number(result.imported || 0)} produits importés automatiquement depuis la boutique.`);
        window.setTimeout(() => setNotice(""), 3500);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Import automatique impossible.");
      }
    }
  }, [market, setError, setNotice]);

  useEffect(() => {
    if (admin) void load();
  }, [admin, load]);

  return {
    checking,
    products,
    orders,
    promotions,
    subscribers,
    movements,
    versions,
    settings,
    siteSections,
    siteTexts,
    load,
    setProducts,
    setOrders,
    setPromotions,
    setSubscribers,
    setMovements,
    setVersions,
    setSettings,
    setSiteSections,
    setSiteTexts,
  };
}
