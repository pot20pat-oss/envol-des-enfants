"use client";

import type { FormEvent } from "react";

type Say = (french: string, english: string) => string;

type Props = {
  open: boolean;
  email: string;
  requested: boolean;
  consent: boolean;
  discount: number;
  say: Say;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  onSubmit: () => Promise<void>;
};

export default function StorefrontPromo({ open, email, requested, consent, discount, say, onClose, onEmailChange, onConsentChange, onSubmit }: Props) {
  if (!open) return null;
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit();
  }
  return (
    <div className="promo-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="promo-modal" role="dialog" aria-modal="true" aria-labelledby="promo-title">
        <button className="promo-close" aria-label={say("Fermer la fenêtre promotionnelle", "Close promotional offer")} onClick={onClose}>×</button>
        <div className="promo-photo"><img src="/boutique-hero.png" alt={say("L’intérieur coloré de la boutique Envol des Enfants", "Inside the colourful Envol des Enfants store")} /><span>{say("Du bonheur à découvrir.", "Happiness around every corner.")}</span></div>
        <div className="promo-content">
          <span className="promo-logo brand-picture"><img src="/envol-reference.png" alt="Envol des Enfants" /></span>
          <p className="eyebrow">{say("Un cadeau de bienvenue", "A little welcome gift")}</p>
          <h2 id="promo-title"><span>{discount} %</span><br />{say("de rabais", "off")}</h2>
          <p className="promo-intro">{say("Abonnez-vous et profitez de", "Subscribe and enjoy")} <strong>{say(`${discount} % de rabais sur votre première commande.`, `${discount}% off your first order.`)}</strong></p>
          {requested ? <div className="promo-success"><strong>{say("Votre demande est prête!", "Your request is ready!")}</strong><p>{say("Finalisez votre inscription dans la conversation WhatsApp qui vient de s’ouvrir.", "Complete your subscription in the WhatsApp conversation that just opened.")}</p><button onClick={onClose}>{say("Continuer ma visite", "Continue browsing")} →</button></div> : <form onSubmit={handleSubmit}><label htmlFor="promo-email">{say("Votre adresse courriel", "Your email address")}</label><input id="promo-email" type="email" autoComplete="email" placeholder={say("vous@exemple.com", "you@example.com")} value={email} onChange={(event) => onEmailChange(event.target.value)} required /><label style={{display:"flex",alignItems:"flex-start",gap:"8px",fontSize:"11px",lineHeight:"1.5",margin:"10px 0"}}><input type="checkbox" style={{width:"auto",marginTop:"3px"}} checked={consent} onChange={(event) => onConsentChange(event.target.checked)} required />{say("J’accepte de recevoir des nouvelles et des offres d’Envol des Enfants.", "I agree to receive news and offers from Envol des Enfants.")}</label><button className="promo-submit" type="submit">{say(`Recevoir mon ${discount} %`, `Get my ${discount}% discount`)} →</button><small>{say("Offre réservée aux nouveaux abonnés. Demande confirmée sur WhatsApp.", "Offer available to new subscribers. Request confirmed through WhatsApp.")}</small></form>}
        </div>
      </section>
    </div>
  );
}
