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
      image: "/hero-story-intro.jpg",
      alt: say("Grandir, découvrir et rêver avec Envol des Enfants", "Grow, discover and dream with Envol des Enfants"),
      href: `/catalogue?region=${market}`,
      label: say("Découvrir le catalogue", "Browse the catalog"),
    },
    {
      image: "/hero-story-poupees.jpg",
      alt: say("Poupées, princesses et histoires à inventer", "Dolls, princesses and stories to imagine"),
      href: `/catalogue?region=${market}&categorie=poupees`,
      label: say("Voir les poupées", "See the dolls"),
    },
    {
      image: "/hero-story-apprendre.jpg",
      alt: say("Curieux aujourd’hui, grands demain", "Curious today, growing tomorrow"),
      href: `/catalogue?region=${market}&categorie=eveil`,
      label: say("Explorer les jeux", "Explore toys"),
    },
    {
      image: "/hero-story-nouveautes.jpg",
      alt: say("De nouvelles idées pour jouer", "Fresh ideas for play"),
      href: `/catalogue?region=${market}&categorie=new`,
      label: say("Voir les nouveautés", "See what's new"),
    },
  ];

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || paused) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 12000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const previous = () => setActive((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setActive((current) => (current + 1) % slides.length);

  return (
    <section
      className="hero hero-story wrap"
      id="accueil"
      style={heroStyle}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-story-stage">
        {slides.map((slide, index) => (
          <img
            key={slide.image}
            className={`hero-story-image${index === active ? " is-active" : ""}`}
            src={slide.image}
            alt={index === active ? slide.alt : ""}
            aria-hidden={index !== active}
            onError={(event) => {
              event.currentTarget.src = market === "qc" ? "/hero-quebec-2026.png" : "/boutique-hero.png";
            }}
          />
        ))}

        <a
          className="hero-story-cta-hitbox"
          href={slides[active].href}
          aria-label={slides[active].label}
          title={slides[active].label}
        />

        <button type="button" className="hero-story-nav hero-story-nav-left" onClick={previous} aria-label={say("Image précédente", "Previous slide")} />
        <button type="button" className="hero-story-nav hero-story-nav-right" onClick={next} aria-label={say("Image suivante", "Next slide")} />
      </div>

      <div className="hero-story-pagination" aria-label={say("Choisir une présentation", "Choose a slide")}>
        {slides.map((slide, index) => (
          <button
            key={slide.image}
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
