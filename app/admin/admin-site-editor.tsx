import { defaultSiteSections, editableTexts, type SiteSection } from "@/lib/site-editor";
import { markets, type Market } from "@/lib/markets";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Row } from "./admin-shared";

export function SiteEditor({ market, busy, sections, setSections, texts, setTexts, draggedSection, setDraggedSection, moveSection, versions, restoreVersion, save }: {
  market: Market;
  busy: boolean;
  sections: SiteSection[];
  setSections: Dispatch<SetStateAction<SiteSection[]>>;
  texts: Record<string, string>;
  setTexts: Dispatch<SetStateAction<Record<string, string>>>;
  draggedSection: string | null;
  setDraggedSection: Dispatch<SetStateAction<string | null>>;
  moveSection: (id: string, index: number) => void;
  versions: Row[];
  restoreVersion: (version: Row) => void;
  save: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return <form className="cms-site-editor" onSubmit={save}>
    <div className="cms-editor-toolbar"><div><h2>Personnalisez la boutique · {markets[market].label}</h2><p>Réorganisez les sections, masquez celles que vous ne souhaitez pas afficher et modifiez les textes en français et en anglais. Chaque marché conserve sa propre présentation.</p></div><button className="cms-primary" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le site"}</button></div>
    <section className="cms-panel cms-section-manager">
      <div className="cms-panel-title"><h2>Ordre et visibilité des sections</h2><button type="button" className="cms-inline" onClick={() => setSections(defaultSiteSections.map((item) => ({ ...item })))}>Rétablir l’ordre initial</button></div>
      <p className="cms-editor-help">Glissez les sections ou utilisez les flèches pour modifier leur emplacement sur la page.</p>
      <div className="cms-section-list">{sections.map((item, index) => <article className={`cms-section-row${item.visible ? "" : " is-hidden"}${draggedSection === item.id ? " is-dragging" : ""}`} key={item.id} draggable onDragStart={() => setDraggedSection(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggedSection) moveSection(draggedSection, index); setDraggedSection(null); }} onDragEnd={() => setDraggedSection(null)}>
        <span className="cms-drag-handle" aria-hidden="true">⠿</span><span className="cms-section-number">{String(index + 1).padStart(2, "0")}</span><strong>{item.label}</strong>
        <div className="cms-section-controls"><button type="button" aria-label={`Monter ${item.label}`} disabled={index === 0} onClick={() => moveSection(item.id, index - 1)}>↑</button><button type="button" aria-label={`Descendre ${item.label}`} disabled={index === sections.length - 1} onClick={() => moveSection(item.id, index + 1)}>↓</button><label className="cms-visibility-toggle"><input type="checkbox" checked={item.visible} onChange={() => setSections((current) => current.map((entry) => entry.id === item.id ? { ...entry, visible: !entry.visible } : entry))} /><span>{item.visible ? "Visible" : "Masquée"}</span></label></div>
      </article>)}</div>
    </section>
    <section className="cms-panel cms-copy-manager">
      <div className="cms-panel-title"><h2>Textes du site</h2><span className="cms-language-hint">FR + EN</span></div><p className="cms-editor-help">Laissez un champ vide pour conserver le texte original.</p>
      <div className="cms-copy-list">{editableTexts.map((item) => <fieldset className="cms-copy-field" key={item.key}><legend>{item.label}</legend><div className="cms-copy-languages">{(["fr", "en"] as const).map((language) => <label key={language}><span>{language === "fr" ? "Français" : "English"}</span>{item.multiline ? <textarea value={texts[`${item.key}_${language}`] || ""} placeholder={language === "fr" ? item.french : item.english} onChange={(event) => setTexts((current) => ({ ...current, [`${item.key}_${language}`]: event.target.value }))} /> : <input value={texts[`${item.key}_${language}`] || ""} placeholder={language === "fr" ? item.french : item.english} onChange={(event) => setTexts((current) => ({ ...current, [`${item.key}_${language}`]: event.target.value }))} />}</label>)}</div></fieldset>)}</div>
    </section>
    {versions.length > 0 && <section className="cms-panel"><div className="cms-panel-title"><h2>Versions précédentes · {markets[market].label}</h2></div>{versions.slice(0, 6).map((version) => <div className="cms-list-item" key={String(version.id)}><span>{new Date(String(version.created_at)).toLocaleString("fr-CA")}</span><button type="button" className="cms-inline" onClick={() => restoreVersion(version)}>Restaurer cette version</button></div>)}</section>}
    <div className="cms-editor-footer"><a href={`/?region=${market}`} target="_blank" rel="noreferrer">Aperçu de la boutique {markets[market].label} ↗</a><button className="cms-primary" disabled={busy}>Enregistrer toutes les modifications</button></div>
  </form>;
}
