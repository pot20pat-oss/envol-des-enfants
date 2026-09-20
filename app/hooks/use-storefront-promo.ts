"use client";

import { useEffect, useState } from "react";
import type { StoreLanguage } from "./use-store-language";
import type { Market } from "@/lib/markets";

type Say = (french: string, english: string) => string;

export function useStorefrontPromo({ language, market, whatsappNumber, whatsappUrl, welcomeDiscount, say }: {
  language: StoreLanguage;
  market: Market;
  whatsappNumber: string;
  whatsappUrl: string;
  welcomeDiscount: number;
  say: Say;
}) {
  const [promoOpen, setPromoOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem("envol-promo-dismissed") === "yes") return;
    const timer = window.setTimeout(() => setPromoOpen(true), 1250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!promoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePromo();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [promoOpen]);

  function openPromo() { setPromoOpen(true); }
  function closePromo() {
    setPromoOpen(false);
    window.sessionStorage.setItem("envol-promo-dismissed", "yes");
  }

  async function requestDiscount() {
    if (!consent || !email.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), language, region: market, consent: true }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || say("Inscription impossible.", "Unable to subscribe."));
      const message = language === "en"
        ? `Hello Envol des Enfants! I would like to subscribe with ${email} and receive the ${welcomeDiscount}% welcome discount on my first order.`
        : `Bonjour Envol des Enfants! Je souhaite m’abonner avec ${email} et profiter de l’offre de bienvenue de ${welcomeDiscount} % sur ma première commande.`;
      if (whatsappNumber) {
        window.location.href = `${whatsappUrl}?text=${encodeURIComponent(message)}`;
        return;
      }
      setRequested(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : say("Inscription impossible.", "Unable to subscribe."));
    } finally {
      setSubmitting(false);
    }
  }

  return { promoOpen, email, requested, consent, error, submitting, openPromo, closePromo, setEmail, setConsent, requestDiscount, say };
}
