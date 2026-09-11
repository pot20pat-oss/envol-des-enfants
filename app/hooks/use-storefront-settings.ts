"use client";

import { useEffect, type CSSProperties } from "react";
import { readSiteSections, readSiteTexts } from "@/lib/site-editor";
import type { Market } from "@/lib/markets";
import type { StoreLanguage } from "./use-store-language";

export function useStorefrontSettings(
  storeSettings: Record<string, string>,
  market: Market,
  language: StoreLanguage,
) {
  const siteSections = readSiteSections(storeSettings.site_sections);
  const siteTexts = readSiteTexts(storeSettings.site_texts);
  const storePhone = storeSettings.phone || (market === "conakry" ? "+224 666 54 79 76" : "");
  const whatsappNumber = (storeSettings.whatsapp || (market === "conakry" ? "224666547976" : "")).replace(/[^\d]/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#contact";
  const facebookUrl = storeSettings.facebook || (market === "conakry" ? "https://www.facebook.com/rachetteboutique/" : "#contact");
  const address = storeSettings.address || (market === "conakry" ? "Conakry, Matam — Route du Niger" : "Québec, Canada");
  const mapsUrl = storeSettings.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=${market === "qc" && !storeSettings.address ? "6" : "13"}&ie=UTF8&iwloc=&output=embed`;
  const parsedDiscount = Number(storeSettings.welcome_discount || 10);
  const welcomeDiscount = Number.isFinite(parsedDiscount) && parsedDiscount > 0 && parsedDiscount <= 100 ? parsedDiscount : 10;
  const isEnglish = language === "en";
  const say = (french: string, english: string) => isEnglish ? english : french;

  const localizedSiteText = (key: string) => {
    const localized = siteTexts[`${key}_${language}`]?.trim();
    if (language !== "en") return localized;
    const french = siteTexts[`${key}_fr`]?.trim();
    if (!localized || (french && localized === french)) return "";
    return localized;
  };

  const editable = (key: string, french: string, english: string) => localizedSiteText(key) || say(french, english);
  const sectionStyle = (id: string): CSSProperties => {
    const index = siteSections.findIndex((section) => section.id === id);
    const section = siteSections[index];
    const order = id === "hero" && market === "qc" ? 1 : index < 0 ? 500 : index + 10;
    return { order, ...(section && !section.visible && !(id === "hero" && market === "qc") ? { display: "none" } : {}) };
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
      element.style.order = section.id === "hero" && market === "qc" ? "1" : String(index + 10);
      if (section.visible || (section.id === "hero" && market === "qc")) element.style.removeProperty("display");
      else element.style.display = "none";
    });

    const replaceText = (key: string, selector: string, firstOnly = false) => {
      const value = localizedSiteText(key);
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
    if (language === "fr" && storeSettings.delivery_conditions?.trim() && !siteTexts.delivery_description_fr?.trim()) {
      const delivery = root.querySelector<HTMLElement>("#livraison .section-heading > p");
      if (delivery) delivery.textContent = storeSettings.delivery_conditions;
    }
    const announcement = root.querySelector<HTMLElement>(".announcement strong");
    if (announcement) announcement.textContent = language === "fr" ? `${welcomeDiscount} % de rabais` : `${welcomeDiscount}% off`;
  }, [storeSettings.site_sections, storeSettings.site_texts, storeSettings.phone, storeSettings.opening_hours, storeSettings.delivery_conditions, storeSettings.welcome_discount, language, welcomeDiscount, market]);

  return {
    storePhone,
    whatsappNumber,
    whatsappUrl,
    facebookUrl,
    address,
    mapsUrl,
    mapEmbedUrl,
    welcomeDiscount,
    isEnglish,
    say,
    editable,
    sectionStyle,
    sectionVisible,
  };
}
