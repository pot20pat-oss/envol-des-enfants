"use client";

import type { CSSProperties } from "react";
import { type Market } from "@/lib/markets";

type Say = (french: string, english: string) => string;
type Editable = (key: string, french: string, english: string) => string;
type SectionStyle = (id: string) => CSSProperties;

type Props = {
  market: Market;
  storePhone: string;
  whatsappNumber: string;
  whatsappUrl: string;
  facebookUrl: string;
  say: Say;
  editable: Editable;
  sectionStyle: SectionStyle;
};

export default function StorefrontHero({ market, say, editable, sectionStyle }: Props) {
  const heroStyle = { ...sectionStyle("hero"), display: "block" };
  return (
    <>
      <section className="hero wrap" id="accueil" style={heroStyle}>
        <div className="hero-visual" style={{ width: "100%", position: "relative" }}>
          <img
            src={market === "qc" ? "/hero-quebec-2026.png" : "/boutique-hero.png"}
            alt={market === "qc" ? say("Sélection de jouets Envol des Enfants au Québec", "Envol des Enfants toy selection in Quebec") : say("Boutique Envol des Enfants à Conakry", "Envol des Enfants store in Conakry")}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      </section>

      <section className="section wrap center-heading" style={{ order: 2, textAlign: "center" }}>
        <p className="eyebrow">{say("Envol des Enfants", "Envol des Enfants")}</p>
        <h2>{editable("hero_title", "Des jouets choisis pour", "Toys chosen to")} <em>{editable("hero_accent", "grandir, découvrir et rêver.", "grow, discover and dream.")}</em></h2>
        <p>{editable("hero_description", "Une sélection pensée avec soin pour accompagner les découvertes, les jeux et les petits bonheurs de l’enfance.", "A carefully chosen selection for childhood discoveries, play and little everyday joys.")}</p>
        <a className="button button-dark" href={`/catalogue?region=${market}`}>{say("Découvrir le catalogue", "Browse the catalog")} <span aria-hidden="true">→</span></a>
      </section>
    </>
  );
}
