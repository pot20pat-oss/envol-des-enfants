import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { categories, request, type Row } from "./admin-shared";

type ProductEditorProps = {
  editing: Row;
  setEditing: Dispatch<SetStateAction<Row | null>>;
  update: (field: string, value: string | number | boolean) => void;
  upload: (files?: FileList | File[]) => Promise<string[]>;
};

export function ProductIdentityFields({ editing, setEditing, update }: Omit<ProductEditorProps, "upload">) {
  return <>
    <label>
      Disponible dans quelle boutique ?
      <select
        value={editing.visible_qc && editing.visible_conakry ? "both" : editing.visible_qc ? "qc" : editing.visible_conakry ? "conakry" : ""}
        onChange={(event) => {
          const availability = event.target.value;
          setEditing((current) => current ? {
            ...current,
            visible_qc: availability === "qc" || availability === "both",
            visible_conakry: availability === "conakry" || availability === "both",
          } : current);
        }}
        required
      >
        <option value="" disabled>Choisir une boutique</option>
        <option value="qc">Québec seulement</option>
        <option value="conakry">Conakry seulement</option>
        <option value="both">Québec et Conakry</option>
      </select>
    </label>

    {editing.id && (
      <label>
        Numéro d’article
        <input className="cms-article-number-input" value={String(editing.article_number || "Attribué automatiquement")} readOnly />
      </label>
    )}

    {editing.id && (
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",padding:"12px 14px",border:"1px solid #cbdbe4",borderRadius:10,background:"#f8fbfd"}}>
        <button
          type="button"
          className="cms-primary"
          onClick={() => {
            if (!window.confirm("Créer une nouvelle fiche à partir de cet article ? L’article actuel ne sera pas modifié tant que la nouvelle fiche n’est pas enregistrée.")) return;
            setEditing((current) => current ? {
              ...current,
              id: undefined,
              article_number: undefined,
              name_fr: `${String(current.name_fr || "")} — nouveau produit`,
              stock_qc: 0,
              stock_conakry: 0,
              visible_qc: false,
              visible_conakry: false,
              visible: false,
              featured: false,
            } : current);
          }}
        >
          ＋ Ceci est un nouveau produit
        </button>
        <span>Crée une fiche indépendante à partir de celle-ci, sans écraser l’article existant.</span>
      </div>
    )}

    <div className="cms-form-grid">
      <label>
        Nom du produit · FR
        <input value={String(editing.name_fr || "")} onChange={(event) => update("name_fr", event.target.value)} required />
      </label>
      <label>
        Product name · EN
        <input value={String(editing.name_en || "")} onChange={(event) => update("name_en", event.target.value)} />
      </label>
    </div>

    <div className="cms-form-grid">
      <label>
        Catégorie
        <select value={String(editing.category || "eveil")} onChange={(event) => update("category", event.target.value)}>
          {Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label>
        Âge conseillé
        <input value={String(editing.ages || "")} onChange={(event) => update("ages", event.target.value)} />
      </label>
    </div>
  </>;
}

export function ProductMarketFields({ editing, update }: Pick<ProductEditorProps, "editing" | "update">) {
  return <>
    <fieldset className="cms-market-fields">
      <legend>Conakry · GNF</legend>
      <label className="cms-checkbox">
        <input type="checkbox" checked={Boolean(editing.visible_conakry)} onChange={(event) => update("visible_conakry", event.target.checked)} />{" "}
        Disponible dans la boutique de Conakry
      </label>
      <div className="cms-form-grid">
        <label>
          Prix · GNF
          <input type="number" min={0} value={Number(editing.price_conakry ?? editing.price ?? 0)} onChange={(event) => update("price_conakry", Number(event.target.value))} />
        </label>
        <label>
          Stock · Conakry
          <input type="number" min={0} value={Number(editing.stock_conakry ?? editing.stock ?? 0)} onChange={(event) => update("stock_conakry", Number(event.target.value))} />
        </label>
      </div>
      <label>
        Prix promotionnel · GNF
        <input type="number" min={0} value={Number(editing.promo_price_conakry || 0)} onChange={(event) => update("promo_price_conakry", Number(event.target.value))} />
      </label>
    </fieldset>

    <fieldset className="cms-market-fields">
      <legend>Québec · CAD</legend>
      <label className="cms-checkbox">
        <input type="checkbox" checked={Boolean(editing.visible_qc)} onChange={(event) => update("visible_qc", event.target.checked)} />{" "}
        Disponible dans la boutique du Québec
      </label>
      <div className="cms-form-grid">
        <label>
          Prix · CAD
          <input type="number" min={0} step="0.01" value={Number(editing.price_qc || 0) / 100} onChange={(event) => update("price_qc", Math.round(Number(event.target.value) * 100))} />
        </label>
        <label>
          Stock · Québec
          <input type="number" min={0} value={Number(editing.stock_qc || 0)} onChange={(event) => update("stock_qc", Number(event.target.value))} />
        </label>
      </div>
      <label>
        Prix promotionnel · CAD
        <input type="number" min={0} step="0.01" value={Number(editing.promo_price_qc || 0) / 100} onChange={(event) => update("promo_price_qc", Math.round(Number(event.target.value) * 100))} />
      </label>
    </fieldset>
  </>;
}

export function ProductDetailsFields({ editing, update }: Pick<ProductEditorProps, "editing" | "update">) {
  return <>
    <div className="cms-form-grid">
      <label>
        Disponibilité
        <select value={String(editing.status || "available")} onChange={(event) => update("status", event.target.value)}>
          <option value="available">Disponible</option>
          <option value="reserved">Réservé</option>
          <option value="sold">Épuisé</option>
        </select>
      </label>
      <label>
        Étiquette
        <select value={String(editing.badge || "")} onChange={(event) => update("badge", event.target.value)}>
          <option value="">Aucune</option>
          <option value="new">Nouveauté</option>
          <option value="school">Rentrée scolaire</option>
        </select>
      </label>
    </div>

    <div className="cms-form-grid">
      <label>
        Seuil d’alerte du stock
        <input type="number" min={0} value={Number(editing.alert_threshold ?? 2)} onChange={(event) => update("alert_threshold", Number(event.target.value))} />
      </label>
      <label>
        Variantes · couleurs, tailles
        <input value={String(editing.variants_json || "[]")} onChange={(event) => update("variants_json", event.target.value)} />
      </label>
    </div>

    <label>
      Description · FR
      <textarea value={String(editing.description_fr || "")} onChange={(event) => update("description_fr", event.target.value)} />
    </label>
    <label>
      Description · EN
      <textarea value={String(editing.description_en || "")} onChange={(event) => update("description_en", event.target.value)} />
    </label>

    <div className="cms-form-grid">
      <label>
        Marque
        <input value={String(editing.brand || "")} onChange={(event) => update("brand", event.target.value)} />
      </label>
      <label>
        Matière
        <input value={String(editing.material || "")} onChange={(event) => update("material", event.target.value)} />
      </label>
    </div>

    <label>
      Dimensions
      <input value={String(editing.dimensions || "")} onChange={(event) => update("dimensions", event.target.value)} />
    </label>
  </>;
}

function productImages(editing: Row) {
  const images: string[] = [];
  const addImage = (value: unknown) => {
    if (typeof value !== "string") return;
    const image = value.trim();
    if (image && !images.includes(image)) images.push(image);
  };

  addImage(editing.image_url);
  try {
    const extras = JSON.parse(String(editing.images_json || "[]"));
    if (Array.isArray(extras)) extras.forEach(addImage);
  } catch {
    // Une ancienne valeur invalide reste modifiable dès qu'une image est déplacée ou supprimée.
  }
  return images;
}

function saveProductImages(
  images: string[],
  update: ProductEditorProps["update"],
) {
  update("image_url", images[0] || "");
  update("images_json", JSON.stringify(images.slice(1)));
}

export function ProductMediaAndTermsFields({ editing, setEditing, update, upload }: Pick<ProductEditorProps, "editing" | "setEditing" | "update" | "upload">) {
  const images = productImages(editing);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [moveTargetId, setMoveTargetId] = useState("");
  const [moveTargets, setMoveTargets] = useState<Row[]>([]);
  const [movingImages, setMovingImages] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("cms-photo-selection", {
      detail: { count: selectedImages.length }
    }));
  }, [selectedImages.length]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent("cms-photo-selection", { detail: { count: 0 } }));
  }, []);

  const toggleImageSelection = (image: string) => {
    setSelectedImages((current) => current.includes(image)
      ? current.filter((item) => item !== image)
      : [...current, image]);
  };

  const loadMoveTargets = async () => {
    try {
      const result = await request("/api/admin/products");
      const products = Array.isArray(result.products) ? result.products as Row[] : [];
      setMoveTargets(products.filter((product) => String(product.id || "") !== String(editing.id || "")));
    } catch {
      setAnalysisNotice("Impossible de charger la liste des produits.");
    }
  };

  const moveSelectedToExistingProduct = async () => {
    if (!selectedImages.length || !moveTargetId || !editing.id) return;
    const target = moveTargets.find((product) => String(product.id) === moveTargetId);
    if (!target) return;
    if (!window.confirm(`Déplacer ${selectedImages.length} photo(s) vers « ${String(target.name_fr || target.article_number || "ce produit")} » ?`)) return;
    setMovingImages(true);
    setAnalysisNotice("");
    try {
      const targetImages = productImages(target);
      const mergedTargetImages = [...targetImages];
      selectedImages.forEach((image) => {
        if (!mergedTargetImages.includes(image)) mergedTargetImages.push(image);
      });
      const sourceImages = images.filter((image) => !selectedImages.includes(image));

      await request("/api/admin/products", {
        method: "PUT",
        body: JSON.stringify({
          ...target,
          image_url: mergedTargetImages[0] || "",
          images_json: JSON.stringify(mergedTargetImages.slice(1)),
        }),
      });
      await request("/api/admin/products", {
        method: "PUT",
        body: JSON.stringify({
          ...editing,
          image_url: sourceImages[0] || "",
          images_json: JSON.stringify(sourceImages.slice(1)),
        }),
      });

      saveProductImages(sourceImages, update);
      setSelectedImages([]);
      setMoveTargetId("");
      setAnalysisNotice("Photos déplacées vers l’autre produit et enregistrées.");
    } catch (failure) {
      setAnalysisNotice(failure instanceof Error ? failure.message : "Déplacement des photos impossible.");
    } finally {
      setMovingImages(false);
    }
  };

  const detachSelectedImages = async () => {
    if (!selectedImages.length || !editing.id) return;
    const sourceImages = images.filter((image) => !selectedImages.includes(image));
    if (!window.confirm(`Retirer définitivement ${selectedImages.length} photo(s) de cet article ?`)) return;
    setMovingImages(true);
    setAnalysisNotice("");
    try {
      await request("/api/admin/products", {
        method: "PUT",
        body: JSON.stringify({
          ...editing,
          image_url: sourceImages[0] || "",
          images_json: JSON.stringify(sourceImages.slice(1)),
        }),
      });
      saveProductImages(sourceImages, update);
      setSelectedImages([]);
      setAnalysisNotice("Photos retirées et suppression enregistrée sur l’article d’origine.");
    } catch (failure) {
      setAnalysisNotice(failure instanceof Error ? failure.message : "Impossible de retirer les photos de l’article.");
    } finally {
      setMovingImages(false);
    }
  };

  const makeNewProductFromSelected = async () => {
    if (!selectedImages.length || !editing.id) return;

    const sourceImages = images.filter((image) => !selectedImages.includes(image));
    const moved = images.filter((image) => selectedImages.includes(image));

    if (!window.confirm(`Créer un nouveau produit avec ${moved.length} photo(s) sélectionnée(s) et les retirer du produit actuel ?`)) return;

    setMovingImages(true);
    setAnalysisNotice("");

    try {
      await request("/api/admin/products", {
        method: "PUT",
        body: JSON.stringify({
          ...editing,
          image_url: sourceImages[0] || "",
          images_json: JSON.stringify(sourceImages.slice(1)),
        }),
      });

      setEditing((current) => current ? {
        ...current,
        id: undefined,
        article_number: undefined,
        name_fr: `${String(current.name_fr || "")} — nouveau produit`,
        image_url: moved[0] || "",
        images_json: JSON.stringify(moved.slice(1)),
        stock_qc: 1,
        stock_conakry: 1,
        visible_qc: false,
        visible_conakry: false,
        visible: false,
        featured: false,
      } : current);

      setSelectedImages([]);
      setMoveTargetId("");
      setAnalysisNotice("Produit d’origine mis à jour. Modifiez maintenant cette nouvelle fiche puis cliquez Enregistrer.");
    } catch (failure) {
      setAnalysisNotice(failure instanceof Error ? failure.message : "Création du nouveau produit impossible.");
    } finally {
      setMovingImages(false);
    }
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    saveProductImages(reordered, update);
  };

  const removeImage = (index: number) => {
    saveProductImages(images.filter((_, imageIndex) => imageIndex !== index), update);
  };

  const analyzeImage = async () => {
    if (!images[0]) return;
    setAnalyzing(true);
    setAnalysisNotice("");
    try {
      const result = await request("/api/admin/analyze-product", {
        method: "POST",
        body: JSON.stringify({ image_url: images[0] }),
      });
      const suggestion = result.suggestion;
      if (!suggestion || typeof suggestion !== "object" || Array.isArray(suggestion)) {
        throw new Error("Suggestion NVIDIA invalide.");
      }
      const fields = suggestion as Record<string, unknown>;
      for (const field of ["name_fr", "name_en", "description_fr", "description_en", "category", "brand", "ages"]) {
        if (typeof fields[field] === "string" && fields[field]) update(field, fields[field]);
      }
      const confidence = Number(fields.confidence || 0);
      setAnalysisNotice(`Suggestions ajoutées au formulaire${confidence ? ` · confiance ${Math.round(confidence * 100)} %` : ""}. Vérifiez-les avant d’enregistrer.`);
    } catch (failure) {
      setAnalysisNotice(failure instanceof Error ? failure.message : "Analyse NVIDIA impossible.");
    } finally {
      setAnalyzing(false);
    }
  };

  return <>
    <section className="cms-product-images-manager" aria-labelledby="cms-product-images-title">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:16,padding:"14px 16px",border:"1px solid #cbdbe4",borderRadius:12,background:"#f8fbfd"}}>
        <div>
          <strong style={{display:"block",fontSize:"1rem"}}>Photo du produit</strong>
          <span style={{fontSize:".9rem",opacity:.75}}>Remplacer la photo principale ou ajouter plusieurs photos.</span>
        </div>
        <label className="cms-primary" style={{cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",margin:0}}>
          📷 Changer la photo
          <input
            type="file"
            accept="image/*"
            multiple
            style={{display:"none"}}
            onChange={async (event) => {
              const input = event.currentTarget;
              const selected = Array.from(input.files || []);
              input.value = "";
              if (!selected.length) return;
              const uploaded = await upload(selected);
              if (!uploaded.length) return;
              const merged = [...images];
              for (const image of uploaded) if (image && !merged.includes(image)) merged.push(image);
              saveProductImages(merged, update);
            }}
          />
        </label>
      </div>

      <div className="cms-product-images-heading">
        <div>
          <h3 id="cms-product-images-title">Photos du produit</h3>
          <p>La première photo est présentée en premier sur le site.</p>
        </div>
        <strong>{images.length} photo{images.length === 1 ? "" : "s"}</strong>
      </div>

      {selectedImages.length > 0 && (
        <div data-cms-selected-photo-actions style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",padding:"12px 14px",marginTop:14,border:"1px solid #cbdbe4",borderRadius:10,background:"#f8fbfd"}}>
          <strong>{selectedImages.length} photo{selectedImages.length === 1 ? "" : "s"} sélectionnée{selectedImages.length === 1 ? "" : "s"}</strong>
          <button type="button" className="cms-secondary" disabled={movingImages} onClick={() => void detachSelectedImages()}>
            ↗ Retirer de ce produit
          </button>
          <button type="button" className="cms-primary" disabled={movingImages} onClick={() => void makeNewProductFromSelected()}>
            ＋ En faire un nouveau produit
          </button>
          <button type="button" className="cms-secondary" onClick={() => void loadMoveTargets()}>
            ⇄ Déplacer vers un produit existant
          </button>
          {moveTargets.length > 0 && (
            <>
              <select value={moveTargetId} onChange={(event) => setMoveTargetId(event.target.value)} style={{minWidth:260}}>
                <option value="">Choisir le produit cible…</option>
                {moveTargets.map((product) => (
                  <option key={String(product.id)} value={String(product.id)}>
                    {String(product.article_number || "")} · {String(product.name_fr || "Produit sans nom")}
                  </option>
                ))}
              </select>
              <button type="button" className="cms-primary" disabled={!moveTargetId || movingImages} onClick={() => void moveSelectedToExistingProduct()}>
                {movingImages ? "Déplacement…" : "Confirmer le déplacement"}
              </button>
            </>
          )}
          <span style={{fontSize:".9rem",opacity:.75}}>Le déplacement retire les photos de cette fiche et les ajoute à la fiche choisie sans supprimer les fichiers.</span>
        </div>
      )}

      {images.length > 0 ? (
        <div className="cms-product-images-list">
          {images.map((image, index) => (
            <article className="cms-product-image-item" key={image}>
              <button type="button" className="cms-product-image-preview-button" onClick={() => setZoomImage(image)} title="Agrandir la photo">
                <img src={image} alt={index === 0 ? "Photo principale du produit" : `Photo ${index + 1} du produit`} />
                <span>Agrandir</span>
              </button>
              <div className="cms-product-image-meta">
                <label className="cms-checkbox" style={{marginBottom:6}}>
                  <input
                    type="checkbox"
                    checked={selectedImages.includes(image)}
                    onChange={() => toggleImageSelection(image)}
                  />{" "}
                  Sélectionner
                </label>
                <strong>{index === 0 ? "Photo principale" : `Photo ${index + 1}`}</strong>
                <span>Position {index + 1}</span>
              </div>
              <div className="cms-product-image-controls">
                <button
                  type="button"
                  className="cms-image-order-button"
                  onClick={() => moveImage(index, -1)}
                  disabled={index === 0}
                  aria-label="Déplacer cette photo vers le début"
                  title="Monter"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="cms-image-order-button"
                  onClick={() => moveImage(index, 1)}
                  disabled={index === images.length - 1}
                  aria-label="Déplacer cette photo vers la fin"
                  title="Descendre"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="cms-image-remove-button"
                  onClick={() => removeImage(index)}
                  aria-label={`Supprimer la photo ${index + 1}`}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="cms-product-images-empty">Aucune photo. Ajoutez une ou plusieurs photos ci-dessus.</p>
      )}

      <div className="cms-product-analysis">
        <button
          type="button"
          className="cms-secondary"
          disabled={!images[0] || analyzing}
          onClick={() => void analyzeImage()}
        >
          {analyzing ? "Analyse en cours…" : editing.id ? "✨ Corriger la fiche avec l’IA" : "✨ Analyser avec l’IA"}
        </button>
        <p>{analysisNotice || "L’IA réanalyse la photo et propose de corriger le nom, la catégorie, la marque, l’âge et les descriptions. Rien n’est enregistré sans votre confirmation."}</p>
      </div>
    </section>

    {zoomImage && <div className="cms-image-lightbox" role="dialog" aria-modal="true" aria-label="Aperçu agrandi" onClick={() => setZoomImage(null)}>
      <button type="button" className="cms-image-lightbox-close" onClick={() => setZoomImage(null)} aria-label="Fermer">×</button>
      <img src={zoomImage} alt="Aperçu agrandi du produit" onClick={(event) => event.stopPropagation()} />
    </div>}

    <label>
      Conditions d’échange · FR
      <textarea value={String(editing.exchange_terms_fr || "")} onChange={(event) => update("exchange_terms_fr", event.target.value)} />
    </label>
    <label>
      Exchange terms · EN
      <textarea value={String(editing.exchange_terms_en || "")} onChange={(event) => update("exchange_terms_en", event.target.value)} />
    </label>

    <label className="cms-checkbox">
      <input type="checkbox" checked={Boolean(editing.featured)} onChange={(event) => update("featured", event.target.checked)} />{" "}
      Mettre ce produit en vedette
    </label>
  </>;
}
