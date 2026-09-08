"use client";

import { useEffect, useState } from "react";
import type { StoreLanguage } from "./use-store-language";
import type { Market } from "@/lib/markets";

type Say = (french: string, english: string) => string;

export function useStorefrontPromo({
  language,
  market,
  whatsappNumber,
  whatsappUrl,
  say,
}: {
  language: StoreLanguage;
  market: Market;
  whatsappNumber: string;
  whatsappUrl: string;
  say: Say;
}) {
  const [promoOpen, setPromoOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [requested, setRequested] = useState(false);
  const [consent, setConsent] = useState(false);

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

  function openPromo() {
    setPromoOpen(true);
  }

  function closePromo() {
    setPromoOpen(false);
    window.sessionStorage.setItem("envol-promo-dismissed", "yes");
  }

  async function requestDiscount() {
    if (!consent) return;
    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, language, region: market, consent: true }),
    }).catch(() => {});

    const message = language === "en"
      ? `Hello Envol des Enfants! I would like to subscribe with ${email} and receive the 10% welcome discount on my first order.`
      : `Bonjour Envol des Enfants! Je souhaite m’abonner avec ${email} et profiter de l’offre de bienvenue de 10 % sur ma première commande.`;

    if (whatsappNumber) {
      window.open(`${whatsappUrl}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
    setRequested(true);
  }

  return {
    promoOpen,
    email,
    requested,
    consent,
    openPromo,
    closePromo,
    setEmail,
    setConsent,
    requestDiscount,
    say,
  };
}
