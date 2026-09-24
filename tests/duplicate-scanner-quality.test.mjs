import test from "node:test";
import assert from "node:assert/strict";

const normalize=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const words=v=>new Set(normalize(v).split(" ").filter(w=>w.length>2));
const generic=new Set(["barbie","mattel","ken","poupee","poupees","figurine","figurines","jouet","jouets","disney","princess","princesse","dc","marvel","batman","aquaman","nerf","blaster","xshot","shot"]);
const distinctive=v=>new Set([...words(v)].filter(w=>!generic.has(w)));
const similarity=(a,b,setter=words,denom="min")=>{const A=setter(a),B=setter(b);if(!A.size||!B.size)return 0;let same=0;for(const w of A)if(B.has(w))same++;return same/(denom==="max"?Math.max(A.size,B.size):Math.min(A.size,B.size))};
const pass=(g,p)=>{if(p===1)return true;const visualStrong=g.legacy>=.975||g.cropped>=.985;const productEvidence=g.name>=.72||g.distinctive>=.65||g.sameBrand;if(p===2)return visualStrong&&productEvidence;return (g.legacy>=.975&&g.name>=.80)||(g.legacy>=.995)||(g.cropped>=.985&&g.name>=.80)};

test("strict pass accepts a near-identical image even when metadata drifted",()=>assert.equal(pass({legacy:.996,cropped:.97,name:.1,distinctive:0,sameBrand:false},3),true));
test("strict pass rejects same-brand variants when image evidence is weak",()=>assert.equal(pass({legacy:.82,cropped:.86,name:.9,distinctive:.8,sameBrand:true},3),false));
test("probable pass needs image and product evidence",()=>{
 assert.equal(pass({legacy:.98,cropped:.97,name:.2,distinctive:.1,sameBrand:false},2),false);
 assert.equal(pass({legacy:.98,cropped:.97,name:.2,distinctive:.1,sameBrand:true},2),true);
});
test("catalog-like Barbie variants keep useful semantic separation",()=>{
 const a="Barbie robe bleue à pois",b="Barbie robe jaune";
 assert.ok(similarity(a,b)>=.5);
 assert.ok(similarity(a,b,distinctive,"max")<.65);
});
test("catalog-like swim variants are similar names but not automatically duplicates",()=>{
 const a="Frozen lunettes de natation violettes",b="Frozen lunettes de natation bleues";
 assert.ok(similarity(a,b)>=.75);
 assert.equal(pass({legacy:.80,cropped:.84,name:similarity(a,b),distinctive:similarity(a,b,distinctive,"max"),sameBrand:true},3),false);
});
test("different-brand blasters need strong visual evidence",()=>{
 const a="Nerf grand blaster bleu et orange",b="Adventure Force Lancer blaster orange";
 assert.equal(pass({legacy:.90,cropped:.91,name:similarity(a,b),distinctive:similarity(a,b,distinctive,"max"),sameBrand:false},2),false);
});

const importVisualCandidate=({visual,text,distinctive,sameArticle=false,sameBrand=true})=>{
 const semanticIdentity=sameArticle||distinctive>=.55||text>=.82;
 const visualCopy=visual>=.965&&semanticIdentity;
 return visualCopy||(sameBrand&&(sameArticle||(visual>=.94&&text>=.72&&distinctive>=.55)));
};

test("same Barbie packaging is not enough to call different dolls duplicates",()=>{
 assert.equal(importVisualCandidate({visual:.99,text:.48,distinctive:0,sameBrand:true}),false);
 assert.equal(importVisualCandidate({visual:.98,text:.76,distinctive:.70,sameBrand:true}),true);
});

test("same superhero packaging is not enough when character identity disagrees",()=>{
 assert.equal(importVisualCandidate({visual:.98,text:.30,distinctive:0,sameBrand:false}),false);
 assert.equal(importVisualCandidate({visual:.98,text:.86,distinctive:.72,sameBrand:false}),true);
});
