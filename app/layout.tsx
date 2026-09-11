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
import "./hero-mobile.css";
import "./product-lightbox.css";
import "./promo-responsive.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
