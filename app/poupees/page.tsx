import type { Metadata } from "next";
import CategoryStorefront from "../category-storefront";

export const metadata: Metadata={
  title:"Poupées et Barbie | L’Envol des Enfants",
  description:"Découvrez nos poupées, Barbie et accessoires pour enfants à L’Envol des Enfants.",
  alternates:{canonical:"/poupees"}
};

const categoryTabs = [
  { value: "barbie", labelFr: "Barbie", labelEn: "Barbie" },
  { value: "barbie-accessories", labelFr: "Barbie accessoires", labelEn: "Barbie accessories" },
];

export default function Page(){
  return <CategoryStorefront
    title="Mon monde de poupées"
    subtitle="Poupées, Barbie et accessoires, simplement classés pour trouver ce que vous cherchez."
    categories={["poupees","princesses","disney","barbie","mylife","miraculous","lol","rainbowhigh","babyalive","hairmazing","karma","mysweetbaby","glamourgirl","autres_poupees"]}
    categoryTabs={categoryTabs}
  />;
}
