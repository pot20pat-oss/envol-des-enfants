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

async function prepareImageForUpload(file: File): Promise<File> {
  const safeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!safeTypes.has(file.type)) throw new Error("Format non pris en charge. Utilisez PNG, JPG ou WebP.");

  // Toujours normaliser avant l'envoi. Ainsi une grosse photo ne dépend jamais
  // de la limite du proxy/Worker, même si l'original fait plusieurs dizaines de Mo.
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error(`Impossible d’ouvrir « ${file.name} ». Utilisez JPG, PNG ou WebP.`); }

  const target = 650 * 1024;
  let maxDimension = 1600;
  let quality = 0.82;
  let blob: Blob | null = null;
  try {
    for (let pass = 0; pass < 6; pass++) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Impossible de préparer cette image.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= target) break;
      maxDimension = Math.max(700, Math.round(maxDimension * 0.72));
      quality = Math.max(0.48, quality - 0.09);
    }
  } finally { bitmap.close(); }

  if (!blob) throw new Error("Impossible de compresser cette image.");
  if (blob.size > 900 * 1024) throw new Error(`« ${file.name} » reste trop volumineuse après optimisation.`);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

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
    const scrollPosition = window.scrollY;
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

      // Une fiche créée depuis des photos d'un autre produit ne retire les
      // photos de la source qu'APRÈS la création réussie du nouveau produit.
      if (editingType === "product" && !editing.id) {
        try {
          const rawSource = sessionStorage.getItem("cms-new-product-source");
          if (rawSource) {
            const source = JSON.parse(rawSource) as { sourceProductId?: unknown; selectedImages?: unknown };
            const sourceProductId = String(source.sourceProductId || "");
            const selectedImages = Array.isArray(source.selectedImages)
              ? source.selectedImages.filter((value): value is string => typeof value === "string")
              : [];

            if (sourceProductId && selectedImages.length) {
              const sourceList = await request("/api/admin/products");
              const sourceProducts = Array.isArray(sourceList.products) ? sourceList.products as Row[] : [];
              const sourceProduct = sourceProducts.find((product) => String(product.id) === sourceProductId);
              if (!sourceProduct) throw new Error("Produit d’origine introuvable.");

              const sourceImages: string[] = [];
              const addSourceImage = (value: unknown) => {
                if (typeof value !== "string") return;
                const image = value.trim();
                if (image && !sourceImages.includes(image)) sourceImages.push(image);
              };
              addSourceImage(sourceProduct.image_url);
              try {
                const extras = JSON.parse(String(sourceProduct.images_json || "[]"));
                if (Array.isArray(extras)) extras.forEach(addSourceImage);
              } catch {}

              const remainingImages = sourceImages.filter((image) => !selectedImages.includes(image));
              await request("/api/admin/products", {
                method: "PUT",
                body: JSON.stringify({
                  ...sourceProduct,
                  image_url: remainingImages[0] || "",
                  images_json: JSON.stringify(remainingImages.slice(1)),
                }),
              });

              const verifyList = await request("/api/admin/products");
              const verifyProducts = Array.isArray(verifyList.products) ? verifyList.products as Row[] : [];
              const verifiedSource = verifyProducts.find((product) => String(product.id) === sourceProductId);
              if (!verifiedSource) throw new Error("Impossible de vérifier le produit d’origine.");

              const verifiedImages = [String(verifiedSource.image_url || "")];
              try {
                const extras = JSON.parse(String(verifiedSource.images_json || "[]"));
                if (Array.isArray(extras)) verifiedImages.push(...extras.map(String));
              } catch {}
              if (selectedImages.some((image) => verifiedImages.includes(image))) {
                throw new Error("Le nouveau produit est créé, mais une photo est encore présente dans le produit d’origine.");
              }
            }
            sessionStorage.removeItem("cms-new-product-source");
          }
        } catch (cleanupFailure) {
          setError(cleanupFailure instanceof Error
            ? `Nouveau produit enregistré, mais retrait de la photo source impossible : ${cleanupFailure.message}`
            : "Nouveau produit enregistré, mais retrait de la photo source impossible.");
        }
      }

      sessionStorage.removeItem("cms-product-draft");
      setEditing(null);
      await load();
      // Le rechargement de la liste peut replacer la page en haut. Remettre
      // l'administrateur exactement où il était pour poursuivre les articles.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: "instant" }));
      });
      flash(editingType === "product" ? "Produit enregistré et publié dans la boutique." : "Modifications enregistrées.");
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

  async function upload(files: FileList | File[] | undefined, setEditing: Dispatch<SetStateAction<Row | null>>) {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return [];
    setBusy(true);
    setError("");
    try {
      const uploadedImages: string[] = [];
      for (const originalFile of selectedFiles) {
        const file = await prepareImageForUpload(originalFile);
        const data = new FormData();
        data.append("file", file);
        const result = await request("/api/admin/upload", { method: "POST", body: data });
        uploadedImages.push(String(result.url));
      }

      setEditing((current) => {
        if (!current) return current;
        const images: string[] = [];
        const addImage = (value: unknown) => {
          if (typeof value !== "string") return;
          const image = value.trim();
          if (image && !images.includes(image)) images.push(image);
        };

        addImage(current.image_url);
        try {
          const extras = JSON.parse(String(current.images_json || "[]"));
          if (Array.isArray(extras)) extras.forEach(addImage);
        } catch {
          // Conserver l'image principale même si une ancienne liste est invalide.
        }
        uploadedImages.forEach(addImage);

        return {
          ...current,
          image_url: images[0] || "",
          images_json: JSON.stringify(images.slice(1)),
        };
      });
      flash(`${uploadedImages.length} photo${uploadedImages.length === 1 ? "" : "s"} téléversée${uploadedImages.length === 1 ? "" : "s"}.`);
      return uploadedImages;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Téléversement impossible.");
      return [];
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
    setBusy,
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
