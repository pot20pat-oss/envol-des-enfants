"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NavRouteBridge() {
  const router = useRouter();

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".shop-nav > .wrap");
    if (!nav) return;

    const routes: Array<[string,string]> = [
      ['a[href="#nouveautes"]', "/"],
      [".nav-dropdown:nth-of-type(1)", "/catalogue"],
      [".nav-dropdown:nth-of-type(2)", "/jouets"],
      ["a.nav-dolls-tab", "/poupees"],
      [".nav-dropdown:nth-of-type(3)", "/bebe-enfants"],
      [".nav-dropdown:nth-of-type(4)", "/articles-scolaires"],
      ['a[href="#promotions"]', "/promotions"],
      ['a[href="#contact"]', "/nous-trouver"],
    ];

    routes.forEach(([selector, route]) => {
      const item = nav.querySelector<HTMLElement>(`:scope > ${selector}`);
      if (!item) return;
      item.dataset.route = route;
      if (item instanceof HTMLAnchorElement) item.href = route;
    });

    const click = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const item = target?.closest<HTMLElement>(".shop-nav > .wrap > a, .shop-nav > .wrap > .nav-dropdown");
      if (!item?.dataset.route || target?.closest(".nav-dropdown-panel")) return;
      event.preventDefault();
      event.stopPropagation();
      router.push(item.dataset.route);
    };

    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [router]);

  return null;
}
