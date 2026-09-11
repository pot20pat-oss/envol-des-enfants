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

export default function StorefrontHero({ market, say, editable, sectionStyle }: Props) {
  const heroStyle = { ...sectionStyle("hero"), display: "block" };
  const slides = [
    {
      eyebrow: say("L’univers Envol", "The Envol world"),
      title: say("Grandir, découvrir", "Grow, discover"),
      accent: say("et rêver.", "and dream."),
      text: say("Des jouets choisis avec soin pour les petits bonheurs de l’enfance.", "Carefully chosen toys for childhood's little joys."),
      href: `/catalogue?region=${market}`,
      cta: say("Découvrir le catalogue", "Browse the catalog"),
    },
    {
      eyebrow: say("Mon monde de poupées", "My doll world"),
      title: say("Poupées, princesses", "Dolls, princesses"),
      accent: say("et histoires à inventer.", "and stories to imagine."),
      text: say("Des univers à aimer, collectionner et faire vivre jour après jour.", "Worlds to love, collect and bring to life every day."),
      href: `/catalogue?region=${market}&categorie=poupees`,
      cta: say("Voir les poupées", "See the dolls"),
    },
    {
      eyebrow: say("Apprendre en jouant", "Learning through play"),
      title: say("Curieux aujourd’hui,", "Curious today,"),
      accent: say("grands demain.", "growing tomorrow."),
      text: say("Jeux d’éveil, d’imagination et de découverte pour apprendre naturellement.", "Discovery and imaginative play for learning naturally."),
      href: `/catalogue?region=${market}&categorie=eveil`,
      cta: say("Explorer les jeux", "Explore toys"),
    },
    {
      eyebrow: say("Nos nouveautés", "New arrivals"),
      title: say("De nouvelles idées", "Fresh ideas"),
      accent: say("pour jouer.", "for play."),
      text: say("Les dernières trouvailles de la boutique, réunies dans une sélection légère et inspirante.", "Our latest finds, gathered in a light and inspiring selection."),
      href: `/catalogue?region=${market}&categorie=new`,
      cta: say("Voir les nouveautés", "See what's new"),
    },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 5600);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <>
      <section className="hero hero-editorial wrap" id="accueil" style={heroStyle}>
        <div className="hero-editorial-media">
          <img
            src={market === "qc" ? "/hero-quebec-2026.png" : "/boutique-hero.png"}
            alt={market === "qc" ? say("Sélection Envol des Enfants au Québec", "Envol des Enfants selection in Quebec") : say("Boutique Envol des Enfants à Conakry", "Envol des Enfants store in Conakry")}
          />
        </div>
        <div className="hero-editorial-copy" aria-live="polite">
          {slides.map((slide, index) => (
            <div className={`hero-editorial-slide${index === active ? " is-active" : ""}`} aria-hidden={index !== active} key={slide.eyebrow}>
              <p className="hero-editorial-eyebrow">{slide.eyebrow}</p>
              <h1>{slide.title} <em>{slide.accent}</em></h1>
              <p className="hero-editorial-text">{slide.text}</p>
              <a className="hero-editorial-cta" href={slide.href}>{slide.cta} <span aria-hidden="true">→</span></a>
            </div>
          ))}
          <div className="hero-editorial-dots" aria-label={say("Choisir une présentation", "Choose a slide")}>
            {slides.map((slide, index) => (
              <button key={slide.eyebrow} type="button" className={index === active ? "is-active" : ""} onClick={() => setActive(index)} aria-label={`${say("Présentation", "Slide")} ${index + 1}`} />
            ))}
          </div>
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
