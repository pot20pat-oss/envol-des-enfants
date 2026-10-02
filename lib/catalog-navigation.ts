export type CatalogFamily = {
  value: string;
  labelFr: string;
  labelEn: string;
  categories: string[];
};

export const dollCategories = [
  "poupees","princesses","disney","barbie","mylife","miraculous","lol",
  "rainbowhigh","babyalive","hairmazing","karma","mysweetbaby","glamourgirl","autres_poupees",
];

export const catalogFamilies: CatalogFamily[] = [
  { value:"jouets", labelFr:"Jouets & jeux", labelEn:"Toys & games", categories:["eveil","imitation","dinosaures","animaux"] },
  { value:"poupees", labelFr:"Poupées & princesses", labelEn:"Dolls & princesses", categories:dollCategories },
  { value:"bebe", labelFr:"Bébé & éveil", labelEn:"Baby & early learning", categories:["bebe"] },
  { value:"ecole", labelFr:"Articles scolaires", labelEn:"School supplies", categories:["scolaire","sacs"] },
  { value:"pleinair", labelFr:"Véhicules & plein air", labelEn:"Vehicles & outdoor play", categories:["vehicules","piscine"] },
];

export const catalogCategoryOptions = [
  { value:"all", labelFr:"Tout voir", labelEn:"View all" },
  ...catalogFamilies.map(({value,labelFr,labelEn}) => ({value,labelFr,labelEn})),
];
