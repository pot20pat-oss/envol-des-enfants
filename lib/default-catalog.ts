import { mamaProducts } from "./mama-products";
import archiveSupplementProductData from "../data/archive-supplement-products.json";
import defaultInlineProductData from "../data/default-products.json";

export type Translation = { fr: string; en: string };
export type Product = { id?: string; articleNumber?: string; name: Translation; category: string; price: number; ages: string; sheet: string; position: number; imageUrl?: string; extraImages?: string[]; stock?: number; status: "available" | "reserved" | "sold"; badge?: "new" | "school"; detail: Translation; priceConakry?: number; priceQc?: number; stockConakry?: number; stockQc?: number; visibleConakry?: boolean; visibleQc?: boolean; brand?: string };

export const removedProductNames = [
  "Poupée princesse Ariel · édition deluxe", "Poupée princesse Moana · coiffure",
  "Poupée princesse Belle · coiffure", "Poupée princesse Elsa · coiffure",
  "Poupée princesse Raiponce · coiffure", "Poupée princesse Ariel · coiffure",
  "Poupée princesse Raya", "Poupée princesse Mulan", "Poupée princesse Ariel · classique",
  "Poupée princesse Tiana", "Poupée princesse Raiponce · classique",
  "Poupée princesse Belle · classique", "Poupée princesse Mulan · royale",
  "Poupée princesse Aurore", "Poupée princesse Moana · classique",
  "Poupée princesse Raiponce · deluxe", "Poupée princesse Cendrillon",
  { name:{fr:"Disney Raiponce · coiffure deluxe",en:"Disney Rapunzel · deluxe styling"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-01.webp", status:"available", badge:"new", detail:{fr:"Poupée Raiponce avec accessoires de coiffure.",en:"Rapunzel doll with styling accessories."} },
  { name:{fr:"Disney Raiponce · ensemble coiffure",en:"Disney Rapunzel · styling set"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-02.webp", status:"available", badge:"new", detail:{fr:"Poupée Raiponce et ses accessoires.",en:"Rapunzel doll and accessories."} },
  { name:{fr:"Disney Elsa · ensemble coiffure",en:"Disney Elsa · styling set"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Frozen", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-03.webp", status:"available", badge:"new", detail:{fr:"Poupée Elsa avec accessoires inspirés de La Reine des neiges.",en:"Elsa doll with Frozen-inspired accessories."} },
  { name:{fr:"Disney Belle · ensemble coiffure",en:"Disney Belle · styling set"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-04.webp", status:"available", badge:"new", detail:{fr:"Poupée Belle avec accessoires de coiffure.",en:"Belle doll with styling accessories."} },
  { name:{fr:"Disney Moana · ensemble coiffure",en:"Disney Moana · styling set"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-05.webp", status:"available", badge:"new", detail:{fr:"Poupée Moana avec accessoires de coiffure.",en:"Moana doll with styling accessories."} },
  { name:{fr:"Disney Ariel · robe sirène",en:"Disney Ariel · mermaid dress"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-06.webp", status:"available", badge:"new", detail:{fr:"Poupée Ariel en robe de sirène.",en:"Ariel doll in a mermaid dress."} },
  { name:{fr:"Disney Cendrillon · tenue bleue",en:"Disney Cinderella · blue outfit"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-07.webp", status:"available", badge:"new", detail:{fr:"Poupée Cendrillon dans une tenue bleue.",en:"Cinderella doll in a blue outfit."} },
  { name:{fr:"Disney Ariel · ensemble coiffure",en:"Disney Ariel · styling set"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-08.webp", status:"available", badge:"new", detail:{fr:"Poupée Ariel avec accessoires sur le thème marin.",en:"Ariel doll with sea-themed accessories."} },
  { name:{fr:"Disney Raya · aventure",en:"Disney Raya · adventure"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-09.webp", status:"available", badge:"new", detail:{fr:"Poupée Raya en tenue d'aventure.",en:"Raya doll in her adventure outfit."} },
  { name:{fr:"Disney Raiponce · robe violette",en:"Disney Rapunzel · purple dress"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-10.webp", status:"available", badge:"new", detail:{fr:"Poupée Raiponce en robe violette.",en:"Rapunzel doll in a purple dress."} },
  { name:{fr:"Disney Moana · tenue d'aventure",en:"Disney Moana · adventure outfit"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-11.webp", status:"available", badge:"new", detail:{fr:"Poupée Moana dans sa tenue d'aventure.",en:"Moana doll in her adventure outfit."} },
  { name:{fr:"Disney Aurore · robe rose",en:"Disney Aurora · pink dress"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-12.webp", status:"available", badge:"new", detail:{fr:"Poupée Aurore dans sa robe rose.",en:"Aurora doll in her pink dress."} },
  { name:{fr:"Disney Mulan · tenue rose",en:"Disney Mulan · pink outfit"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-13.webp", status:"available", badge:"new", detail:{fr:"Poupée Mulan en tenue rose royale.",en:"Mulan doll in a royal pink outfit."} },
  { name:{fr:"Disney Belle · robe dorée",en:"Disney Belle · golden dress"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-14.webp", status:"available", badge:"new", detail:{fr:"Poupée Belle en robe dorée.",en:"Belle doll in a golden dress."} },
  { name:{fr:"Disney Raiponce · classique",en:"Disney Rapunzel · classic"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-15.webp", status:"available", badge:"new", detail:{fr:"Poupée Raiponce classique en robe violette.",en:"Classic Rapunzel doll in purple."} },
  { name:{fr:"Disney Tiana · robe verte",en:"Disney Tiana · green dress"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-16.webp", status:"available", badge:"new", detail:{fr:"Poupée Tiana en robe verte.",en:"Tiana doll in a green dress."} },
  { name:{fr:"Disney Ariel · classique",en:"Disney Ariel · classic"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-17.webp", status:"available", badge:"new", detail:{fr:"Poupée Ariel classique en tenue turquoise.",en:"Classic Ariel doll in turquoise."} },
  { name:{fr:"Disney Mulan · classique",en:"Disney Mulan · classic"}, category:"disney", price:0, priceConakry:0, priceQc:0, stockConakry:1, stockQc:1, visibleConakry:true, visibleQc:true, brand:"Disney Princess", ages:"3+", sheet:"", position:0, imageUrl:"/products/disney/disney-18.webp", status:"available", badge:"new", detail:{fr:"Poupée Mulan classique.",en:"Classic Mulan doll."} },
];

const referencePriceById: Record<string, number> = {
  "mama-05": 485000, "mama-06": 321000, "mama-13": 600000, "mama-14": 485000,
  "mama-16": 460000, "mama-19": 460000, "mama-22": 485000, "mama-23": 1199800, "mama-28": 485000,
  "mama-33": 725000, "mama-36": 485000, "mama-39": 485000, "mama-40": 1199800,
  "mama-41": 600000, "mama-43": 600000, "mama-44": 1199800, "mama-50": 485000,
  "mama-51": 460000, "mama-62": 400000,
};

function verifiedReferencePrice(product: Product): number | undefined {
  if (product.id && referencePriceById[product.id]) return referencePriceById[product.id];
  if (/\/products\/barbie\/barbie-(?:0[2-9]|1[0-9]|20)\.webp$/.test(product.imageUrl || "")) return 150000;
  if (/\/products\/disney\/disney-(?:01|02)\.webp$/.test(product.imageUrl || "")) return 460000;
  if (/\/products\/disney\/disney-1[2-8]\.webp$/.test(product.imageUrl || "")) return 285000;
  if (/\/products\/nouveautes\/(?:chien-marcheur|licorne-marcheuse)\.webp$/.test(product.imageUrl || "")) return 320000;
  return undefined;
}

export const archiveSupplementProducts: Product[] = archiveSupplemen[
  ...mamaProducts,
  ...archiveSupplementProducts,
  ...(defaultInlineProductData as Product[]),
] ronde et brassards Minnie.",en:"Minnie swim tube and armbands."} },
].filter((product) => Boolean(product.imageUrl)).map((product) => {
  const referencePrice = verifiedReferencePrice(product);
  return referencePrice === undefined ? product : { ...product, price: referencePrice, priceConakry: referencePrice };
});
