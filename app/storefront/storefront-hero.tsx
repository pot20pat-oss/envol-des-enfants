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
  const heroStyle = { ...sectionStyle("hero"), display: "block" };
  const slides = [
    {
      image: "/hero-envol-intro.webp",
      alt: say("Grandir, découvrir et rêver avec Envol des Enfants", "Grow, discover and dream with Envol des Enfants"),
      href: `/catalogue?region=${market}`,
      label: say("Découvrir le catalogue", "Browse the catalog"),
    },
    {
      image: "/hero-envol-poupees.webp",
      alt: say("Poupées, princesses et histoires à inventer", "Dolls, princesses and stories to imagine"),
      href: `/catalogue?region=${market}&categorie=poupees`,
      label: say("Voir les poupées", "See the dolls"),
    },
    {
      image: "/hero-envol-apprendre.webp",
      alt: say("Curieux aujourd’hui, grands demain", "Curious today, growing tomorrow"),
      href: `/catalogue?region=${market}&categorie=eveil`,
      label: say("Explorer les jeux", "Explore toys"),
    },
    {
      image: "/hero-envol-nouveautes.webp",
      alt: say("De nouvelles idées pour jouer", "Fresh ideas for play"),
      href: `/catalogue?region=${market}&categorie=new`,
      label: say("Voir les nouveautés", "See what's new"),
    },
  ];

  const [active, setActive] = useState(0);
  const slide = slides[active];

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5600);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="hero hero-editorial wrap" id="accueil" style={heroStyle}>
      <img className="hero-story-image" src={slide.image} alt={slide.alt} key={slide.image} />
      <a className="hero-story-cta" href={slide.href} aria-label={slide.label} title={slide.label} />

      <button
        type="button"
        className="hero-story-arrow hero-story-arrow-left"
        onClick={() => setActive((current) => (current - 1 + slides.length) % slides.length)}
        aria-label={say("Image précédente", "Previous slide")}
      >
        ‹
      </button>
      <button
        type="button"
        className="hero-story-arrow hero-story-arrow-right"
        onClick={() => setActive((current) => (current + 1) % slides.length)}
        aria-label={say("Image suivante", "Next slide")}
      >
        ›
      </button>

      <div className="hero-editorial-dots" aria-label={say("Choisir une présentation", "Choose a slide")}>
        {slides.map((item, index) => (
          <button
            key={item.image}
            type="button"
            className={index === active ? "is-active" : ""}
            onClick={() => setActive(index)}
            aria-label={`${say("Présentation", "Slide")} ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
