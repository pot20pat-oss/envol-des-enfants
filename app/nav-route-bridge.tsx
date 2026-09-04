"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const routes = [
  "/",
  "/catalogue",
  "/jouets",
  "/poupees",
  "/bebe-enfants",
  "/articles-scolaires",
  "/promotions",
  "/nous-trouver",
] as const;

export default function NavRouteBridge() {
  const router = useRouter();

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".shop-nav > .wrap");
    if (!nav) return;

    const items = Array.from(nav.children).filter((item) => item instanceof HTMLElement) as HTMLElement[];
    items.forEach((item, index) => {
      const route = routes[index];
      if (!route) return;
      item.dataset.route = route;
      if (item instanceof HTMLAnchorElement) item.href = route;
      const button = item.querySelector<HTMLButtonElement>(":scope > button");
      if (button) {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          router.push(route);
        });
      }
    });

    const click = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const item = target?.closest<HTMLElement>(".shop-nav > .wrap > a, .shop-nav > .wrap > .nav-dropdown");
      if (!item?.dataset.route || target?.closest(".nav-dropdown-panel")) return;
      event.preventDefault();
      router.push(item.dataset.route);
    };

    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [router]);

  return null;
}
