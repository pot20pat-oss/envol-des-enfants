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

      <section className="section wrap center-heading" style={{ order: 2, textAlign: "center", paddingTop: "38px", paddingBottom: "38px" }}>
        <p className="eyebrow">{say("Bienvenue chez Envol des Enfants", "Welcome to Envol des Enfants")}</p>
        <h2>{editable("hero_title", "Des jouets choisis pour", "Toys chosen to")} <em>{editable("hero_accent", "grandir, découvrir et s’amuser.", "grow, discover and have fun.")}</em></h2>
        <p style={{ maxWidth: "760px", margin: "16px auto 24px" }}>{editable("hero_description", "Découvrez nos jouets, poupées et princesses, articles pour bébé, véhicules, jeux de plein air et essentiels scolaires, réunis dans un catalogue simple à parcourir.", "Discover our toys, dolls and princesses, baby items, vehicles, outdoor play and school essentials in one easy-to-browse catalog.")}</p>
        <a className="button button-dark" href={`/catalogue?region=${market}`} style={{ display: "inline-flex", width: "auto", minWidth: "220px", justifyContent: "center" }}>{say("Découvrir le catalogue", "Browse the catalog")} →</a>
      </section>
    </>
  );
}
