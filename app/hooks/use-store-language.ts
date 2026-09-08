"use client";

import { useEffect, useState } from "react";

export type StoreLanguage = "fr" | "en";

export function useStoreLanguage() {
  const [language, setLanguage] = useState<StoreLanguage>("fr");

  useEffect(() => {
    const saved = window.localStorage.getItem("envol-language");
    const initialLanguage: StoreLanguage = saved === "fr" || saved === "en"
      ? saved
      : navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
    setLanguage(initialLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function changeLanguage(nextLanguage: StoreLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem("envol-language", nextLanguage);
  }

  return { language, changeLanguage };
}
