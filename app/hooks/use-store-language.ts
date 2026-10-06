"use client";

import { useEffect, useState } from "react";

export type StoreLanguage = "fr" | "en";

export function useStoreLanguage() {
  const [language, setLanguage] = useState<StoreLanguage>("fr");

  useEffect(() => {
    const saved = window.localStorage.getItem("envol-language");
    if (saved === "fr" || saved === "en") setLanguage(saved);
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
