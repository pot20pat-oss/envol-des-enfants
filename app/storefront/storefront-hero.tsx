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
      image: "/hero-client/01-costume.webp",
      title: say("L’imagination", "Imagination"),
      accent: say("prend son envol.", "takes flight."),
      description: say("Des jeux pour inventer, créer et devenir le héros de chaque aventure.", "Toys to imagine, create and become the hero of every adventure."),
      alt: say("Enfant déguisé en héros", "Child dressed as a hero"),
      href: `/catalogue?region=${market}`,
      label: say("Découvrir les jeux", "Discover the toys"),
      tone: "coral",
    },
    {
      image: "/hero-client/02-jouets.webp",
      title: say("Un monde", "A world"),
      accent: say("à découvrir.", "to discover."),
      description: say("Une sélection de jouets qui nourrit la curiosité et le plaisir de jouer.", "A selection of toys that sparks curiosity and the joy of play."),
      alt: say("Enfant entouré de jouets", "Child surrounded by toys"),
      href: `/catalogue?region=${market}`,
      label: say("Voir la sélection", "See the selection"),
      tone: "blue",
    },
    {
      image: "/hero-client/03-complicite.webp",
      title: say("Jouer, rire,", "Play, laugh,"),
      accent: say("grandir ensemble.", "grow together."),
      description: say("Des moments de complicité qui deviennent de précieux souvenirs.", "Shared moments that become precious memories."),
      alt: say("Deux enfants partageant un moment de complicité", "Two children sharing a joyful moment"),
      href: `/catalogue?region=${market}`,
      label: say("Explorer la boutique", "Explore the shop"),
      tone: "blue",
    },
    {
      image: "/hero-client/04-sourires.webp",
      title: say("Des sourires", "Smiles"),
      accent: say("à partager.", "to share."),
      description: say("Parce que les plus beaux jeux sont ceux que l’on partage.", "Because the best playtimes are the ones we share."),
      alt: say("Deux enfants souriants", "Two smiling children"),
      href: `/catalogue?region=${market}`,
      label: say("Découvrir la boutique", "Discover the shop"),
      tone: "coral",
    },
    {
      image: "/hero-client/05-nouveau-ne.webp",
      title: say("Les premiers", "The first"),
      accent: say("émerveillements.", "moments of wonder."),
      description: say("Des jouets doux et rassurants pour accompagner les tout premiers instants.", "Soft, comforting toys for life's very first moments."),
      alt: say("Nouveau-né paisiblement emmailloté", "Peacefully swaddled newborn"),
      href: `/catalogue?region=${market}&categorie=eveil`,
      label: say("Voir les jeux d’éveil", "Explore early-learning toys"),
      tone: "green",
    },
    {
      image: "/hero-client/06-bebe.webp",
      title: say("Grandir entouré", "Growing up"),
      accent: say("de douceur.", "surrounded by care."),
      description: say("Une sélection pensée pour éveiller bébé avec tendresse et simplicité.", "A thoughtful selection to gently awaken baby's curiosity."),
      alt: say("Bébé allongé et souriant", "Smiling baby lying down"),
      href: `/catalogue?region=${market}&categorie=eveil`,
      label: say("Découvrir l’univers bébé", "Discover the baby collection"),
      tone: "green",
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
          <div
            key={slide.image}
            className={`hero-story-slide${index === active ? " is-active" : ""}`}
            aria-hidden={index !== active}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              draggable={false}
              onError={(event) => {
                if (!event.currentTarget.src.endsWith("/hero-client/01-costume.webp")) {
                  event.currentTarget.src = "/hero-client/01-costume.webp";
                }
              }}
            />
            <div className={`hero-story-copy hero-story-copy-${slide.tone}`}>
              <h2>{slide.title}<br /><span>{slide.accent}</span></h2>
              <p>{slide.description}</p>
              <a className="hero-story-cta" href={slide.href}>{slide.label}<b aria-hidden="true">→</b></a>
            </div>
          </div>
        ))}

        <button type="button" className="hero-story-nav hero-story-nav-left" onClick={previous} aria-label={say("Image précédente", "Previous slide")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button type="button" className="hero-story-nav hero-story-nav-right" onClick={next} aria-label={say("Image suivante", "Next slide")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>

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
