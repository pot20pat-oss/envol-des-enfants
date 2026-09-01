import { markets, type Market } from "@/lib/markets";
import type { Row } from "./admin-shared";

export function PromotionEditor({ editing, market, update }: { editing: Row; market: Market; update: (field: string, value: string | number | boolean) => void }) {
  return <>
              {true && (
                <>
                  <div className="cms-form-grid">
                    <label>
                      Titre · FR
                      <input
                        value={String(editing.title_fr || "")}
                        onChange={(event) =>
                          update("title_fr", event.target.value)
                        }
                        required
                      />
                    </label>
                    <label>
                      Title · EN
                      <input
                        value={String(editing.title_en || "")}
                        onChange={(event) =>
                          update("title_en", event.target.value)
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
                      Boutique
                      <select
                        value={String(editing.region || market)}
                        onChange={(event) =>
                          update("region", event.target.value)
                        }
                      >
                        <option value="conakry">Conakry</option>
                        <option value="qc">Québec</option>
                        <option value="both">Les deux boutiques</option>
                      </select>
                    </label>
                    <label>
                      Code promotionnel
                      <input
                        value={String(editing.promo_code || "")}
                        onChange={(event) =>
                          update("promo_code", event.target.value.toUpperCase())
                        }
                        placeholder="BIENVENUE10"
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Type de rabais
                      <select
                        value={String(editing.discount_type || "percent")}
                        onChange={(event) =>
                          update("discount_type", event.target.value)
                        }
                      >
                        <option value="percent">Pourcentage</option>
                        <option value="amount">Montant fixe</option>
                      </select>
                    </label>
                    {editing.discount_type === "amount" ? (
                      <label>
                        Montant · {markets[market].currency}
                        <input
                          type="number"
                          min={0}
                          step={market === "qc" ? "0.01" : "1"}
                          value={
                            market === "qc"
                              ? Number(editing.discount_amount || 0) / 100
                              : Number(editing.discount_amount || 0)
                          }
                          onChange={(event) =>
                            update(
                              "discount_amount",
                              market === "qc"
                                ? Math.round(Number(event.target.value) * 100)
                                : Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        Pourcentage de rabais
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Number(editing.discount_percent || 0)}
                          onChange={(event) =>
                            update(
                              "discount_percent",
                              Number(event.target.value),
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Achat minimum · {markets[market].currency}
                      <input
                        type="number"
                        min={0}
                        step={market === "qc" ? "0.01" : "1"}
                        value={
                          market === "qc"
                            ? Number(editing.minimum_purchase || 0) / 100
                            : Number(editing.minimum_purchase || 0)
                        }
                        onChange={(event) =>
                          update(
                            "minimum_purchase",
                            market === "qc"
                              ? Math.round(Number(event.target.value) * 100)
                              : Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      Nombre maximal d’utilisations
                      <input
                        type="number"
                        min={0}
                        value={Number(editing.usage_limit || 0)}
                        onChange={(event) =>
                          update("usage_limit", Number(event.target.value))
                        }
                      />
                    </label>
                  </div>
                  <div className="cms-form-grid">
                    <label>
                      Début
                      <input
                        type="date"
                        value={String(editing.starts_at || "")}
                        onChange={(event) =>
                          update("starts_at", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Fin
                      <input
                        type="date"
                        value={String(editing.ends_at || "")}
                        onChange={(event) =>
                          update("ends_at", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className="cms-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.active)}
                      onChange={(event) =>
                        update("active", event.target.checked)
                      }
                    />{" "}
                    Promotion active
                  </label>
                </>
              )}

  </>;
}

