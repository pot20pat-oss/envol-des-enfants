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
      <section className="promo-modal promo-modal-new" role="dialog" aria-modal="true" aria-labelledby="promo-title">
        <button className="promo-close" aria-label={say("Fermer la fenêtre promotionnelle", "Close promotional offer")} onClick={onClose}>×</button>

        <div className="promo-offer-panel" aria-hidden="true">
          <img className="promo-child-photo" src="/promo-child-light.webp" alt="" />
          <span className="promo-confetti promo-confetti-star">★</span>
          <span className="promo-confetti promo-confetti-yellow">◆</span>
          <span className="promo-confetti promo-confetti-green">◆</span>
          <div className="promo-badge">
            <strong>{discount}%</strong>
            <span>{say("de rabais", "off")}</span>
            <small>{say("sur votre première commande", "on your first order")}</small>
          </div>
        </div>

        <div className="promo-content promo-content-new">
          <p id="promo-title" className="promo-intro-new">
            {say("Abonnez-vous à notre infolettre et profitez de", "Subscribe to our newsletter and enjoy")} <strong>{say(`${discount}% de rabais sur votre première commande !`, `${discount}% off your first order!`)}</strong>
          </p>

          {requested ? (
            <div className="promo-success">
              <strong>{say("Votre demande est prête!", "Your request is ready!")}</strong>
              <p>{say("Finalisez votre inscription dans la conversation WhatsApp qui vient de s’ouvrir.", "Complete your subscription in the WhatsApp conversation that just opened.")}</p>
              <button onClick={onClose}>{say("Continuer ma visite", "Continue browsing")} →</button>
            </div>
          ) : (
            <form className="promo-form-new" onSubmit={handleSubmit}>
              <div className="promo-form-row">
                <input
                  id="promo-email"
                  type="email"
                  autoComplete="email"
                  aria-label={say("Votre adresse courriel", "Your email address")}
                  placeholder={say("Votre adresse courriel", "Your email address")}
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  required
                />
                <button className="promo-submit promo-submit-new" type="submit">{say("Je m’abonne", "Subscribe")}</button>
              </div>

              <label className="promo-consent">
                <input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} required />
                <span>{say("J’accepte de recevoir des nouvelles et des offres d’Envol des Enfants.", "I agree to receive news and offers from Envol des Enfants.")}</span>
              </label>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
