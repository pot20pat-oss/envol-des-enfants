import type { CSSProperties } from "react";
import type { Product, Translation } from "@/lib/default-catalog";
import { markets, type Market } from "@/lib/markets";
import ProductCard from "./product-card";

type Language = "fr" | "en";
type Category = { label: Translation; value: string };

type Props = {
  products: Product[]; availableCategories: Category[]; dollCategories: string[]; language: Language; market: Market;
  active: string; query: string; status: string; showAll: boolean; whatsappNumber: string; whatsappUrl: string;
  style?: CSSProperties; title: string; accent: string; description: string;
  onActiveChange: (category: string) => void; onQueryChange: (query: string) => void; onStatusChange: (status: string) => void;
  onShowAll: () => void; onOpenProduct: (product: Product) => void;
};

export default function StorefrontCatalog({ products, availableCategories, dollCategories, language, market, active, query, status, showAll, whatsappNumber, whatsappUrl, style, title, accent, description, onActiveChange, onQueryChange, onStatusChange, onShowAll, onOpenProduct }: Props) {
  const isEnglish = language === "en";
  const say = (fr: string, en: string) => isEnglish ? en : fr;
  const matchingProducts = products.filter((item) =>
    (active === "all" || item.category === active || (active === "disney" && item.category === "princesses") || (active === "poupees" && dollCategories.includes(item.category))) &&
    (status === "all" || item.status === status) &&
    (!query.trim() || `${item.name.fr} ${item.name.en} ${item.detail.fr} ${item.detail.en}`.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const visibleProducts = showAll || active !== "all" || status !== "all" || query.trim() ? matchingProducts : matchingProducts.slice(0, 12);
  const chooseCategory = (category: string) => { onActiveChange(category); onStatusChange("all"); onQueryChange(""); };

  const groups = [
    { key: "jouets", label: say("Jouets & jeux", "Toys & games"), values: ["eveil", "imitation", "dinosaures", "animaux"] },
    { key: "poupees", label: say("Poupées & princesses", "Dolls & princesses"), values: dollCategories },
    { key: "bebe", label: say("Bébé & éveil", "Baby & early learning"), values: ["bebe"] },
    { key: "ecole", label: say("Articles scolaires", "School supplies"), values: ["scolaire", "sacs"] },
    { key: "pleinair", label: say("Véhicules & plein air", "Vehicles & outdoor play"), values: ["vehicules", "piscine"] },
  ];

  return (
    <section className="univers section wrap" id="catalogue" style={style}>
      <div className="section-heading"><div><p className="eyebrow">{say("Nos trouvailles en boutique", "Discover our favourite finds")}</p><h2>{title}<br /><span>{accent}</span></h2></div><p>{description}</p></div>
      <div className="catalog-search">
        <label className="search-box"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={say("Rechercher un jouet, un cartable, une poupée…", "Search for a toy, a backpack, a doll…")} /></label>
        <select value={status} onChange={(event) => onStatusChange(event.target.value)} aria-label={say("Filtrer par disponibilité", "Filter by availability")}><option value="all">{say("Tous les statuts", "All availability")}</option><option value="available">{say("Disponible", "Available")}</option><option value="reserved">{say("Réservé", "Reserved")}</option><option value="sold">{say("Vendu", "Sold out")}</option></select>
      </div>
      <div className="category-tabs category-dropdowns" role="group" aria-label={say("Filtrer les univers", "Filter collections")}>
        <button type="button" className={active === "all" ? "active" : ""} onClick={() => chooseCategory("all")}>{say("Tout voir", "View all")}</button>
        {groups.map((group) => {
          const children = availableCategories.filter((category) => group.values.includes(category.value));
          if (children.length === 0) return null;
          const groupActive = group.key === "poupees" ? dollCategories.includes(active) : group.values.includes(active);
          return <details className={`category-menu-group category-menu-${group.key}${groupActive ? " is-active" : ""}`} key={group.key}>
            <summary><span>{group.label}</span><span className="category-menu-chevron" aria-hidden="true">⌄</span></summary>
            <div className="category-menu-panel">
              {group.key === "poupees" && <button type="button" className={`doll-world-choice${active === "poupees" ? " active" : ""}`} onClick={(event) => { chooseCategory("poupees"); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{say("Toutes les poupées", "All dolls")}</button>}
              {children.filter((category) => !(group.key === "poupees" && category.value === "poupees")).map((category) => <button type="button" key={category.value} className={`${group.key === "poupees" ? "doll-brand-choice" : ""}${active === category.value ? " active" : ""}`} onClick={(event) => { chooseCategory(category.value); event.currentTarget.closest("details")?.removeAttribute("open"); }}>{category.label[language].replace("↳ ", "")}</button>)}
            </div>
          </details>;
        })}
      </div>
      <div className="catalog-summary"><span>{matchingProducts.length} {say("trouvailles", "little finds")} · {markets[market].label}</span><span>{market === "qc" ? say("Prix en dollars canadiens", "Prices in Canadian dollars") : say("Prix en francs guinéens", "Prices in Guinean francs")}</span></div>
      <div className="product-grid" id="coups-de-coeur" key={`${active}-${status}-${query}`}>{visibleProducts.map((item) => <ProductCard key={item.id || `${item.sheet}-${item.position}`} item={item} language={language} market={market} whatsappNumber={whatsappNumber} whatsappUrl={whatsappUrl} onOpen={onOpenProduct} />)}</div>
      {matchingProducts.length === 0 && <p className="catalog-empty">{say("Aucune trouvaille ne correspond à votre recherche.", "No products matched your search.")}</p>}
      {!showAll && active === "all" && status === "all" && !query.trim() && matchingProducts.length > visibleProducts.length && <button className="show-more" onClick={onShowAll}>{say("Découvrir tout le catalogue", "Discover the whole collection")} <span>({matchingProducts.length}) →</span></button>}
    </section>
  );
}
