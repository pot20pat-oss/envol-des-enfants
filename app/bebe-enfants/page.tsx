import type { Metadata } from "next";
import CategoryStorefront from "../category-storefront";
export const metadata: Metadata={title:"Articles pour bébé et enfants | L’Envol des Enfants",description:"Découvrez notre sélection d’articles pour bébé et jeunes enfants.",alternates:{canonical:"/bebe-enfants"}};
export default function Page(){return <CategoryStorefront title="Bébé & enfants" subtitle="Articles sélectionnés pour bébé et jeunes enfants." categories={["bebe"]}/>}