import type { Metadata } from "next";
import CategoryStorefront from "../category-storefront";
export const metadata: Metadata={title:"Articles scolaires pour enfants | L’Envol des Enfants",description:"Magasinez cartables, sacs, gourdes et fournitures scolaires pour enfants.",alternates:{canonical:"/articles-scolaires"}};
export default function Page(){return <CategoryStorefront title="Articles scolaires" subtitle="Cartables, sacs, gourdes et fournitures pour la rentrée." categories={["scolaire","sacs"]}/>}