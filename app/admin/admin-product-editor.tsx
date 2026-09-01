import type { Dispatch, SetStateAction } from "react";
import { categories, type Row } from "./admin-shared";

export function ProductEditor({ editing, setEditing, update, upload }: { editing: Row; setEditing: Dispatch<SetStateAction<Row | null>>; update: (field: string, value: string | number | boolean) => void; upload: (file?: File) => void | Promise<void> }) {
  return <>
              {true && (
                <label>
                  Disponible dans quelle boutique ?
                  <select
                    value={
                      editing.visible_qc && editing.visible_conakry
                        ? "both"
                        : editing.visible_qc
                          ? "qc"
                          : editing.visible_conakry
                            ? "conakry"
                            : ""
                    }
                    onChange={(event) => {
                      const availability = event.target.value;
                      setEditing((current) =>
                        current
                          ? {
                              ...current,
                              visible_qc:
                                availability === "qc" ||
                                availability === "both",
                              visible_conakry:
                                availability === "conakry" ||
                                availability === "both",
                            }
                          : current,
                      );
                    }}
                    required
                  >
                    <option value="" disabled>
                      Choisir une boutique
                    </option>
                    <option value="qc">Québec seulement</option>
                    <option value="conakry">Conakry seulement</option>
                    <option value="both">Québec et Conakry</option>
                  </select>
                </label>
              )}
              {true && (
                <>
                  {editing.id && (
                    <label>
                      Numéro d’article
                      <input
                        className="cms-article-number-input"
                        value={String(editing.article_number || "Attribué automatiquement")}
                        readOnly
                      />
                    </label>
                  )}
                  <div className="cms-form-grid">
                    <label>
                      Nom du produit · FR
                      <input
                        value={String(editing.name_fr || "")}
                        onChange={(event) =>
                          update("name_fr", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Product name · EN
                      <input
                        value={String(editing.name_en || "")}
                        onChange={(event) =>
                          update("name_en", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Catégorie
                      <select
                        value={String(editing.category || "eveil")}
                        onChange={(event) =>
                          update("category", event.target.value)
                        }
                      >
                        {Object.entries(categories).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Âge conseillé
                      <input
                        value={String(editing.ages || "")}
                        onChange={(event) => update("ages", event.target.value)}
                      />
                    </label>
                  </div>
                  <fieldset className="cms-market-fields">
                    <legend>Conakry · GNF</legend>
                    <label className="cms-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(editing.visible_conakry)}
                        onChange={(event) =>
                          update("visible_conakry", event.target.checked)
                        }
                      />{" "}
                      Disponible dans la boutique de Conakry
                    </label>
                    <div className="cms-form-grid">
                      <label>
                        Prix · GNF
                        <input
                          type="number"
                          min={0}
                          value={Number(
                            editing.price_conakry ?? editing.price ?? 0,
                          )}
                          onChange={(event) =>
                            update("price_conakry", Number(event.target.value))
                          }
                        />
                      </label>
                      <label>
                        Stock · Conakry
                        <input
                          type="number"
                          min={0}
                          value={Number(
                            editing.stock_conakry ?? editing.stock ?? 0,
                          )}
                          onChange={(event) =>
                            update("stock_conakry", Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Prix promotionnel · GNF
                      <input
                        type="number"
                        min={0}
                        value={Number(editing.promo_price_conakry || 0)}
                        onChange={(event) =>
                          update(
                            "promo_price_conakry",
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                  </fieldset>
                  <fieldset className="cms-market-fields">
                    <legend>Québec · CAD</legend>
                    <label className="cms-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(editing.visible_qc)}
                        onChange={(event) =>
                          update("visible_qc", event.target.checked)
                        }
                      />{" "}
                      Disponible dans la boutique du Québec
                    </label>
                    <div className="cms-form-grid">
                      <label>
                        Prix · CAD
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={Number(editing.price_qc || 0) / 100}
                          onChange={(event) =>
                            update(
                              "price_qc",
                              Math.round(Number(event.target.value) * 100),
                            )
                          }
                        />
                      </label>
                      <label>
                        Stock · Québec
                        <input
                          type="number"
                          min={0}
                          value={Number(editing.stock_qc || 0)}
                          onChange={(event) =>
                            update("stock_qc", Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Prix promotionnel · CAD
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={Number(editing.promo_price_qc || 0) / 100}
                        onChange={(event) =>
                          update(
                            "promo_price_qc",
                            Math.round(Number(event.target.value) * 100),
                          )
                        }
                      />
                    </label>
                  </fieldset>
                  <div className="cms-form-grid">
                    <label>
                      Disponibilité
                      <select
                        value={String(editing.status || "available")}
                        onChange={(event) =>
                          update("status", event.target.value)
                        }
                      >
                        <option value="available">Disponible</option>
                        <option value="reserved">Réservé</option>
                        <option value="sold">Épuisé</option>
                      </select>
                    </label>
                    <label>
                      Étiquette
                      <select
                        value={String(editing.badge || "")}
                        onChange={(event) =>
                          update("badge", event.target.value)
                        }
                      >
                        <option value="">Aucune</option>
                        <option value="new">Nouveauté</option>
                        <option value="school">Rentrée scolaire</option>
                      </select>
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Seuil d’alerte du stock
                      <input
                        type="number"
                        min={0}
                        value={Number(editing.alert_threshold ?? 2)}
                        onChange={(event) =>
                          update("alert_threshold", Number(event.target.value))
                        }
                      />
                    </label>
                    <label>
                      Variantes · couleurs, tailles
                      <input
                        value={String(editing.variants_json || "[]")}
                        onChange={(event) =>
                          update("variants_json", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Description · FR
                    <textarea
                      value={String(editing.description_fr || "")}
                      onChange={(event) =>
                        update("description_fr", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Description · EN
                    <textarea
                      value={String(editing.description_en || "")}
                      onChange={(event) =>
                        update("description_en", event.target.value)
                      }
                    />
                  </label>
                  <div className="cms-form-grid">
                    <label>
                      Marque
                      <input
                        value={String(editing.brand || "")}
                        onChange={(event) =>
                          update("brand", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Matière
                      <input
                        value={String(editing.material || "")}
                        onChange={(event) =>
                          update("material", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Dimensions
                    <input
                      value={String(editing.dimensions || "")}
                      onChange={(event) =>
                        update("dimensions", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Photo principale du produit
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => void upload(event.target.files?.[0])}
                    />
                  </label>
                  {editing.image_url && (
                    <img
                      className="cms-image-preview"
                      src={String(editing.image_url)}
                      alt="Aperçu du produit"
                    />
                  )}
                  <label>
                    Photos supplémentaires · liens JSON
                    <input
                      value={String(editing.images_json || "[]")}
                      onChange={(event) =>
                        update("images_json", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Conditions d’échange · FR
                    <textarea
                      value={String(editing.exchange_terms_fr || "")}
                      onChange={(event) =>
                        update("exchange_terms_fr", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Exchange terms · EN
                    <textarea
                      value={String(editing.exchange_terms_en || "")}
                      onChange={(event) =>
                        update("exchange_terms_en", event.target.value)
                      }
                    />
                  </label>
                  <label className="cms-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.featured)}
                      onChange={(event) =>
                        update("featured", event.target.checked)
                      }
                    />{" "}
                    Mettre ce produit en vedette
                  </label>
                </>
              )}

  </>;
}

