"use client";

import { type CSSProperties } from "react";
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

export default function StorefrontHero({ market, say, sectionStyle }: Props) {
  const heroStyle: CSSProperties = {
    ...sectionStyle("hero"),
    display: "block",
    minHeight: 0,
    height: "auto",
    padding: 0,
    aspectRatio: "auto",
  };

  return (
    <section className="hero-story hero-reference wrap" id="accueil" style={heroStyle}>
      <a className="hero-reference-link" href={`/catalogue?region=${market}`} aria-label={say("Découvrir nos produits", "Discover our products")}>
        <img
          src="/hero-client/03-complicite.webp"
          alt={say("Aimer, Jouer, Grandir — des jeux et des découvertes pour accompagner chaque enfant dans son envol.", "Love, Play, Grow")}
          loading="eager"
          fetchPriority="high"
          draggable={false}
        />
      </a>
    </section>
  );
}
