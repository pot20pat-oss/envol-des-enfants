import { marketPrice, markets, type Market } from "@/lib/markets";
import type { Row } from "./admin-shared";

export function PromotionsSection({ promotions, market, add, edit, remove }: { promotions: Row[]; market: Market; add: () => void; edit: (promotion: Row) => void; remove: (id: string) => void }) {
  return <section className="cms-panel"><div className="cms-panel-title"><h2>Offres et réductions · {markets[market].label}</h2><button className="cms-primary" onClick={add}>+ Créer une promotion</button></div>
    {promotions.map((promotion) => <article className="cms-promo" key={String(promotion.id)}><div><span className="cms-promo-badge">−{promotion.discount_type === "amount" ? marketPrice(promotion.discount_amount, market) : `${String(promotion.discount_percent)} %`}</span><h3>{String(promotion.title_fr)} {promotion.promo_code && <small>· {String(promotion.promo_code)}</small>}</h3><p>{String(promotion.description_fr)}</p><p>{promotion.region === "both" ? "Les deux boutiques" : markets[promotion.region === "qc" ? "qc" : "conakry"].label} · {String(promotion.usage_count || 0)} utilisation(s){promotion.usage_limit ? ` / ${String(promotion.usage_limit)}` : ""}</p></div><div><span className={`cms-status ${promotion.active ? "available" : "sold"}`}>{promotion.active ? "Active" : "Inactive"}</span><button className="cms-inline" onClick={() => edit(promotion)}>Modifier</button><button className="cms-inline danger" onClick={() => remove(String(promotion.id))}>Supprimer</button></div></article>)}
    {!promotions.length && <p className="cms-empty">Aucune promotion créée pour cette boutique.</p>}
  </section>;
}
