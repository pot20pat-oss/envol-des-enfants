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
import "./hero-mobile.css";
import "./product-lightbox.css";
import "./dialog-responsive.css";
import "./commerce/commerce.css";
import "./commerce/storefront-commerce.css";
import "./storefront/shop-reference.css";
import { CommerceProvider } from "./commerce/commerce-provider";
import ScrollToTop from "./components/scroll-to-top";

export const metadata: Metadata = {
  metadataBase: new URL("https://envoldesenfants.com"),
  title: "L’Envol des Enfants | Jouets et jeux pour enfants",
  description: "L’Envol des Enfants est une boutique de jouets en ligne : jouets éducatifs, poupées, articles pour bébé, véhicules, plein air et scolaire au Québec et à Conakry.",
  alternates: { canonical: "/" },
  keywords: ["L’Envol des Enfants", "boutique de jouets", "jouets pour enfants", "jouets éducatifs", "Québec", "Conakry"],
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
    icon: "/envol-logo-transparent.png",
    shortcut: "/envol-logo-transparent.png",
    apple: "/envol-logo-transparent.png",
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
      <head>
        <link
          rel="preload"
          as="image"
          href="/_vinext/image?url=%2Fhero-client%2Fcostume-fr.webp&w=1200&q=78"
          fetchPriority="high"
        />
      </head>
      <body className="antialiased">
        <CommerceProvider>{children}</CommerceProvider>
        <ScrollToTop />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "OnlineStore",
              "@id": "https://envoldesenfants.com/#store",
              name: "L’Envol des Enfants",
              url: "https://envoldesenfants.com/",
              description: "Boutique de jouets en ligne pour enfants au Québec et à Conakry.",
              image: "https://envoldesenfants.com/boutique-hero.png",
              areaServed: [
                { "@type": "AdministrativeArea", name: "Québec, Canada" },
                { "@type": "City", name: "Conakry, Guinée" }
              ]
            }).replace(/</g, "\\u003c"),
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: styleBlockerCheck }} />
      </body>
    </html>
  );
}

