"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const disabled = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (disabled) {
      setVisible(false);
      return;
    }

    const onScroll = () => {
      const top = Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0
      );
      setVisible(top > 320);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [disabled]);

  if (disabled || !visible) return null;

  return (
    <button
      type="button"
      className="scroll-to-top"
      aria-label="Retour en haut"
      title="Retour en haut"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  );
}
