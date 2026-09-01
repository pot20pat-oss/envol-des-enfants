import type { Market } from "@/lib/markets";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { OrderEditor } from "./admin-order-editor";
import { ProductEditor } from "./admin-product-editor";
import { PromotionEditor } from "./admin-promotion-editor";
import type { Row } from "./admin-shared";

export type EditingType = "product" | "promotion" | "order";

export function AdminEditModal({ editing, editingType, setEditing, save, update, upload, busy, market, products }: {
  editing: Row;
  editingType: EditingType;
  setEditing: Dispatch<SetStateAction<Row | null>>;
  save: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  update: (field: string, value: string | number | boolean) => void;
  upload: (file?: File) => void | Promise<void>;
  busy: boolean;
  market: Market;
  products: Row[];
}) {
  return (
          <div
            className="cms-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) setEditing(null);
            }}
          >
            <form className="cms-editor cms-form" onSubmit={save}>
              <div className="cms-panel-title">
                <h2>
                  {editing.id ? "Modifier" : "Ajouter"}{" "}
                  {editingType === "product"
                    ? "un produit"
                    : editingType === "promotion"
                      ? "une promotion"
                      : "une commande"}
                </h2>
                <button
                  type="button"
                  className="cms-close"
                  onClick={() => setEditing(null)}
                >
                  ×
                </button>
              </div>
              {editingType === "product" && <ProductEditor editing={editing} setEditing={setEditing} update={update} upload={upload} />}
              {editingType === "promotion" && <PromotionEditor editing={editing} market={market} update={update} />}
              {editingType === "order" && <OrderEditor editing={editing} market={market} products={products} update={update} />}
              <div className="cms-editor-actions">
                <button
                  type="button"
                  className="cms-secondary"
                  onClick={() => setEditing(null)}
                >
                  Annuler
                </button>
                <button className="cms-primary" disabled={busy}>
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
  );
}
