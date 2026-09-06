import type { Metadata } from "next";
import NavRouteBridge from "./nav-route-bridge";
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

export const metadata: Metadata = {
  title: "Envol des Enfants",
  description: "Boutique de jouets éducatifs, articles pour bébé, vêtements et fournitures scolaires à Dixinn, Conakry. Livraison et 10 % de rabais pour les nouveaux abonnés.",
  openGraph: {
    title: "Envol des Enfants",
    description: "Jouets éducatifs, articles pour bébé et fournitures scolaires à Dixinn, Conakry. 10 % de rabais pour les nouveaux abonnés.",
    images: ["https://envol-des-enfants.pages.dev/boutique-hero.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Envol des Enfants",
    description: "Jouets éducatifs, articles pour bébé et fournitures scolaires à Dixinn, Conakry. 10 % de rabais pour les nouveaux abonnés.",
    images: ["https://envol-des-enfants.pages.dev/boutique-hero.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr-GN">
      <body className="antialiased"><NavRouteBridge />{children}</body>
    </html>
  );
}
