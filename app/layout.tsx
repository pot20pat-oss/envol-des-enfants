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
import "./homepage-only.css";
import "./category-pages.css";
import "./catalog-menu-autoclose.css";
import "./hero-mobile.css";
import "./product-lightbox.css";
import "./dialog-responsive.css";

export const metadata: Metadata = {
  title: "Envol des Enfants",
  description: "Boutique de jouets, poupées et princesses, articles pour bébé, véhicules, jeux de plein air et essentiels scolaires au Québec et à Conakry.",
  openGraph: {
    title: "Envol des Enfants",
    description: "Une sélection de jouets et d’univers pour accompagner les découvertes et les petits bonheurs de l’enfance.",
    images: ["https://envol-des-enfants.pages.dev/boutique-hero.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Envol des Enfants",
    description: "Une sélection de jouets et d’univers pour accompagner les découvertes et les petits bonheurs de l’enfance.",
    images: ["https://envol-des-enfants.pages.dev/boutique-hero.png"],
  },
  icons: {
    icon: "/favicon-envol.png?v=2",
    shortcut: "/favicon-envol.png?v=2",
  },
};

const styleBlockerCheck = `
(function () {
  function checkStyles() {
    var root = document.documentElement;
    var warning = document.getElementById('envol-style-warning');
    if (!warning) return;
    var cssReady = getComputedStyle(root).getPropertyValue('--navy').trim();
    warning.style.display = cssReady ? 'none' : 'block';
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
        <div
          id="envol-style-warning"
          role="alert"
          style={{
            display: "none",
            position: "fixed",
            inset: "12px 12px auto 12px",
            zIndex: 2147483647,
            maxWidth: "760px",
            margin: "0 auto",
            padding: "14px 18px",
            border: "2px solid #b42318",
            borderRadius: "10px",
            background: "#fff4f2",
            color: "#7a271a",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: "14px",
            lineHeight: 1.45,
            boxShadow: "0 8px 30px rgba(0,0,0,.18)",
          }}
        >
          <strong>Le bloqueur de contenu empêche l’affichage normal du site.</strong>{" "}
          Si vous utilisez Opera, autorisez <strong>envoldesenfants.com</strong> dans « Bloquer les publicités », puis rechargez la page.
        </div>
        {children}
        <script dangerouslySetInnerHTML={{ __html: styleBlockerCheck }} />
      </body>
    </html>
  );
}
