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
  const fallbackSlides: Record<string, string> = {
    costume: "/hero-client/01-costume.webp",
    creativite: "/hero-client/02-jouets.webp",
    "nouveau-ne": "/hero-client/05-nouveau-ne.webp",
    bebe: "/hero-client/06-bebe.webp",
  };
  const slide = slides[active];
  useEffect(() => {
    let interval: number | undefined;
    const firstTransition = window.setTimeout(() => {
      setActive((current) => (current + 1) % slides.length);
      interval = window.setInterval(() => {
        setActive((current) => (current + 1) % slides.length);
      }, 5000);
    }, 20000);
    return () => {
      window.clearTimeout(firstTransition);
      if (interval !== undefined) window.clearInterval(interval);
    };
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
          src={`/_vinext/image?url=${encodeURIComponent(`/hero-client/${slide.name}-${say("fr", "en")}.webp`)}&w=1200&q=78`}
          width={1916}
          height={821}
          alt={slide.alt}
          loading={active === 0 ? "eager" : "lazy"}
          fetchPriority={active === 0 ? "high" : "auto"}
          draggable={false}
          onError={(event) => {
            const fallback = fallbackSlides[slide.name] ? `/_vinext/image?url=${encodeURIComponent(fallbackSlides[slide.name])}&w=1200&q=78` : "";
            if (fallback && event.currentTarget.src !== new URL(fallback, window.location.href).href) {
              event.currentTarget.src = fallback;
            }
          }}
        />
      </a>
    </section>
  );
}
