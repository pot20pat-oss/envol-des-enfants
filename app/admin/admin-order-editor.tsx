import { markets, type Market } from "@/lib/markets";
import { orderLabels, type Row } from "./admin-shared";

export function OrderEditor({ editing, market, products, update }: { editing: Row; market: Market; products: Row[]; update: (field: string, value: string | number | boolean) => void }) {
  return <>
              {true && (
                <>
                  <div className="cms-form-grid">
                    <label>
                      Nom du client
                      <input
                        value={String(editing.customer_name || "")}
                        onChange={(event) =>
                          update("customer_name", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Téléphone
                      <input
                        value={String(editing.customer_phone || "")}
                        onChange={(event) =>
                          update("customer_phone", event.target.value)
                        }
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Produit commandé
                    <input
                      list="cms-product-options"
                      value={String(editing.product_name || "")}
                      onChange={(event) =>
                        update("product_name", event.target.value)
                      }
                      required
                    />
                    <datalist id="cms-product-options">
                      {products.map((product) => (
                        <option
                          key={String(product.id)}
                          value={`${product.article_number ? `[${String(product.article_number)}] ` : ""}${String(product.name_fr)}`}
                        />
                      ))}
                    </datalist>
                  </label>
                  <div className="cms-form-grid">
                    <label>
                      Quantité
                      <input
                        type="number"
                        min={1}
                        value={Number(editing.quantity || 1)}
                        onChange={(event) =>
                          update("quantity", Number(event.target.value))
                        }
                      />
                    </label>
                    <label>
                      Total · {markets[market].currency}
                      <input
                        type="number"
                        min={0}
                        step={market === "qc" ? "0.01" : "1"}
                        value={
                          market === "qc"
                            ? Number(editing.total || 0) / 100
                            : Number(editing.total || 0)
                        }
                        onChange={(event) =>
                          update(
                            "total",
                            market === "qc"
                              ? Math.round(Number(event.target.value) * 100)
                              : Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Statut
                      <select
                        value={String(editing.status || "new")}
                        onChange={(event) =>
                          update("status", event.target.value)
                        }
                      >
                        {Object.entries(orderLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Zone de livraison
                      <input
                        value={String(editing.delivery_zone || "")}
                        onChange={(event) =>
                          update("delivery_zone", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Notes
                    <textarea
                      value={String(editing.notes || "")}
                      onChange={(event) => update("notes", event.target.value)}
                    />
                  </label>
                </>
              )}

  </>;
}

