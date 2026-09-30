import type { Metadata } from "next";
import CategoryStorefront from "../category-storefront";

export const metadata: Metadata = {
  title: "Catalogue de jouets pour enfants | L’Envol des Enfants",
  description: "Parcourez le catalogue de L’Envol des Enfants : jouets éducatifs, poupées, articles pour bébé, véhicules, plein air et articles scolaires.",
  alternates: { canonical: "/catalogue" },
};

export default function Page() {
  return <CategoryStorefront title="Catalogue" subtitle="Tous les articles disponibles dans votre boutique." />;
}
