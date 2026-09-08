"use client";

import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { defaultProducts, removedProductNames } from "@/lib/default-catalog";
import { readSiteSections, readSiteTexts, type SiteSection } from "@/lib/site-editor";
import { markets, type Market } from "@/lib/markets";
import { orderLabels, request, type Row } from "./admin-shared";

type EditingType = "product" | "promotion" | "order";
type Passwords = { current_password: string; new_password: string };

type Options = {
  market: Market;
  load: () => Promise<void>;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function useAdminActions({ market, load, setError, setNotice }: Options) {
  const [busy, setBusy] = useState(false);
  const [passwords, setPasswords] = useState<Passwords>({
    current_password: "",
    new_password: "",
  });

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function updateEditing(
    setEditing: Dispatch<SetStateAction<Row | null>>,
    field: string,
    value: string | number | boolean,
  ) {
    setEditing((current) => current ? { ...current, [field]: value } : current);
  }

  async function saveEditing(
    event: FormEvent<HTMLFormElement>,
    editing: Row | null,
    editingType: EditingType,
    setEditing: Dispatch<SetStateAction<Row | null>>,
  ) {
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
      setError(failure instanceof Error ? failure.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(type: "products" | "promotions", id: string) {
    if (!window.confirm("Supprimer définitivement cet élément ?")) return;
    await request(`/api/admin/${type}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
    flash("Élément supprimé.");
  }

  async function upload(file: File | undefined, setEditing: Dispatch<SetStateAction<Row | null>>) {
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await request("/api/admin/upload", { method: "POST", body: data });
      updateEditing(setEditing, "image_url", String(result.url));
      flash("Photo téléversée.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Téléversement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>, settings: Record<string, string>) {
    event.preventDefault();
    setBusy(true);
    try {
      await request("/api/admin/settings", { method: "POST", body: JSON.stringify(settings) });
      flash("Réglages enregistrés.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Enregistrement impossible.");
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
        body: JSON.stringify({ products: defaultProducts, removedProductNames }),
      });
      await load();
      flash(`${Number(result.imported || 0)} produit(s) ajouté(s), ${Number(result.updated || 0)} mis à jour, ${Number(result.removed || 0)} retiré(s).`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Synchronisation impossible.");
    } finally {
      setBusy(false);
    }
  }

  function moveSection(setSiteSections: Dispatch<SetStateAction<SiteSection[]>>, id: string, nextIndex: number) {
    setSiteSections((current) => {
      const previousIndex = current.findIndex((item) => item.id === id);
      if (previousIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const updated = [...current];
      const [moved] = updated.splice(previousIndex, 1);
      updated.splice(nextIndex, 0, moved);
      return updated;
    });
  }

  async function saveSiteEditor(
    event: FormEvent<HTMLFormElement>,
    siteSections: SiteSection[],
    siteTexts: Record<string, string>,
    setSettings: Dispatch<SetStateAction<Record<string, string>>>,
    setVersions: Dispatch<SetStateAction<Row[]>>,
  ) {
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
        body: JSON.stringify({ region: market, settings_json: JSON.stringify(changes) }),
      });
      await request("/api/admin/settings", { method: "POST", body: JSON.stringify(changes) });
      setSettings((current) => ({ ...current, ...changes }));
      const history = await request(`/api/admin/site-versions?region=${market}`);
      setVersions(history.versions as Row[]);
      flash(`Site ${markets[market].label} mis à jour : textes, ordre et visibilité enregistrés.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Modification du site impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/password", { method: "POST", body: JSON.stringify(passwords) });
      setPasswords({ current_password: "", new_password: "" });
      flash("Mot de passe modifié.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Modification impossible.");
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
    const reason = window.prompt("Motif de l’ajustement", "Inventaire manuel") || "Inventaire manuel";
    await request("/api/admin/stock", {
      method: "POST",
      body: JSON.stringify({ product_id: product.id, region: market, stock: Number(answer), reason }),
    });
    await load();
    flash("Stock ajusté et mouvement enregistré.");
  }

  function exportOrders(orders: Row[]) {
    const rows = [
      ["Date", "Client", "Téléphone", "Produit", "Quantité", "Total", "Devise", "Statut", "Zone"],
      ...orders.map((order) => [
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
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `commandes-${market}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function restoreVersion(
    version: Row,
    setSiteSections: Dispatch<SetStateAction<SiteSection[]>>,
    setSiteTexts: Dispatch<SetStateAction<Record<string, string>>>,
  ) {
    try {
      const snapshot = JSON.parse(String(version.settings_json)) as Record<string, string>;
      setSiteSections(readSiteSections(snapshot[`${market}_site_sections`]));
      setSiteTexts(readSiteTexts(snapshot[`${market}_site_texts`]));
      flash("Version restaurée dans l’éditeur. Enregistrez pour la publier.");
    } catch {
      setError("Cette version ne peut pas être restaurée.");
    }
  }

  return {
    busy,
    passwords,
    setPasswords,
    updateEditing,
    saveEditing,
    remove,
    upload,
    saveSettings,
    synchronizeProducts,
    moveSection,
    saveSiteEditor,
    changePassword,
    adjustStock,
    exportOrders,
    restoreVersion,
  };
}
