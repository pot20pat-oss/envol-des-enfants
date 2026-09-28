import type { Metadata } from "next";
import "./globals.css";
import "./navigation-large.css";
import "./nav-icons.css";
import "./nav-joy.css";
import "./brand-logos.css";
import "./typography-large.css";
import "./product-previews-large.css";
import "./catalog-search-highlight.css";
import "./logo-large.css";
import "./nav-icons-final.css";
import "./category-pages.css";
import "./catalog-menu-autoclose.css";
import "./hero-mobile.css";
import "./product-lightbox.css";
import "./dialog-responsive.css";
import "./commerce/commerce.css";
import "./commerce/storefront-commerce.css";
import "./storefront/shop-reference.css";
import "./homepage-only.css";
import { CommerceProvider } from "./commerce/commerce-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://envoldesenfants.com"),
  title: "L’Envol des Enfants | Jouets et jeux pour enfants",
  description: "Boutique de jouets, poupées et princesses, articles pour bébé, véhicules, jeux de plein air et essentiels scolaires au Québec et à Conakry.",
  openGraph: {
    title: "L’Envol des Enfants | Jouets et jeux pour enfants",
    description: "Une sélection de jouets et d’univers pour accompagner les découvertes et les petits bonheurs de l’enfance.",
    images: ["/boutique-hero.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "L’Envol des Enfants | Jouets et jeux pour enfants",
    description: "Une sélection de jouets et d’univers pour accompagner les découvertes et les petits bonheurs de l’enfance.",
    images: ["/boutique-hero.png"],
  },
  icons: {
    icon: "/favicon-envol.png?v=2",
    shortcut: "/favicon-envol.png?v=2",
  },
};

const styleBlockerCheck = `
(function () {
  function showWarning() {
    if (document.getElementById('envol-style-warning')) return;
    var warning = document.createElement('div');
    warning.id = 'envol-style-warning';
    warning.setAttribute('role', 'alert');
    warning.style.cssText = 'display:block;position:fixed;inset:12px 12px auto 12px;z-index:2147483647;max-width:760px;margin:0 auto;padding:14px 18px;border:2px solid #b42318;border-radius:10px;background:#fff4f2;color:#7a271a;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;box-shadow:0 8px 30px rgba(0,0,0,.18)';
    warning.innerHTML = '<strong>Le bloqueur de contenu empêche l’affichage normal du site.</strong> Si vous utilisez Opera, autorisez <strong>envoldesenfants.com</strong> dans « Bloquer les publicités », puis rechargez la page.';
    document.body.appendChild(warning);
  }
  function checkStyles() {
    var cssReady = getComputedStyle(document.documentElement).getPropertyValue('--navy').trim();
    if (!cssReady) showWarning();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(checkStyles, 250); }, { once: true });
  } else {
    setTimeout(checkStyles, 250);
  }
  window.addEventListener('load', function () { setTimeout(checkStyles, 100); }, { once: true });
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <CommerceProvider>{children}</CommerceProvider>
        <script dangerouslySetInnerHTML={{ __html: styleBlockerCheck }} />
      </body>
    </html>
  );
}
