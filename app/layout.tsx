import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
      <script src="/catalog-tabs-fix.js" defer />
    </html>
  );
}
