import type { Metadata } from "next";
import "./globals.css";
import "./typography-large.css";
import "./product-previews-large.css";
import "./catalog-search-highlight.css";
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
          href="/_vinext/image?url=%2Fhero-client%2Fcostume-fr.webp&w=750&q=76"
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
      </body>
    </html>
  );
}

