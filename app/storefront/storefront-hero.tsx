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

const SLIDE_DELAY = 6000;

export default function StorefrontHero({ market, say, sectionStyle }: Props) {
  const heroStyle: CSSProperties = {
    ...sectionStyle("hero"),
    display: "block",
    minHeight: 0,
    height: "auto",
    padding: 0,
    aspectRatio: "auto",
  };

  const slides = [
    {
      image: "/hero-slider/01-intro.webp",
      title: say("Grandir, découvrir", "Grow, discover"),
      accent: say("et rêver.", "and dream."),
      description: say("Des jouets choisis avec soin pour les petits bonheurs de l’enfance.", "Thoughtfully chosen toys for childhood’s little joys."),
      alt: say("Grandir, découvrir et rêver avec Envol des Enfants", "Grow, discover and dream with Envol des Enfants"),
      href: `/catalogue?region=${market}`,
      label: say("Découvrir la boutique", "Discover the shop"),
      tone: "coral",
    },
    {
      image: "/hero-slider/02-engineering.webp",
      title: say("Imaginer, construire,", "Imagine, build,"),
      accent: say("réussir.", "achieve."),
      description: say("Des défis d’ingénierie et de stratégie conçus pour stimuler la créativité.", "Engineering and strategy challenges designed to spark creativity."),
      alt: say("Imaginer, construire et réussir avec des jeux d’ingénierie", "Imagine, build and achieve with engineering toys"),
      href: `/catalogue?region=${market}&categorie=robots`,
      label: say("Découvrir les jeux d’ingénierie", "Discover engineering toys"),
      tone: "blue",
    },
    {
      image: "/hero-slider/03-new-arrivals.webp",
      title: say("De nouvelles idées", "New ways"),
      accent: say("pour jouer.", "to play."),
      description: say("Découvrez nos dernières trouvailles, réunies dans une sélection ludique et inspirante.", "Discover our latest finds, brought together in a playful and inspiring collection."),
      alt: say("De nouvelles idées pour jouer", "New ways to play"),
      href: `/catalogue?region=${market}&categorie=new`,
      label: say("Voir les nouveautés", "See what's new"),
      tone: "blue",
    },
    {
      image: "/hero-slider/04-early-learning.webp",
      title: say("Apprendre, créer,", "Learn, create,"),
      accent: say("grandir.", "grow."),
      description: say("Des jeux d’éveil pour explorer, manipuler et s’émerveiller.", "Early-learning toys to explore, discover and delight."),
      alt: say("Apprendre, créer et grandir avec les jeux d’éveil", "Learn, create and grow with early-learning toys"),
      href: `/catalogue?region=${market}&categorie=eveil`,
      label: say("Voir les jeux d’éveil", "Explore early-learning toys"),
      tone: "blue",
    },
    {
      image: "/hero-slider/05-dolls.webp",
      title: say("Un monde de poupées", "A world of dolls"),
      accent: say("et de princesses.", "and princesses."),
      description: say("Des histoires à inventer, des personnages à aimer et des rêves qui grandissent.", "Stories to imagine, characters to love and dreams to inspire."),
      alt: say("Poupées, princesses et histoires à inventer", "Dolls, princesses and stories to imagine"),
      href: `/catalogue?region=${market}&categorie=poupees`,
      label: say("Voir les poupées", "See the dolls"),
      tone: "coral",
    },
    {
      image: "/hero-slider/06-imagine.webp",
      title: say("Jouer aujourd’hui,", "Play today,"),
      accent: say("imaginer demain.", "imagine tomorrow."),
      description: say("Des jeux qui éveillent la curiosité, stimulent l’imagination et donnent envie d’apprendre.", "Toys that spark curiosity, inspire imagination and make learning fun."),
      alt: say("Jouer aujourd’hui et imaginer demain", "Play today and imagine tomorrow"),
      href: `/catalogue?region=${market}&categorie=eveil`,
      label: say("Explorer les jeux", "Explore toys"),
      tone: "green",
    },
    {
      image: "/hero-slider/07-catalogue.webp",
      title: say("L’aventure", "The adventure"),
      accent: say("commence ici.", "starts here."),
      description: say("Des jouets pour découvrir, apprendre et s’épanouir.", "Toys to discover, learn and grow."),
      alt: say("L’aventure commence ici", "The adventure starts here"),
      href: `/catalogue?region=${market}`,
      label: say("Parcourir le catalogue", "Browse the catalogue"),
      tone: "blue",
    },
  ];

  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, SLIDE_DELAY);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const previous = () => setActive((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setActive((current) => (current + 1) % slides.length);

  return (
    <section
      className="hero-story wrap"
      id="accueil"
      style={heroStyle}
    >
      <div className="hero-story-stage">
        {slides.map((slide, index) => (
          <a
            key={slide.image}
            className={`hero-story-slide${index === active ? " is-active" : ""}`}
            href={slide.href}
            aria-label={slide.label}
            aria-hidden={index !== active}
            tabIndex={index === active ? 0 : -1}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              draggable={false}
              onError={(event) => {
                if (!event.currentTarget.src.endsWith("/hero-slider/01-intro.webp")) {
                  event.currentTarget.src = "/hero-slider/01-intro.webp";
                }
              }}
            />
            <div className={`hero-story-copy hero-story-copy-${slide.tone}`}>
              <h2>{slide.title}<br /><span>{slide.accent}</span></h2>
              <p>{slide.description}</p>
              <span className="hero-story-cta">{slide.label}<b aria-hidden="true">→</b></span>
            </div>
          </a>
        ))}

        <button type="button" className="hero-story-nav hero-story-nav-left" onClick={previous} aria-label={say("Image précédente", "Previous slide")}>‹</button>
        <button type="button" className="hero-story-nav hero-story-nav-right" onClick={next} aria-label={say("Image suivante", "Next slide")}>›</button>

        <div className="hero-story-dots" aria-label={say("Choisir une présentation", "Choose a slide")}>
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              className={index === active ? "is-active" : ""}
              onClick={() => setActive(index)}
              aria-label={`${say("Présentation", "Slide")} ${index + 1}`}
              aria-current={index === active ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
