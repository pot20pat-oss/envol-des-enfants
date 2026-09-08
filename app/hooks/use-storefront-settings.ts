"use client";

import { useEffect, type CSSProperties } from "react";
import { readSiteSections, readSiteTexts } from "@/lib/site-editor";
import type { Market } from "@/lib/markets";
import type { StoreLanguage } from "./use-store-language";

export function useStorefrontSettings(
  storeSettings: Record<string, string>,
  market: Market,
  language: StoreLanguage,
  promoOpen: boolean,
) {
  const siteSections = readSiteSections(storeSettings.site_sections);
  const siteTexts = readSiteTexts(storeSettings.site_texts);
  const storePhone = storeSettings.phone || (market === "conakry" ? "+224 666 54 79 76" : "");
  const whatsappNumber = (storeSettings.whatsapp || (market === "conakry" ? "224666547976" : "")).replace(/[^\d]/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#contact";
  const facebookUrl = storeSettings.facebook || (market === "conakry" ? "https://www.facebook.com/rachetteboutique/" : "#contact");
  const address = storeSettings.address || (market === "conakry" ? "Immeuble Famille Diallo, Cameroun, Dixinn, Conakry, Guinée" : "Québec, Canada");
  const mapsUrl = storeSettings.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=${market === "qc" && !storeSettings.address ? "6" : "13"}&ie=UTF8&iwloc=&output=embed`;
  const isEnglish = language === "en";
  const say = (french: string, english: string) => isEnglish ? english : french;
  const editable = (key: string, french: string, english: string) => siteTexts[`${key}_${language}`]?.trim() || say(french, english);
  const sectionStyle = (id: string): CSSProperties => {
    const index = siteSections.findIndex((section) => section.id === id);
    const section = siteSections[index];
    return { order: index < 0 ? 500 : index + 10, ...(section && !section.visible ? { display: "none" } : {}) };
  };
  const sectionVisible = (id: string) => siteSections.find((section) => section.id === id)?.visible !== false;

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".editable-storefront");
    if (!root) return;
    const selectors: Record<string, string> = {
      hero: ".hero", ribbon: ".service-ribbon", catalogue: "#catalogue", nouveautes: "#nouveautes",
      rentree: "#rentree-scolaire", promise: ".promise", promotions: "#promotions", services: "#services",
      story: "#notre-histoire", brands: ".brands-section", delivery: "#livraison", testimonials: ".testimonials-section",
      faq: "#faq", contact: "#contact", cta: ".cta",
    };
    siteSections.forEach((section, index) => {
      const element = root.querySelector<HTMLElement>(selectors[section.id]);
      if (!element) return;
      element.style.order = String(index + 10);
      if (section.visible) element.style.removeProperty("display");
      else element.style.display = "none";
    });

    const replaceText = (key: string, selector: string, firstOnly = false) => {
      const value = siteTexts[`${key}_${language}`]?.trim();
      const element = root.querySelector<HTMLElement>(selector);
      if (!value || !element) return;
      if (firstOnly && element.firstChild) element.firstChild.textContent = value;
      else element.textContent = value;
    };
    replaceText("story_title", ".story-copy h2", true);
    replaceText("story_description", ".story-copy > p:not(.eyebrow)");
    replaceText("services_title", "#services .center-heading h2", true);
    replaceText("services_description", "#services .center-heading > p:not(.eyebrow)");
    replaceText("delivery_description", "#livraison .section-heading > p");
    replaceText("contact_title", "#contact .contact-copy h2", true);
    replaceText("welcome_eyebrow", ".cta .eyebrow");

    const phone = storeSettings.phone?.trim();
    if (phone) {
      root.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]').forEach((anchor) => anchor.href = `tel:${phone.replace(/\s/g, "")}`);
      const contactPhone = root.querySelector<HTMLElement>(".contact-phone");
      if (contactPhone) contactPhone.textContent = phone;
    }
    if (storeSettings.opening_hours?.trim()) {
      const hours = root.querySelector<HTMLElement>(".contact-hour > span");
      if (hours) hours.textContent = storeSettings.opening_hours;
    }
    if (storeSettings.delivery_conditions?.trim() && !siteTexts[`delivery_description_${language}`]?.trim()) {
      const delivery = root.querySelector<HTMLElement>("#livraison .section-heading > p");
      if (delivery) delivery.textContent = storeSettings.delivery_conditions;
    }
    const discount = Number(storeSettings.welcome_discount || 10);
    if (Number.isFinite(discount) && discount > 0 && discount <= 100) {
      const announcement = root.querySelector<HTMLElement>(".announcement strong");
      if (announcement) announcement.textContent = language === "fr" ? `${discount} % de rabais` : `${discount}% off`;
      const modalDiscount = root.querySelector<HTMLElement>(".promo-modal h2 > span");
      if (modalDiscount) modalDiscount.textContent = `${discount} %`;
    }
  }, [storeSettings.site_sections, storeSettings.site_texts, storeSettings.phone, storeSettings.opening_hours, storeSettings.delivery_conditions, storeSettings.welcome_discount, language, promoOpen]);

  return {
    storePhone,
    whatsappNumber,
    whatsappUrl,
    facebookUrl,
    address,
    mapsUrl,
    mapEmbedUrl,
    isEnglish,
    say,
    editable,
    sectionStyle,
    sectionVisible,
  };
}
