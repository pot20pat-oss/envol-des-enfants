"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
  const [active, setActive] = useState(0);
  const slides = [
    { name: "costume", alt: say("Son univers. Ses règles. Son aventure.", "His world. His rules. His adventure.") },
    { name: "creativite", alt: say("Une idée. Un sourire. Tout un monde !", "One idea. One smile. A world of wonder!") },
    { name: "nouveau-ne", alt: say("Tout petit. Déjà tout un monde.", "So little. A whole world of wonder.") },
    { name: "bebe", alt: say("Petits gestes. Grandes découvertes.", "Little moves. Big discoveries.") },
  ];
  const slide = slides[active];
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);
  const heroStyle: CSSProperties = {
    ...sectionStyle("hero"),
    display: "block",
    minHeight: 0,
    height: "auto",
    padding: 0,
    aspectRatio: "auto",
  };

  return (
    <section className="hero-story hero-reference wrap" id="accueil" style={heroStyle} aria-roledescription={say("carrousel", "carousel")} aria-label={say("À découvrir", "Discover")}>
      <a className="hero-reference-link" href={`/catalogue?region=${market}`} aria-label={say("Découvrir nos produits", "Discover our products")}>
        <img
          src={`/hero-client/${slide.name}-${say("fr", "en")}.webp`}
          width={1916}
          height={821}
          alt={slide.alt}
          loading="eager"
          fetchPriority="high"
          draggable={false}
        />
      </a>
    </section>
  );
}
