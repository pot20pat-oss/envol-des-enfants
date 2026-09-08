import CategoryStorefront from "../category-storefront";

const categoryTabs = [
  { value: "princesses", labelFr: "Princesses", labelEn: "Princesses" },
  { value: "disney", labelFr: "Disney", labelEn: "Disney" },
  { value: "barbie", labelFr: "Barbie", labelEn: "Barbie" },
  { value: "mylife", labelFr: "My Life", labelEn: "My Life" },
  { value: "miraculous", labelFr: "Miraculous", labelEn: "Miraculous" },
  { value: "lol", labelFr: "LOL Surprise & OMG", labelEn: "LOL Surprise & OMG" },
  { value: "rainbowhigh", labelFr: "Rainbow High", labelEn: "Rainbow High" },
  { value: "babyalive", labelFr: "Baby Alive", labelEn: "Baby Alive" },
  { value: "hairmazing", labelFr: "Hairmazing", labelEn: "Hairmazing" },
  { value: "karma", labelFr: "Karma’s World", labelEn: "Karma’s World" },
  { value: "mysweetbaby", labelFr: "My Sweet Baby", labelEn: "My Sweet Baby" },
  { value: "glamourgirl", labelFr: "Glamour Girl", labelEn: "Glamour Girl" },
  { value: "autres_poupees", labelFr: "Autres poupées", labelEn: "Other dolls" },
];

export default function Page(){
  return <CategoryStorefront
    title="Mon monde de poupées et princesses"
    subtitle="Poupées, princesses et accessoires classés par univers et par marque."
    categories={["poupees","princesses","disney","barbie","mylife","miraculous","lol","rainbowhigh","babyalive","hairmazing","karma","mysweetbaby","glamourgirl","autres_poupees"]}
    categoryTabs={categoryTabs}
  />;
}
