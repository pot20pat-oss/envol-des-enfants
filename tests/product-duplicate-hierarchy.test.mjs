import test from "node:test";
import assert from "node:assert/strict";
import { productHierarchy, sharedHierarchyDepth } from "../lib/product-duplicate-hierarchy.ts";

test("normalise les accents et conserve les niveaux proposés", () => {
  const item = productHierarchy({category:"Poupées",brand:"Mattel",name_fr:"Poupée Barbie Princesse Rose",article_number:"BAR-0001"});
  assert.equal(item.category,"poupees");
  assert.equal(item.group,"mattel");
  assert.equal(item.variant,"bar 0001");
  assert.ok(item.family.includes("barbie"));
});

test("une catégorie ou marque différente ne crée pas une fausse identité hiérarchique", () => {
  const a={category:"poupees",brand:"Mattel",name_fr:"Barbie princesse rose"};
  const b={category:"poupees",brand:"Autre marque",name_fr:"Barbie princesse rose"};
  assert.equal(sharedHierarchyDepth(a,b),1);
  assert.equal(sharedHierarchyDepth(a,{...b,category:"figurines"}),0);
});

test("une même famille atteint le niveau maximal sans imposer une identité de variante", () => {
  const a={category:"poupees",brand:"Mattel",name_fr:"Barbie princesse rose",article_number:"BAR-0001"};
  const b={...a,article_number:"BAR-0002"};
  assert.equal(sharedHierarchyDepth(a,b),4);
  assert.notEqual(productHierarchy(a).variant,productHierarchy(b).variant);
});
