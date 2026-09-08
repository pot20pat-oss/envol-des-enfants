"use client";

import type { CSSProperties } from "react";
import { markets, type Market } from "@/lib/markets";
import { PhoneIcon, WhatsAppIcon } from "./product-icons";

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

export default function StorefrontHero({ market, storePhone, whatsappNumber, whatsappUrl, facebookUrl, say, editable, sectionStyle }: Props) {
  return (
    <>
      <section className="hero wrap" id="accueil" style={sectionStyle("hero")}>
        <div className="hero-copy">
          <p className="eyebrow"><span></span> {editable("hero_eyebrow", `Boutique de jouets éducatifs · ${markets[market].label}`, `Educational toy shop · ${markets[market].label}`)}</p>
          <h1>{editable("hero_title", "Le jeu qui fait", "Play that helps")}<br /><span>{editable("hero_accent", "grandir vos enfants.", "your children grow.")}</span></h1>
          <p className="hero-text">{editable("hero_description", "Jouets, articles pour bébé, vélos et fournitures scolaires choisis pour éveiller leur curiosité.", "Toys, baby essentials, bicycles and school supplies chosen to spark their curiosity.")}</p>
          <div className="hero-buttons">
            {storePhone && <a className="button hero-call" href={`tel:${storePhone.replace(/\s/g, "")}`}><PhoneIcon />{say("Nous appeler", "Call us")}</a>}
            {whatsappNumber && <a className="button button-dark hero-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer"><WhatsAppIcon />{say("Commander sur WhatsApp", "Order on WhatsApp")}</a>}
          </div>
          <p className="tiny-note">{say("Livraison et paiement à la réception.", "Delivery available. Pay upon arrival.")}</p>
        </div>
        <div className="hero-visual">
          <img
            src={market === "qc" ? "/boutique-hero-quebec.png" : "/boutique-hero.png"}
            alt={market === "qc" ? say("Boutique québécoise en ligne et sélection de jouets éducatifs", "Quebec online shop and selection of educational toys") : say("Vue panoramique de la boutique Envol des Enfants avec ses vélos, véhicules et rayons de jouets", "Panoramic view of the Envol des Enfants store, bicycles, vehicles and toy displays")}
          />
          <div className="floating-note"><span>★</span><div><strong>{market === "qc" ? say("Bienvenue au Québec", "Welcome to Québec") : say("Bienvenue à Dixinn", "Welcome to Dixinn")}</strong><small>{say("Un univers fait pour jouer.", "A world made for play.")}</small></div></div>
        </div>
      </section>

      <div className="service-ribbon wrap" style={sectionStyle("ribbon")}>
        <span>{say("Jouets éducatifs", "Educational toys")}</span>
        <span>{say("Livraison chez vous", "Delivered to you")}</span>
        <span>{say("Paiement à la réception", "Pay on delivery")}</span>
        <a href={facebookUrl} target="_blank" rel="noreferrer">{say("Suivez-nous sur Facebook", "Follow us on Facebook")} ↗</a>
      </div>
    </>
  );
}
