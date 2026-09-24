"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { categories, request, type Row } from "./admin-shared";
import type { Market } from "@/lib/markets";
import { sharedHierarchyDepth } from "@/lib/product-duplicate-hierarchy";

type Match={product:Row;score:number;kind:"certain"|"probable"|"related";reason:string};
type Item={id:string;file:File;preview:string;hash:string;visualHash:string;duplicate:boolean;imageOrder?:number;isPrimary?:boolean;duplicateKind?:"exact"|"visual";url?:string;suggestion?:Row;group?:string;catalogMatch?:Row;catalogScore?:number;catalogMatches?:Match[];matchRejected?:boolean;matchAccepted?:boolean;state:"ready"|"uploading"|"analyzing"|"done"|"error";error?:string};

async function sha256(file:File){const d=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function visualHash(file:File){const bitmap=await createImageBitmap(file);const canvas=document.createElement("canvas");canvas.width=16;canvas.height=16;const ctx=canvas.getContext("2d")!;ctx.drawImage(bitmap,0,0,16,16);bitmap.close();const data=ctx.getImageData(0,0,16,16).data;const lum:number[]=[];for(let i=0;i<data.length;i+=4)lum.push(Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114));const avg=lum.reduce((a,b)=>a+b,0)/lum.length;return lum.map(v=>v>=avg?"1":"0").join("")}
async function prepareUpload(file:File){
 const target=900*1024,max=1600;
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const ctx=canvas.getContext("2d");if(!ctx){bitmap.close();throw new Error("Impossible de préparer cette image.")}
 ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 let quality=.82,blob:Blob|null=null;
 do{blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));quality-=.08}while(blob&&blob.size>target&&quality>=.42);
 if(!blob)throw new Error("Impossible de compresser cette image.");
 if(blob.size>target)throw new Error("Cette image reste trop volumineuse après compression.");
 return new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg",lastModified:Date.now()});
}
// Comparaison des pixels normalisés : indépendante du nom, de la marque et du format JPEG/PNG.
async function imagePixels(blob:Blob){const bitmap=await createImageBitmap(blob);try{const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Canvas indisponible");ctx.fillStyle="#fff";ctx.fillRect(0,0,64,64);const scale=Math.min(64/bitmap.width,64/bitmap.height);const w=bitmap.width*scale,h=bitmap.height*scale;ctx.drawImage(bitmap,(64-w)/2,(64-h)/2,w,h);const data=ctx.getImageData(0,0,64,64).data;const rgb=new Uint8Array(64*64*3);for(let i=0,j=0;i<data.length;i+=4){const alpha=data[i+3]/255;rgb[j++]=Math.round(data[i]*alpha+255*(1-alpha));rgb[j++]=Math.round(data[i+1]*alpha+255*(1-alpha));rgb[j++]=Math.round(data[i+2]*alpha+255*(1-alpha))}return {rgb,ratio:bitmap.width/bitmap.height}}finally{bitmap.close()}}
function pixelSimilarity(a:{rgb:Uint8Array;ratio:number},b:{rgb:Uint8Array;ratio:number}){if(Math.abs(a.ratio-b.ratio)>.06)return 0;let difference=0;for(let i=0;i<a.rgb.length;i++)difference+=Math.abs(a.rgb[i]-b.rgb[i]);return Math.max(0,1-difference/(255*a.rgb.length))}
function pixelColorSimilarity(a:{rgb:Uint8Array;ratio:number},b:{rgb:Uint8Array;ratio:number}){if(Math.abs(a.ratio-b.ratio)>.10)return 0;let same=0,total=0;for(let i=0;i<a.rgb.length;i+=3){const aw=Math.max(a.rgb[i],a.rgb[i+1],a.rgb[i+2])<242,bw=Math.max(b.rgb[i],b.rgb[i+1],b.rgb[i+2])<242;if(!aw&&!bw)continue;total++;const d=(Math.abs(a.rgb[i]-b.rgb[i])+Math.abs(a.rgb[i+1]-b.rgb[i+1])+Math.abs(a.rgb[i+2]-b.rgb[i+2]))/3;if(d<=34)same++}return total?same/total:0}
function sameImagePixels(a:{rgb:Uint8Array;ratio:number},b:{rgb:Uint8Array;ratio:number}){return Math.abs(a.ratio-b.ratio)<=.012&&pixelSimilarity(a,b)>=1-3/255}
function distance(a:string,b:string){let n=0;for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])n++;return n+Math.abs(a.length-b.length)}
function visualSimilarity(a:string,b:string){if(!a||!b)return 0;return Math.max(0,1-distance(a,b)/Math.max(a.length,b.length))}
async function visualHashUrl(url:string){const res=await fetch(url);if(!res.ok)throw new Error("image");const blob=await res.blob();return visualHash(new File([blob],"catalog-image",{type:blob.type||"image/jpeg"}))}
function norm(v:unknown){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function groupKey(s:Row){const brand=norm(s.brand);const name=norm(s.name_fr).split(" ").filter(x=>x.length>2).slice(0,5).join("-");return `${norm(s.category)}|${brand}|${name}`}
function setScore(a:Set<string>,b:Set<string>){if(!a.size||!b.size)return 0;let same=0;for(const x of a)if(b.has(x))same++;return same/Math.min(a.size,b.size)}
function productSimilarity(a:Row,b:Row){const aw=words(`${a.name_fr||""} ${a.name_en||""} ${a.brand||""} ${a.description_fr||""}`),bw=words(`${b.name_fr||""} ${b.name_en||""} ${b.brand||""} ${b.description_fr||""}`);let s=setScore(aw,bw);if(norm(a.brand)&&norm(a.brand)===norm(b.brand))s+=.15;if(norm(a.category)&&norm(a.category)===norm(b.category))s+=.12;return Math.min(s,1)}
function regroup(items:Item[]){/* Le regroupement automatique est volontairement désactivé. L'IA analyse chaque photo séparément; seul l'utilisateur décide quelles photos représentent le même produit via la sélection + "Assembler en 1 article". */return items}
function words(v:unknown){return new Set(norm(v).split(" ").filter(x=>x.length>2))}
function overlap(a:Set<string>,b:Set<string>){if(!a.size||!b.size)return 0;let same=0;for(const x of a)if(b.has(x))same++;return same/Math.min(a.size,b.size)}
const genericWords=new Set(["barbie","poupee","doll","jouet","toy","enfant","children","kids","girl","fille","garcon","boy","produit","product"]);
function usefulWords(v:unknown){return new Set([...words(v)].filter(x=>!genericWords.has(x)))}
function catalogMatches(s:Row,products:Row[]){
 const found:Match[]=[];
 const sn=words(`${s.name_fr||""} ${s.name_en||""}`),sd=words(`${s.description_fr||""} ${s.description_en||""}`),su=usefulWords(`${s.name_fr||""} ${s.name_en||""} ${s.description_fr||""} ${s.description_en||""}`);
 for(const p of products){
  const pn=words(`${p.name_fr||""} ${p.name_en||""}`),pd=words(`${p.description_fr||""} ${p.description_en||""}`),pu=usefulWords(`${p.name_fr||""} ${p.name_en||""} ${p.description_fr||""} ${p.description_en||""}`);
  const name=overlap(sn,pn),desc=overlap(sd,pd),distinctive=overlap(su,pu);
  const sourceBrand=norm(s.brand),productBrand=norm(p.brand);
  const sameBrand=!!(sourceBrand&&productBrand&&sourceBrand===productBrand);
  const brandConflict=!!(sourceBrand&&productBrand&&sourceBrand!==productBrand);
  const sameCategory=!!(norm(s.category)&&norm(s.category)===norm(p.category));
  const article=!!(norm(s.article_number)&&norm(s.article_number)===norm(p.article_number));
  // La marque sert à trouver la famille, jamais à déclarer un doublon à elle seule.
  let score=article?1:(distinctive*.55+name*.25+desc*.12+(sameCategory?.08:0));
  // Une marque erronée ne doit pas éliminer une correspondance textuelle forte.
  if(brandConflict&&!article)score*=.85;
  if(!su.size||!pu.size)score=Math.min(score,.48);
  if(distinctive===0&&!article)score=Math.min(score,.32);
  let kind:Match["kind"]="related",reason=sameBrand?"Même marque / gamme à comparer":"Produit associé à comparer";
  if(article&&sameBrand){kind="probable";reason="Même marque + même numéro d’article — image à confirmer"}
  // Ne jamais filtrer par marque : le scanner visuel est indépendant du classement.
  if(article||distinctive>=.42||(name>=.72&&desc>=.5))found.push({product:p,score:Math.min(score,1),kind,reason});
 }
 const rank={certain:3,probable:2,related:1};
 return found.sort((a,b)=>rank[b.kind]-rank[a.kind]||b.score-a.score||sharedHierarchyDepth(s,b.product)-sharedHierarchyDepth(s,a.product)).slice(0,60)
}

export function AiBatchImport({market,busy,onDone,catalogProducts,search,setSearch,synchronize,add,scanDuplicates,duplicateScanning,duplicateProgress}:{market:Market;busy:boolean;onDone:()=>Promise<void>;catalogProducts:Row[];search:string;setSearch:(value:string)=>void;synchronize:()=>void;add:()=>void;scanDuplicates:()=>void|Promise<void>;duplicateScanning:boolean;duplicateProgress:{done:number;total:number}}){
 const[items,setItems]=useState<Item[]>([]);const[importResult,setImportResult]=useState<{created:{id:string;article:string;name:string;images:number}[];visibility:string}|null>(null);const[selectedImportItems,setSelectedImportItems]=useState<Set<string>>(new Set());const[showSelectedOnly,setShowSelectedOnly]=useState(false);const[targetVisibility,setTargetVisibility]=useState<"hidden"|"qc"|"conakry"|"both">("hidden");const[matchSearch,setMatchSearch]=useState("");const[selectedDuplicates,setSelectedDuplicates]=useState<Set<string>>(new Set());const visualHashCache=useRef<Map<string,string>>(new Map());const catalogPixelCache=useRef<Map<string,Promise<Awaited<ReturnType<typeof imagePixels>>|null>>>(new Map());const[working,setWorking]=useState(false);const[aiProgress,setAiProgress]=useState({done:0,total:0,current:""});const[standby,setStandby]=useState(true);const[zoomImage,setZoomImage]=useState<string|null>(null);const[attachItemId,setAttachItemId]=useState<string|null>(null);const[attachSearch,setAttachSearch]=useState("");const unique=useMemo(()=>items.filter(i=>!i.duplicate),[items]);
 async function choose(files:FileList|null){setImportResult(null);const selected=Array.from(files||[]).filter(f=>f.type.startsWith("image/"));const seen=new Set<string>();const visual:string[]=[];const next:Item[]=[];
  for(const file of selected){const hash=await sha256(file),vh=await visualHash(file);const exact=seen.has(hash);const near=!exact&&visual.some(x=>distance(x,vh)<=18);seen.add(hash);if(!exact)visual.push(vh);/* Seul un fichier strictement identique est éliminé avant analyse. Une ressemblance visuelle n’est plus un doublon : la photo est analysée comme nouveau produit puis l’IA peut proposer de la regrouper avec une autre vue du même article. */next.push({id:crypto.randomUUID(),file,preview:URL.createObjectURL(file),hash,visualHash:vh,duplicate:exact,duplicateKind:exact?"exact":near?"visual":undefined,state:"ready"})}setItems(next);setSelectedImportItems(new Set(next.filter(x=>!x.duplicate).map(x=>x.id)));setShowSelectedOnly(false)}
 async function exactCatalogMatch(file:File):Promise<Row|undefined>{
  const incoming=await imagePixels(file);
  const batchSize=12;
  for(let i=0;i<catalogProducts.length;i+=batchSize){
    const matches=await Promise.all(catalogProducts.slice(i,i+batchSize).map(async product=>{
      const urls=[String(product.image_url||"")];try{const additional=JSON.parse(String(product.images_json||"[]"));if(Array.isArray(additional))urls.push(...additional.filter((u:unknown)=>typeof u==="string"))}catch{}
      for(const url of urls.filter(Boolean)){
        let cached=catalogPixelCache.current.get(url);
        if(!cached){cached=fetch(url).then(r=>{if(!r.ok)throw new Error("Image du catalogue inaccessible");return r.blob()}).then(imagePixels).catch(()=>null);catalogPixelCache.current.set(url,cached)}
        const pixels=await cached;if(pixels&&sameImagePixels(incoming,pixels))return product;
      }
      return undefined;
    }));
    const match=matches.find(Boolean);if(match)return match;
  }
  return undefined;
 }
 async function rankCatalogVisually(item:Item,suggestion:Row){
  const textMatches=catalogMatches(suggestion,catalogProducts);
  const textById=new Map(textMatches.map(m=>[String(m.product.id),m.score]));
  const scored:Match[]=[];
  const sourceBrand=norm(suggestion.brand).replace(/\s+/g,"");
  const batchSize=12;
  for(let i=0;i<catalogProducts.length;i+=batchSize){
   const batch=catalogProducts.slice(i,i+batchSize);
   const rows=await Promise.all(batch.map(async p=>{
    let text=textById.get(String(p.id))||0;const rawText=productSimilarity(suggestion,p);text=Math.max(text,rawText);
    const productBrand=norm(p.brand).replace(/\s+/g,"");
    const sameBrand=!!(sourceBrand&&productBrand&&sourceBrand===productBrand);
    const brandConflict=!!(sourceBrand&&productBrand&&sourceBrand!==productBrand);
    let visual=0,pixel=0,colorPixel=0;
    const urls=[String(p.image_url||"")];try{const additional=JSON.parse(String(p.images_json||"[]"));if(Array.isArray(additional))urls.push(...additional.filter((u:unknown)=>typeof u==="string"))}catch{}
    const productUrls=urls.filter(Boolean).filter((u,i,a)=>a.indexOf(u)===i);
    for(const url of productUrls)try{
      let vh=visualHashCache.current.get(url);
      if(!vh){vh=await visualHashUrl(url);visualHashCache.current.set(url,vh)}
      const candidateVisual=visualSimilarity(item.visualHash,vh);
      visual=Math.max(visual,candidateVisual);
      if(candidateVisual>=.72){
        const incoming=await imagePixels(item.file);
        let cached=catalogPixelCache.current.get(url);
        if(!cached){cached=fetch(url).then(r=>{if(!r.ok)throw new Error("Image du catalogue inaccessible");return r.blob()}).then(imagePixels).catch(()=>null);catalogPixelCache.current.set(url,cached)}
        const target=await cached;if(target){pixel=Math.max(pixel,pixelSimilarity(incoming,target));colorPixel=Math.max(colorPixel,pixelColorSimilarity(incoming,target));}
      }
    }catch{}
    // Keep candidates even when browser/CORS prevents reading catalog images.
    let score=visual>0?visual*.62+text*.38:text;
    if(sameBrand)score=Math.min(.94,score+.08);
    if(brandConflict&&visual<.90)score*=.55;
    // Le hash 16x16 mesure surtout la structure globale de l'emballage. Il ne doit plus
    // transformer à lui seul une Barbie ressemblante en doublon à 98-100 %.
    if(visual>=.96)score=Math.max(score,.82);
    else if(visual>=.88)score=Math.max(score,.74);
    else if(visual>=.78)score=Math.max(score,.64);
    // L'import utilise maintenant la même philosophie que le scanner CMS :
    // même marque + forte identité textuelle + forte ressemblance visuelle.
    // La couleur/forme commune des emballages d'une gamme ne suffit plus.
    const sourceName=`${suggestion.name_fr||""} ${suggestion.name_en||""}`;
    const productName=`${p.name_fr||""} ${p.name_en||""}`;
    const sourceTokens=usefulWords(sourceName),productTokens=usefulWords(productName);
    const distinctive=overlap(sourceTokens,productTokens);
    const sameArticle=!!(norm(suggestion.article_number)&&norm(suggestion.article_number)===norm(p.article_number));
    // Le hash visuel 16x16 repère très bien une famille d'emballages, mais ne suffit pas
    // à prouver l'identité du produit (ex. plusieurs Barbie/Titan Hero dans la même boîte).
    // Un score textuel élevé peut venir d'une description générique de gamme (Barbie, Titan Hero, etc.).
    // Pour une copie visuelle, exiger un identifiant exact ou des mots réellement distinctifs communs.
    const semanticIdentity=sameArticle||distinctive>=.55;
    // Une boîte blanche/rose ou une silhouette de poupée peut produire un score pixel/hash très
    // élevé entre deux SKU différents. Le visuel sert donc à TROUVER des candidats, jamais à
    // prouver seul qu'il s'agit du même produit.
    const strongPixelCopy=pixel>=.985&&visual>=.98;
    const visualCopy=semanticIdentity&&((visual>=.975&&pixel>=.94)||strongPixelCopy);
    const imageClone=visual>=.90&&pixel>=.88&&colorPixel>=.70;
    const duplicateEvidence=sameArticle||visualCopy||imageClone||(sameBrand&&visual>=.96&&text>=.78&&distinctive>=.65);
    // Toujours conserver les meilleurs candidats plausibles. Ainsi, si l'IA sait qu'une photo
    // ressemble à un article mais n'a pas assez de preuves pour déclarer un doublon, l'utilisateur
    // voit quand même la concordance possible au lieu d'un panneau vide.
    const candidateEvidence=duplicateEvidence||visual>=.68||pixel>=.72||text>=.42||(sameBrand&&(visual>=.58||text>=.30));
    if(candidateEvidence){
      if(strongPixelCopy&&semanticIdentity)score=Math.max(score,pixel);
      let kind:Match["kind"]=duplicateEvidence?"probable":"related";
      // Le pourcentage affiché doit représenter la confiance d'identité, pas seulement
      // la proximité d'emballage. Les candidats "related" restent visibles, mais un
      // Barbie/Ken différent ne doit plus apparaître artificiellement à 94 %.
      if(kind==="related"){
        const identitySignal=Math.max(sameArticle?1:0,distinctive,text*.72);
        const visualSignal=Math.max(visual*.58,pixel*.62);
        score=Math.min(.79,identitySignal*.62+visualSignal*.38);
      }else if(!sameArticle)score=Math.min(score,.94);
      let reason=duplicateEvidence?(imageClone?"Clone visuel détecté : structure + couleurs du produit concordantes":visualCopy?"Image très ressemblante + détails distinctifs concordants":"Même marque + détails distinctifs concordants + image très ressemblante"):(pixel>=.72?"Image du catalogue visuellement proche — identité non confirmée":visual>=.68?"Ressemblance visuelle — identité non confirmée":"Nom / marque proches — identité non confirmée");
      if(sameArticle){kind="certain";score=1;reason="Même numéro d’article + correspondance catalogue"}
      else if(visual>=.99&&pixel>=.975&&distinctive>=.80&&text>=.88){kind="certain";reason="Image quasi identique + plusieurs détails distinctifs concordants"}
      scored.push({product:p,score:Math.min(score,1),kind,reason})
    }
   }));
   void rows;
  }
  const rank={certain:3,probable:2,related:1}; return scored.sort((a,b)=>rank[b.kind]-rank[a.kind]||b.score-a.score).slice(0,8)
 }
 async function analyzeAll(){setWorking(true);const queue=unique.filter(i=>i.state!=="done");setAiProgress({done:0,total:queue.length,current:"Préparation…"});let completed=0;for(const item of queue){try{setAiProgress({done:completed,total:queue.length,current:item.file.name});setItems(a=>a.map(x=>x.id===item.id?{...x,state:"uploading"}:x));const prepared=await prepareUpload(item.file);const data=new FormData();data.append("file",prepared);const uploaded=await request("/api/admin/upload",{method:"POST",body:data});const url=String(uploaded.url||"");setItems(a=>a.map(x=>x.id===item.id?{...x,url,state:"analyzing"}:x));let result:any;let lastError:unknown;
for(let attempt=1;attempt<=3;attempt++){
 try{
  result=await request("/api/admin/analyze-product",{method:"POST",body:JSON.stringify({image_url:url})});
  if(result?.suggestion)break;
  throw new Error("Analyse IA incomplète");
 }catch(error){
  lastError=error;
  if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*1000));
 }
}
if(!result?.suggestion)throw(lastError instanceof Error?lastError:new Error("Analyse IA impossible après 3 tentatives"));
const suggestion=result.suggestion as Row;const exactMatch=await exactCatalogMatch(item.file);const matches=await rankCatalogVisually(item,suggestion);if(exactMatch&&!matches.some(m=>String(m.product.id)===String(exactMatch.id)))matches.unshift({product:exactMatch,score:1,kind:"certain",reason:"Image identique au catalogue (comparaison des pixels)"});else if(exactMatch)matches.sort((a,b)=>Number(String(b.product.id)===String(exactMatch.id))-Number(String(a.product.id)===String(exactMatch.id)));const match=exactMatch?matches.find(m=>String(m.product.id)===String(exactMatch.id)):matches[0];const suggestionWithVisibility={...suggestion,visible_qc:targetVisibility==="qc"||targetVisibility==="both",visible_conakry:targetVisibility==="conakry"||targetVisibility==="both"};const done={...item,url,suggestion:suggestionWithVisibility,group:groupKey(suggestionWithVisibility),catalogMatch:match?.product,catalogScore:match?.score,catalogMatches:matches,state:"done" as const};setItems(a=>regroup(a.map(x=>x.id===item.id?done:x)))}catch(error){setItems(a=>a.map(x=>x.id===item.id?{...x,state:"error",error:error instanceof Error?error.message:"Erreur"}:x))}finally{completed++;setAiProgress({done:completed,total:queue.length,current:item.file.name})}}setWorking(false);setAiProgress(p=>({...p,current:"Terminé"}))}
 function groupSelectedImages(){
  const selected=items.filter(x=>selectedImportItems.has(x.id)&&!x.duplicate);
  if(selected.length<2){window.alert("Sélectionne au moins 2 images à assembler.");return}
  const gid=crypto.randomUUID();const base=selected.find(x=>x.suggestion)?.suggestion;
  setItems(current=>current.map(x=>{const pos=selected.findIndex(s=>s.id===x.id);return pos>=0?{...x,group:gid,suggestion:x.suggestion||base,imageOrder:pos,isPrimary:pos===0}:x}));
 }
 function ungroupSelectedImages(){setItems(current=>current.map(x=>selectedImportItems.has(x.id)?{...x,group:x.id,imageOrder:0,isPrimary:true}:x))}
 function setPrimaryImage(item:Item){if(!item.group)return;setItems(current=>current.map(x=>x.group===item.group?{...x,isPrimary:x.id===item.id,imageOrder:x.id===item.id?0:(x.imageOrder??1)+1}:x))}
 function moveGroupImage(item:Item,direction:-1|1){
  if(!item.group)return;setItems(current=>{const members=current.filter(x=>x.group===item.group).sort((a,b)=>(a.imageOrder??999)-(b.imageOrder??999));const index=members.findIndex(x=>x.id===item.id),target=index+direction;if(index<0||target<0||target>=members.length)return current;const a=members[index],b=members[target],ao=a.imageOrder??index,bo=b.imageOrder??target;return current.map(x=>x.id===a.id?{...x,imageOrder:bo}:x.id===b.id?{...x,imageOrder:ao}:x)});
 }
 function removeFromGroup(item:Item){setItems(current=>current.map(x=>x.id===item.id?{...x,group:x.id,imageOrder:0,isPrimary:true}:x))}
 async function retryAnalysis(item:Item){
  if(working)return;
  setWorking(true);setAiProgress({done:0,total:1,current:item.file.name});
  try{
    setItems(a=>a.map(x=>x.id===item.id?{...x,state:"analyzing",error:undefined}:x));
    let url=String(item.url||"");
    if(!url){const prepared=await prepareUpload(item.file);const data=new FormData();data.append("file",prepared);const uploaded=await request("/api/admin/upload",{method:"POST",body:data});url=String(uploaded.url||"")}
    let result:any,lastError:unknown;
    for(let attempt=1;attempt<=3;attempt++){try{result=await request("/api/admin/analyze-product",{method:"POST",body:JSON.stringify({image_url:url})});if(result?.suggestion)break;throw new Error("Analyse IA incomplète")}catch(error){lastError=error;if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*1000))}}
    if(!result?.suggestion)throw(lastError instanceof Error?lastError:new Error("Analyse IA impossible après 3 tentatives"));
    const suggestion=result.suggestion as Row;const exactMatch=await exactCatalogMatch(item.file);const matches=await rankCatalogVisually({...item,url},suggestion);if(exactMatch&&!matches.some(m=>String(m.product.id)===String(exactMatch.id)))matches.unshift({product:exactMatch,score:1,kind:"certain",reason:"Image identique au catalogue (comparaison des pixels)"});else if(exactMatch)matches.sort((a,b)=>Number(String(b.product.id)===String(exactMatch.id))-Number(String(a.product.id)===String(exactMatch.id)));const match=exactMatch?matches.find(m=>String(m.product.id)===String(exactMatch.id)):matches[0];
    const suggestionWithVisibility={...suggestion,visible_qc:targetVisibility==="qc"||targetVisibility==="both",visible_conakry:targetVisibility==="conakry"||targetVisibility==="both"};
    const done={...item,url,suggestion:suggestionWithVisibility,group:groupKey(suggestionWithVisibility),catalogMatch:match?.product,catalogScore:match?.score,catalogMatches:matches,state:"done" as const,error:undefined};
    setItems(a=>regroup(a.map(x=>x.id===item.id?done:x)));
  }catch(error){setItems(a=>a.map(x=>x.id===item.id?{...x,state:"error",error:error instanceof Error?error.message:"Erreur"}:x))}
  finally{setAiProgress({done:1,total:1,current:"Terminé"});setWorking(false)}
 }
 function update(id:string,field:string,value:string){setItems(a=>a.map(i=>i.id===id&&i.suggestion?{...i,suggestion:{...i.suggestion,[field]:value},group:groupKey({...i.suggestion,[field]:value})}:i))}
 function removeItem(id:string){setItems(a=>{const item=a.find(x=>x.id===id);if(item?.preview)URL.revokeObjectURL(item.preview);return a.filter(x=>x.id!==id)})}
 function cancelBatch(){if(!window.confirm("Annuler cette analyse et retirer toutes les photos sélectionnées ?"))return;items.forEach(item=>URL.revokeObjectURL(item.preview));setItems([])}
 function removeCatalogProductsFromReview(ids:Set<string>){setItems(a=>a.map(x=>{const removedCurrent=!!x.catalogMatch&&ids.has(String(x.catalogMatch.id));return {...x,catalogMatches:(x.catalogMatches||[]).filter(m=>!ids.has(String(m.product.id))),...(removedCurrent?{catalogMatch:undefined,catalogScore:undefined,matchAccepted:false,matchRejected:false}:{})}}))}
 async function deleteSelectedDuplicates(){
  const ids=[...selectedDuplicates];if(!ids.length)return;
  if(!window.confirm(`Supprimer définitivement ${ids.length} doublon(s) sélectionné(s) du catalogue ?`))return;
  setWorking(true);try{for(const id of ids)await request(`/api/admin/products?id=${encodeURIComponent(id)}`,{method:"DELETE"});const removed=new Set(ids);removeCatalogProductsFromReview(removed);setSelectedDuplicates(new Set());await onDone()}finally{setWorking(false)}
 }
 async function deleteMatchedProduct(item:Item){
  const p=item.catalogMatch;if(!p?.id)return;
  if(!window.confirm(`Supprimer définitivement « ${String(p.name_fr||p.article_number||"ce produit")} » du catalogue ?`))return;
  setWorking(true);try{await request(`/api/admin/products?id=${encodeURIComponent(String(p.id))}`,{method:"DELETE"});removeCatalogProductsFromReview(new Set([String(p.id)]));setSelectedDuplicates(prev=>{const next=new Set(prev);next.delete(String(p.id));return next});await onDone()}finally{setWorking(false)}
 }
 async function replaceMatchedImage(item:Item){
  const p=item.catalogMatch;if(!p?.id||!item.url)return;
  if(!window.confirm(`Remplacer l’image principale de « ${String(p.name_fr||p.article_number||"ce produit")} » par la photo analysée ?`))return;
  setWorking(true);try{await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...p,image_url:item.url})});await onDone();setItems(a=>a.map(x=>x.id===item.id?{...x,catalogMatch:{...p,image_url:item.url},matchAccepted:true,matchRejected:false}:x))}finally{setWorking(false)}
 }
 async function attachToExistingProduct(item:Item,product:Row,makePrimary:boolean){
  if(!item.url||!product.id)return;
  let extra:string[]=[];try{const parsed=JSON.parse(String(product.images_json||"[]"));if(Array.isArray(parsed))extra=parsed.filter((u:unknown):u is string=>typeof u==="string"&&!!u)}catch{}
  const currentPrimary=String(product.image_url||"");
  const all=[currentPrimary,...extra].filter(Boolean).filter((u,i,a)=>a.indexOf(u)===i&&u!==item.url);
  const nextPrimary=makePrimary?item.url:(currentPrimary||item.url);
  const nextExtra=makePrimary?all:all.filter(u=>u!==nextPrimary).concat(item.url).filter((u,i,a)=>a.indexOf(u)===i);
  if(!window.confirm(`${makePrimary?"Mettre cette photo en photo principale de":"Ajouter cette photo à"} « ${String(product.name_fr||product.article_number||"cet article")} » ?`))return;
  setWorking(true);try{await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...product,image_url:nextPrimary,images_json:JSON.stringify(nextExtra)})});setItems(a=>a.map(x=>x.id===item.id?{...x,matchAccepted:true}:x));setAttachItemId(null);setAttachSearch("");await onDone()}finally{setWorking(false)}
 }
 function isCreatableItem(x:Item){const unresolved=!!x.catalogMatch&&!x.matchRejected&&x.catalogMatches?.some(m=>String(m.product.id)===String(x.catalogMatch?.id)&&(m.kind==="certain"||m.kind==="probable"));return !x.duplicate&&x.state==="done"&&!!x.suggestion&&!!x.url&&!x.error&&!x.matchAccepted&&!unresolved}
 function importPreview(){
 const eligible=items.filter(isCreatableItem);
 const groupMap=new Map<string,Item[]>();for(const item of eligible){const key=item.group||item.id;groupMap.set(key,[...(groupMap.get(key)||[]),item])}
 const articleCount=groupMap.size,imageCount=eligible.length,multi=[...groupMap.values()].filter(g=>g.length>1).length,pending=targetVisibility==="hidden"?articleCount:0;
 return {articleCount,imageCount,multi,pending,failed};
}
async function createAll(){const exactDuplicates=items.filter(x=>!x.duplicate&&x.state==="done"&&!x.matchRejected&&x.catalogMatches?.some(m=>m.reason==="Image identique au catalogue (comparaison des pixels)"));if(exactDuplicates.length){window.alert(`${exactDuplicates.length} photo(s) est/sont identique(s) à une image du catalogue. Pour chacune, choisis clairement : « Ce n’est pas le même produit », « Remplacer par la nouvelle image » ou « Ajouter à un article existant ».`);return}if(!allAnalyzed){window.alert("Enregistrement bloqué : toutes les photos doivent réussir leur analyse IA avant l’importation.");return}const unresolved=items.filter(x=>!x.duplicate&&x.state==="done"&&x.catalogMatch&&!x.matchAccepted&&!x.matchRejected&&x.catalogMatches?.some(m=>String(m.product.id)===String(x.catalogMatch?.id)&&(m.kind==="certain"||m.kind==="probable")));if(unresolved.length){window.alert(`Enregistrement bloqué : ${unresolved.length} doublon(s) probable(s) ou certain(s) doivent être confirmés ou rejetés avant de créer de nouvelles fiches.`);return}const summary=importPreview();const ok=window.confirm(`Résumé avant enregistrement\n\n${summary.articleCount} article(s) seront créés\n${summary.imageCount} photo(s) au total\n${summary.multi} article(s) avec plusieurs images\n${summary.pending} article(s) en attente / masqués\n${summary.failed} analyse(s) en échec\n\nContinuer l’enregistrement ?`);if(!ok)return;setWorking(true);try{const done=items.filter(isCreatableItem);const groups=new Map<string,Item[]>();for(const item of done){const key=item.group||item.id;groups.set(key,[...(groups.get(key)||[]),item])}let created=0;const createdProducts:{id:string;article:string;name:string;images:number}[]=[];for(const group of groups.values()){const ordered=[...group].sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)||(a.imageOrder??999)-(b.imageOrder??999));const first=ordered[0];const urls=ordered.map(x=>x.url!).filter(Boolean);const s=first.suggestion!;const createdRow=await request("/api/admin/products",{method:"POST",body:JSON.stringify({name_fr:String(s.name_fr||"Nouveau produit"),name_en:String(s.name_en||""),description_fr:String(s.description_fr||""),description_en:String(s.description_en||""),category:String(s.category||"eveil"),brand:String(s.brand||""),ages:String(s.ages||"3+"),material:String(s.material||""),dimensions:String(s.dimensions||""),image_url:urls[0],images_json:JSON.stringify(urls.slice(1)),price_qc:0,price_conakry:0,stock_qc:0,stock_conakry:0,visible_qc:targetVisibility==="qc"||targetVisibility==="both",visible_conakry:targetVisibility==="conakry"||targetVisibility==="both",visible:targetVisibility!=="hidden",status:"available",variants_json:"[]"})});createdProducts.push({id:String(createdRow.id||""),article:String(createdRow.article_number||""),name:String(s.name_fr||"Nouveau produit"),images:urls.length});created++}await onDone();if(created===0){window.alert("Aucune nouvelle fiche à enregistrer. Si la correspondance proposée est mauvaise, clique « Ce n’est PAS le même produit » avant d’enregistrer.");return}setImportResult({created:createdProducts,visibility:targetVisibility});setItems([]);setSelectedImportItems(new Set());requestAnimationFrame(()=>requestAnimationFrame(()=>{window.scrollTo({top:0,left:0,behavior:"auto"});document.documentElement.scrollTop=0;document.body.scrollTop=0;const scrollers=Array.from(document.querySelectorAll<HTMLElement>("main,.cms-main,.admin-main,[data-admin-scroll]"));for(const el of scrollers)el.scrollTop=0}))}catch(error){window.alert(error instanceof Error?error.message:"Échec de l’enregistrement des produits.");throw error}finally{setWorking(false)}}
 const duplicates=items.filter(i=>i.duplicate).length,ready=items.filter(i=>!i.duplicate&&i.state==="done"&&i.suggestion&&i.url&&!i.error).length,failed=items.filter(i=>!i.duplicate&&i.state==="error").length,allAnalyzed=items.filter(i=>!i.duplicate).length>0&&items.filter(i=>!i.duplicate).every(i=>i.state==="done"&&!!i.suggestion&&!!i.url&&!i.error),groups=new Set(items.filter(i=>i.group).map(i=>i.group)).size;
 return <section className="cms-ai-batch">
  <div style={{position:"fixed",top:86,left:218,right:24,zIndex:9990,display:"grid",gridTemplateColumns:"minmax(240px,1fr) auto",gap:10,padding:"10px 12px",border:"1px solid #dce6eb",borderRadius:12,background:"#fff",boxShadow:"0 6px 18px rgba(18,52,77,.14)"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
      <input className="cms-search" placeholder="Rechercher un produit…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 320px",minWidth:180,maxWidth:460}} />
      <button className="cms-secondary" disabled={busy} onClick={synchronize}>↻ Catalogue</button>
      <button className="cms-secondary" onClick={add}>+ Produit manuel</button>
      <button type="button" className="cms-secondary" disabled={duplicateScanning||busy||working} onClick={()=>void scanDuplicates()}>{duplicateScanning?`⌛ Doublons ${duplicateProgress.total?Math.round(duplicateProgress.done/duplicateProgress.total*100):0}%`:"⌕ Vérifier les doublons"}</button>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8}}>
      <label className="cms-primary cms-ai-file" style={{margin:0}}>1 · Choisir les photos<input type="file" accept="image/*" multiple disabled={busy||working} onChange={e=>void choose(e.target.files)}/></label>
      {items.length>0&&<><button className="cms-primary" disabled={working||unique.length===0} onClick={()=>void analyzeAll()}>2 · Analyser</button><button className="cms-primary" disabled={working||ready===0||!allAnalyzed} title={!allAnalyzed?"Toutes les photos doivent réussir leur analyse avant l’importation":undefined} onClick={()=>void createAll()}>3 · Enregistrer</button><button type="button" className="cms-danger" disabled={working} onClick={cancelBatch}>Annuler</button></>}
    </div>
    {items.length>0&&<div style={{gridColumn:"1 / -1",display:"flex",alignItems:"center",gap:10,paddingTop:8,borderTop:"1px solid #e4ecef",flexWrap:"wrap"}}>
      <strong style={{fontSize:12,color:"#536b7a"}}>OPTIONS DU LOT</strong>
      <label title="Les fiches seront enregistrées dans le CMS mais resteront masquées du site jusqu’à leur activation." style={{display:"flex",alignItems:"center",gap:6,padding:"7px 9px",border:"1px solid #dce6eb",borderRadius:8,background:standby?"#eef7ff":"#fff",fontWeight:700,cursor:"pointer"}}><input type="checkbox" checked={standby} onChange={e=>setStandby(e.target.checked)}/><span>En attente</span></label>
      <label style={{display:"flex",alignItems:"center",gap:6,fontWeight:700}}>Visibilité <select value={targetVisibility} onChange={e=>{const value=e.target.value as "hidden"|"qc"|"conakry"|"both";setTargetVisibility(value);setItems(a=>a.map(x=>x.suggestion?{...x,suggestion:{...x.suggestion,visible_qc:value==="qc"||value==="both",visible_conakry:value==="conakry"||value==="both"}}:x))}} style={{padding:"7px 9px",border:"1px solid #b9cbd5",borderRadius:8}}><option value="hidden">Masqué</option><option value="qc">Québec</option><option value="conakry">Conakry</option><option value="both">Québec + Conakry</option></select></label>
      <button type="button" className="cms-secondary" onClick={()=>setShowSelectedOnly(v=>!v)}>{showSelectedOnly?"Afficher toutes":"Voir la sélection"}</button>
      <span style={{marginLeft:"auto",fontSize:12,color:"#536b7a"}}>Sélectionne plusieurs photos plus bas pour les assembler en un article.</span>
    </div>}
  </div>
  <div style={{height:items.length>0?126:76}} aria-hidden="true" />
  {importResult&&<div style={{margin:"4px 0 18px",padding:16,border:"2px solid #9bc7aa",borderRadius:12,background:"#f3fbf5"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><strong style={{fontSize:18}}>✓ Import terminé · {importResult.created.length} article(s) créé(s)</strong><div style={{marginTop:4,color:"#536b7a"}}>Les nouvelles fiches restent accessibles ici pour contrôle immédiat.</div></div><button type="button" className="cms-secondary" onClick={()=>setImportResult(null)}>Fermer</button></div><div style={{display:"grid",gap:7,marginTop:12}}>{importResult.created.map(p=><div key={p.id} style={{display:"flex",gap:12,alignItems:"center",padding:"8px 10px",background:"#fff",borderRadius:8,border:"1px solid #dbe8df"}}><b>{p.article||"Nouveau"}</b><span style={{flex:1}}>{p.name}</span><span>{p.images} photo{p.images>1?"s":""}</span><span>{importResult.visibility==="hidden"?"En attente":importResult.visibility==="both"?"Québec + Conakry":importResult.visibility==="qc"?"Québec":"Conakry"}</span></div>)}</div></div>}
  <div className="cms-ai-batch-head">
    <div><h3>Analyse des produits par IA</h3><p>Balancez un lot de photos : l’IA analyse chaque photo et détecte les doublons du catalogue. Pour plusieurs vues du même produit, sélectionnez simplement les photos concernées puis cliquez « Assembler en 1 article ».</p></div>
  </div>{working&&aiProgress.total>0&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",margin:"10px 0",border:"1px solid #b9cbd5",borderRadius:10,background:"#f8fbfc"}}><span style={{fontSize:24}}>⌛</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",gap:12,fontWeight:800}}><span>Analyse IA en cours · {aiProgress.current}</span><span>{Math.round(aiProgress.done/aiProgress.total*100)}% · {aiProgress.done}/{aiProgress.total}</span></div><div style={{height:9,borderRadius:999,background:"#dce6eb",overflow:"hidden",marginTop:7}}><div style={{height:"100%",width:`${aiProgress.done/aiProgress.total*100}%`,background:"#123f61",transition:"width .25s"}} /></div></div></div>}
  {items.length>0&&<>
    <div className="cms-ai-summary"><strong>Nouvelles photos :</strong> {items.length} · {failed>0&&<><strong style={{color:"#a52828"}}>{failed} analyse(s) en échec — importation bloquée</strong> · </>} <strong>{duplicates}</strong> doublon(s) éliminé(s) · <strong>{unique.length}</strong> à analyser · <strong>{groups}</strong> produit(s) regroupé(s) · sélectionne les photos d’un même produit puis clique « Assembler en 1 article » · <strong>{ready}</strong> image(s) prête(s)</div>
    <div style={{display:"flex",gap:10,alignItems:"center",marginTop:16,flexWrap:"wrap"}}><button type="button" className="cms-secondary" disabled={working||items.length===0} onClick={()=>setSelectedImportItems(new Set(items.map(i=>i.id)))}>Tout sélectionner</button><button type="button" className="cms-secondary" disabled={working||selectedImportItems.size===0} onClick={()=>setSelectedImportItems(new Set())}>Tout désélectionner</button><button type="button" className="cms-primary" disabled={working||selectedImportItems.size<2} onClick={groupSelectedImages}>🖼 Assembler en 1 article ({selectedImportItems.size})</button><button type="button" className="cms-secondary" disabled={working||selectedImportItems.size===0} onClick={ungroupSelectedImages}>Séparer les images</button><button type="button" className="cms-danger" disabled={working||selectedImportItems.size===0} onClick={()=>{if(!window.confirm(`Supprimer ${selectedImportItems.size} élément(s) sélectionné(s) de cette analyse ?`))return;setItems(a=>{for(const x of a)if(selectedImportItems.has(x.id)&&x.preview)URL.revokeObjectURL(x.preview);return a.filter(x=>!selectedImportItems.has(x.id))});setSelectedImportItems(new Set())}}>🗑 Supprimer la sélection ({selectedImportItems.size})</button></div><div style={{display:"grid",gap:24,marginTop:18}}>
      {items.filter(item=>!showSelectedOnly||selectedImportItems.has(item.id)).map(item=><article key={item.id} className={item.duplicate?"is-duplicate":""} style={{position:"relative",display:"grid",gridTemplateColumns:"420px minmax(0,1fr)",gap:24,padding:18,border:selectedImportItems.has(item.id)?"3px solid #2676a8":"1px solid #dce6eb",borderRadius:12,background:"#fff"}}><label style={{position:"absolute",zIndex:4,left:28,top:28,display:"flex",gap:7,alignItems:"center",padding:"7px 9px",background:"rgba(255,255,255,.95)",borderRadius:8,fontWeight:700}}><input type="checkbox" checked={selectedImportItems.has(item.id)} onChange={e=>setSelectedImportItems(prev=>{const next=new Set(prev);e.target.checked?next.add(item.id):next.delete(item.id);return next})}/> Sélectionner</label>
        <button type="button" onClick={()=>setZoomImage(item.preview)} title="Agrandir la photo analysée" style={{width:420,height:420,padding:0,border:"1px solid #dfe7ea",borderRadius:12,background:"#fff",overflow:"hidden",cursor:"zoom-in"}}>
          <img src={item.preview} alt="Photo analysée" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}}/>
        </button>
        <div style={{display:"grid",alignContent:"start",gap:10,minWidth:0}}>
          <strong>{item.file.name}</strong>
          {item.duplicate?<span>{item.duplicateKind==="exact"?"Doublon exact":"Doublon visuel probable"} — ignoré</span>:item.suggestion?<>
            <label><strong>Nom français</strong><input value={String(item.suggestion.name_fr||"")} onChange={e=>update(item.id,"name_fr",e.target.value)}/></label>
            <label><strong>Description française</strong><textarea value={String(item.suggestion.description_fr||"")} onChange={e=>update(item.id,"description_fr",e.target.value)}/></label>
            <details><summary style={{cursor:"pointer",fontWeight:700}}>English / Anglais</summary><div style={{display:"grid",gap:10,marginTop:10}}><label><strong>English name</strong><input value={String(item.suggestion.name_en||"")} onChange={e=>update(item.id,"name_en",e.target.value)}/></label><label><strong>English description</strong><textarea value={String(item.suggestion.description_en||"")} onChange={e=>update(item.id,"description_en",e.target.value)}/></label></div></details>
            <label><strong>Catégorie</strong><select value={String(item.suggestion.category||"eveil")} onChange={e=>update(item.id,"category",e.target.value)}>{Object.entries(categories).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"1px solid #d9e3e8",borderRadius:9,background:"#f8fafb",maxWidth:680,flexWrap:"wrap"}}><span style={{fontWeight:700}}>Visibilité</span><select value={(item.suggestion.visible_qc===true||String(item.suggestion.visible_qc)=="true")&&(item.suggestion.visible_conakry===true||String(item.suggestion.visible_conakry)=="true")?"both":item.suggestion.visible_qc===true||String(item.suggestion.visible_qc)=="true"?"qc":item.suggestion.visible_conakry===true||String(item.suggestion.visible_conakry)=="true"?"conakry":"hidden"} onChange={e=>{const v=e.target.value;setItems(a=>a.map(x=>x.id===item.id&&x.suggestion?{...x,suggestion:{...x.suggestion,visible_qc:v==="qc"||v==="both",visible_conakry:v==="conakry"||v==="both"}}:x))}} style={{padding:"7px 10px",border:"1px solid #b9cbd5",borderRadius:8,fontWeight:700}}><option value="hidden">Masqué partout</option><option value="qc">Québec seulement</option><option value="conakry">Conakry seulement</option><option value="both">Québec + Conakry</option></select></div>
            {item.catalogMatch&&item.catalogMatches?.some(m=>String(m.product.id)===String(item.catalogMatch?.id))?<><section style={{display:"grid",gridTemplateColumns:"300px minmax(0,1fr)",gap:24,alignItems:"start",padding:20,marginTop:6,border:"3px solid #5b9fc7",borderRadius:12,background:"#eef7fc"}}>
              <button type="button" onClick={()=>setZoomImage(String(item.catalogMatch!.image_url||item.preview))} style={{width:300,height:300,padding:0,border:"1px solid #bdd5e3",borderRadius:10,background:"#fff",overflow:"hidden",cursor:"zoom-in"}}>
                {item.catalogMatch.image_url?<img src={String(item.catalogMatch.image_url)} alt="Produit déjà présent" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}}/>:<span>Aucune image existante</span>}
              </button>
              <div style={{display:"grid",alignContent:"center",gap:10,fontSize:15,color:"#17364a"}}>
                <strong style={{fontSize:20}}>{item.catalogMatches?.find(m=>String(m.product.id)===String(item.catalogMatch?.id))?.kind==="certain"?"DOUBLON CERTAIN":item.catalogMatches?.find(m=>String(m.product.id)===String(item.catalogMatch?.id))?.kind==="probable"?"DOUBLON PROBABLE — À VÉRIFIER":"CORRESPONDANCE POSSIBLE — À VÉRIFIER"}</strong>
                <b style={{fontSize:18}}>{String(item.catalogMatch.name_fr||"Produit existant")}</b>
                <span>{String(item.catalogMatch.name_en||"")}</span>
                <span><b>No {String(item.catalogMatch.article_number||"—")}</b></span>
                <span>{categories[String(item.catalogMatch.category)]||String(item.catalogMatch.category||"")}</span>
                <span>Boutique : {item.catalogMatch.visible_qc?"Québec ":""}{item.catalogMatch.visible_conakry?"Conakry":""}</span>
                <span>Confiance : {Math.round((item.catalogScore||0)*100)} %</span><span><b>Pourquoi :</b> {item.catalogMatches?.find(m=>String(m.product.id)===String(item.catalogMatch?.id))?.reason||"Comparaison catalogue"}</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:8}}>
                  <button type="button" className="cms-primary" onClick={()=>setZoomImage(String(item.catalogMatch!.image_url||item.preview))}>Voir l’image existante en grand</button>
                  <button type="button" className="cms-primary" title="Confirme que la photo importée correspond à cet article existant." onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,matchAccepted:true,matchRejected:false}:x))}>✓ C’est le même produit</button>
                  <button type="button" className="cms-secondary" title="Refuse cette proposition de doublon. La photo importée reste un produit distinct et pourra être enregistrée comme nouvelle fiche." onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,matchRejected:true,matchAccepted:false}:x))}>✕ Ce n’est pas le même produit</button>
                  <button type="button" className="cms-secondary" disabled={working||!item.url} title="Conserve ce produit dans le catalogue et remplace son image actuelle par la photo que tu es en train d’importer." onClick={()=>void replaceMatchedImage(item)}>↻ Remplacer par la nouvelle image</button>
                  <button type="button" className="cms-danger" disabled={working} title="Supprime du catalogue le produit correspondant à l’image affichée juste au-dessus." onClick={()=>void deleteMatchedProduct(item)}>🗑 Supprimer ce doublon</button>
                </div>
                <small style={{color:"#536b7a"}}>Les deux actions concernent le produit affiché ci-dessus. « Remplacer » garde sa fiche et change seulement son image; « Supprimer » retire cette fiche du catalogue.</small>
                {item.matchRejected&&<strong style={{color:"#a33"}}>Correspondance refusée — cette photo pourra être créée comme nouveau produit.</strong>}
                {item.matchAccepted&&<strong>Correspondance confirmée manuellement.</strong>}
              </div>
            </section>{(item.catalogMatches?.length||0)>1&&<div style={{marginTop:18,padding:16,border:"2px solid #cbdbe4",borderRadius:12,background:"#f8fbfd"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><strong style={{fontSize:18}}>Correspondances trouvées ({item.catalogMatches!.length})</strong>{selectedDuplicates.size>0&&<button type="button" className="cms-danger" disabled={working} onClick={()=>void deleteSelectedDuplicates()}>🗑 Supprimer les doublons sélectionnés ({selectedDuplicates.size})</button>}</div><div style={{display:"flex",gap:10,alignItems:"center",margin:"10px 0 12px",flexWrap:"wrap"}}><input type="search" value={matchSearch} onChange={e=>setMatchSearch(e.target.value)} placeholder="Rechercher dans TOUT le catalogue : nom, article, marque, catégorie…" style={{minWidth:360,maxWidth:620,width:"100%",padding:"11px 13px",border:"1px solid #b9cbd5",borderRadius:9,fontSize:15}}/>{matchSearch&&<button type="button" className="cms-secondary" onClick={()=>setMatchSearch("")}>Effacer</button>}</div><p style={{margin:"5px 0 12px"}}>Clique sur une image pour la comparer en grand avec la photo importée.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:14}}>{(matchSearch.trim()?catalogProducts.map(product=>({product,score:item.catalogMatches?.find(m=>String(m.product.id)===String(product.id))?.score||0})).filter(m=>{const q=norm(matchSearch);return norm(String(m.product.name_fr||"")+" "+String(m.product.name_en||"")+" "+String(m.product.article_number||"")+" "+String(m.product.brand||"")+" "+String(m.product.category||"")+" "+String(m.product.description_fr||"")+" "+String(m.product.description_en||"")).includes(q)}).sort((a,b)=>b.score-a.score):item.catalogMatches!).map((m,i)=><div key={String(m.product.id||i)} style={{position:"relative"}}><label style={{position:"absolute",zIndex:2,left:10,top:10,display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,.94)",fontWeight:700,cursor:"pointer"}}><input type="checkbox" checked={selectedDuplicates.has(String(m.product.id))} onChange={e=>setSelectedDuplicates(prev=>{const next=new Set(prev);const id=String(m.product.id);e.target.checked?next.add(id):next.delete(id);return next})}/> Sélectionner</label><button type="button" title="Supprimer ce doublon" aria-label="Supprimer ce doublon" disabled={working} onClick={e=>{e.stopPropagation();void deleteMatchedProduct({...item,catalogMatch:m.product,catalogScore:m.score})}} style={{position:"absolute",zIndex:3,right:10,top:10,width:38,height:38,padding:0,border:"1px solid #d8b3b3",borderRadius:9,background:"#fff",fontSize:20,lineHeight:1,cursor:"pointer"}}>🗑</button><button type="button" key={String(m.product.id||i)} onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,catalogMatch:m.product,catalogScore:m.score,matchRejected:false,matchAccepted:false}:x))} style={{display:"grid",gap:8,padding:10,textAlign:"left",border:m.product.id===item.catalogMatch?.id?"3px solid #2676a8":"1px solid #cbdbe4",borderRadius:10,background:"#fff",cursor:"pointer"}}>{m.product.image_url?<img src={String(m.product.image_url)} alt={String(m.product.name_fr||"")} style={{width:"100%",height:210,objectFit:"contain",background:"#fff"}}/>:<div style={{height:210,display:"grid",placeItems:"center"}}>Aucune image</div>}<b>{String(m.product.name_fr||m.product.article_number||"Produit")}</b><span>No {String(m.product.article_number||"—")}</span><span>{m.kind==="certain"?"Doublon certain":m.kind==="probable"?"Doublon probable":"Correspondance possible"} · {Math.round(m.score*100)} %</span><small>{m.reason}</small></button></div>)}</div></div>}</>:<span>{item.group&&items.filter(x=>x.group===item.group).length>1?`Même produit : ${items.filter(x=>x.group===item.group).length} photos`:"Produit unique"}</span>}
            
          </>:<span>{item.state==="error"?item.error:item.state==="ready"?"Prête à analyser":"Analyse en cours…"}</span>}
          {item.state==="done"&&item.url&&<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:4}}>
            <button type="button" className="cms-secondary" disabled={working} onClick={()=>{setAttachItemId(v=>v===item.id?null:item.id);setAttachSearch("")}}>＋ Ajouter à un article existant</button>
          </div>}
          {attachItemId===item.id&&<div style={{padding:12,border:"2px solid #b9cbd5",borderRadius:10,background:"#f8fbfc",display:"grid",gap:10}}>
            <strong>Choisir l’article qui recevra cette photo</strong>
            <input type="search" autoFocus value={attachSearch} onChange={e=>setAttachSearch(e.target.value)} placeholder="Nom, marque ou numéro d’article…" style={{padding:"10px 12px",border:"1px solid #b9cbd5",borderRadius:8}}/>
            {attachSearch.trim().length<2?<small>Tape au moins 2 caractères pour rechercher.</small>:<div style={{display:"grid",gap:8,maxHeight:260,overflowY:"auto"}}>{catalogProducts.filter(p=>norm(`${p.name_fr||""} ${p.name_en||""} ${p.article_number||""} ${p.brand||""}`).includes(norm(attachSearch))).slice(0,12).map(p=><div key={String(p.id)} style={{display:"grid",gridTemplateColumns:"56px 1fr auto",gap:10,alignItems:"center",padding:8,border:"1px solid #dce6eb",borderRadius:8,background:"#fff"}}>{p.image_url?<img src={String(p.image_url)} alt="" style={{width:56,height:56,objectFit:"contain"}}/>:<span/>}<div><b>{String(p.name_fr||"Article")}</b><div style={{fontSize:12,color:"#536b7a"}}>No {String(p.article_number||"—")} · {String(p.brand||"")}</div></div><div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}><button type="button" className="cms-secondary" disabled={working} onClick={()=>void attachToExistingProduct(item,p,false)}>Ajouter la photo</button><button type="button" className="cms-primary" disabled={working} onClick={()=>void attachToExistingProduct(item,p,true)}>★ Ajouter + principale</button></div></div>)}</div>}
            <button type="button" className="cms-secondary" onClick={()=>{setAttachItemId(null);setAttachSearch("")}}>Fermer</button>
          </div>}
          {item.state==="done"&&item.group&&items.filter(x=>x.group===item.group).length>1&&<div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",padding:"9px",border:"1px solid #d7e2e7",borderRadius:9,background:"#f8fbfc"}}><strong>{item.isPrimary?"★ Photo principale":`Photo ${(item.imageOrder??0)+1}`}</strong><button type="button" className="cms-secondary" onClick={()=>setPrimaryImage(item)} disabled={item.isPrimary}>★ Principale</button><button type="button" className="cms-secondary" onClick={()=>moveGroupImage(item,-1)}>←</button><button type="button" className="cms-secondary" onClick={()=>moveGroupImage(item,1)}>→</button><button type="button" className="cms-danger" onClick={()=>removeFromGroup(item)}>Retirer du groupe</button></div>}
          {item.state==="error"&&<button type="button" className="cms-secondary" disabled={working} onClick={()=>void retryAnalysis(item)}>↻ Réessayer l’analyse</button>}<button type="button" className="cms-danger" disabled={working} onClick={()=>removeItem(item.id)}>Supprimer</button>
        </div>
      </article>)}
    </div>
    

    {zoomImage&&createPortal(<div style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:20,background:"rgba(11,23,36,.94)"}} onClick={()=>setZoomImage(null)}><button type="button" onClick={()=>setZoomImage(null)} style={{position:"fixed",right:24,top:20,width:50,height:50,border:0,borderRadius:"50%",fontSize:32,cursor:"pointer"}}>×</button><img src={zoomImage} alt="Aperçu agrandi" style={{maxWidth:"96vw",maxHeight:"94vh",objectFit:"contain",background:"#fff"}} onClick={e=>e.stopPropagation()}/></div>,document.body)}
  </>}
 </section>
}
