"use client";

import { useEffect, useState } from "react";

type Say = (french: string, english: string) => string;

type Props = {
  say: Say;
};

export default function StorefrontQuickScroll({ say }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 320);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-to-top"
      aria-label={say("Revenir complètement en haut", "Scroll all the way to the top")}
      title={say("Retour en haut", "Back to top")}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}
