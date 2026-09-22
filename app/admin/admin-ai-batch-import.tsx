"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { categories, request, type Row } from "./admin-shared";
import type { Market } from "@/lib/markets";

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
function distance(a:string,b:string){let n=0;for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]!==b[i])n++;return n+Math.abs(a.length-b.length)}
function visualSimilarity(a:string,b:string){if(!a||!b)return 0;return Math.max(0,1-distance(a,b)/Math.max(a.length,b.length))}
async function visualHashUrl(url:string){const res=await fetch(url);if(!res.ok)throw new Error("image");const blob=await res.blob();return visualHash(new File([blob],"catalog-image",{type:blob.type||"image/jpeg"}))}
function norm(v:unknown){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function groupKey(s:Row){const brand=norm(s.brand);const name=norm(s.name_fr).split(" ").filter(x=>x.length>2).slice(0,5).join("-");return `${norm(s.category)}|${brand}|${name}`}
function setScore(a:Set<string>,b:Set<string>){if(!a.size||!b.size)return 0;let same=0;for(const x of a)if(b.has(x))same++;return same/Math.min(a.size,b.size)}
function productSimilarity(a:Row,b:Row){const aw=words(`${a.name_fr||""} ${a.name_en||""} ${a.brand||""} ${a.description_fr||""}`),bw=words(`${b.name_fr||""} ${b.name_en||""} ${b.brand||""} ${b.description_fr||""}`);let s=setScore(aw,bw);if(norm(a.brand)&&norm(a.brand)===norm(b.brand))s+=.15;if(norm(a.category)&&norm(a.category)===norm(b.category))s+=.12;return Math.min(s,1)}
function regroup(items:Item[]){const done=items.filter(x=>x.state==="done"&&x.suggestion&&!x.duplicate);const assigned=new Set<string>();const groups=new Map<string,string>();for(const a of done){if(assigned.has(a.id))continue;const gid=a.id;groups.set(a.id,gid);assigned.add(a.id);for(const b of done){if(assigned.has(b.id)||a.id===b.id)continue;const textScore=productSimilarity(a.suggestion!,b.suggestion!);const visual=visualSimilarity(a.visualHash,b.visualHash);const sameBrand=!!(norm(a.suggestion!.brand)&&norm(a.suggestion!.brand)===norm(b.suggestion!.brand));const sameCategory=!!(norm(a.suggestion!.category)&&norm(a.suggestion!.category)===norm(b.suggestion!.category));/* Une marque/catégorie commune indique seulement des produits similaires. Pour fusionner plusieurs photos dans une même fiche, exiger une identité visuelle très forte. */const sameProduct=sameBrand&&sameCategory&&textScore>=.88&&visual>=.93;if(sameProduct){groups.set(b.id,gid);assigned.add(b.id)}}}return items.map(x=>groups.has(x.id)?{...x,group:groups.get(x.id)}:x)}
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
  if(brandConflict&&!article)score*=.25;
  if(!su.size||!pu.size)score=Math.min(score,.48);
  if(distinctive===0&&!article)score=Math.min(score,.32);
  let kind:Match["kind"]="related",reason=sameBrand?"Même marque / gamme à comparer":"Produit associé à comparer";
  if(article&&sameBrand){kind="probable";reason="Même marque + même numéro d’article — image à confirmer"}
  if(sameBrand)found.push({product:p,score:Math.min(score,1),kind,reason});
 }
 const rank={certain:3,probable:2,related:1};
 return found.sort((a,b)=>rank[b.kind]-rank[a.kind]||b.score-a.score).slice(0,60)
}

export function AiBatchImport({market,busy,onDone,catalogProducts,search,setSearch,synchronize,add}:{market:Market;busy:boolean;onDone:()=>Promise<void>;catalogProducts:Row[];search:string;setSearch:(value:string)=>void;synchronize:()=>void;add:()=>void}){
 const[items,setItems]=useState<Item[]>([]);const[importResult,setImportResult]=useState<{created:{id:string;article:string;name:string;images:number}[];visibility:string}|null>(null);const[selectedImportItems,setSelectedImportItems]=useState<Set<string>>(new Set());const[showSelectedOnly,setShowSelectedOnly]=useState(false);const[targetVisibility,setTargetVisibility]=useState<"hidden"|"qc"|"conakry"|"both">("hidden");const[matchSearch,setMatchSearch]=useState("");const[selectedDuplicates,setSelectedDuplicates]=useState<Set<string>>(new Set());const visualHashCache=useRef<Map<string,string>>(new Map());const[working,setWorking]=useState(false);const[aiProgress,setAiProgress]=useState({done:0,total:0,current:""});const[standby,setStandby]=useState(true);const[zoomImage,setZoomImage]=useState<string|null>(null);const unique=useMemo(()=>items.filter(i=>!i.duplicate),[items]);
 async function choose(files:FileList|null){setImportResult(null);const selected=Array.from(files||[]).filter(f=>f.type.startsWith("image/"));const seen=new Set<string>();const visual:string[]=[];const next:Item[]=[];
  for(const file of selected){const hash=await sha256(file),vh=await visualHash(file);const exact=seen.has(hash);const near=!exact&&visual.some(x=>distance(x,vh)<=18);seen.add(hash);if(!exact)visual.push(vh);/* Seul un fichier strictement identique est éliminé avant analyse. Une ressemblance visuelle n’est plus un doublon : la photo est analysée comme nouveau produit puis l’IA peut proposer de la regrouper avec une autre vue du même article. */next.push({id:crypto.randomUUID(),file,preview:URL.createObjectURL(file),hash,visualHash:vh,duplicate:exact,duplicateKind:exact?"exact":near?"visual":undefined,state:"ready"})}setItems(next);setSelectedImportItems(new Set(next.filter(x=>!x.duplicate).map(x=>x.id)));setShowSelectedOnly(false)}
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
    let visual=0;
    const url=String(p.image_url||"");
    if(url)try{
      let vh=visualHashCache.current.get(url);
      if(!vh){vh=await visualHashUrl(url);visualHashCache.current.set(url,vh)}
      visual=visualSimilarity(item.visualHash,vh)
    }catch{}
    // Keep candidates even when browser/CORS prevents reading catalog images.
    let score=visual>0?visual*.62+text*.38:text;
    if(sameBrand)score=Math.min(1,score+.12);
    if(brandConflict&&visual<.90)score*=.55;
    if(visual>=.96)score=Math.max(score,.98);
    else if(visual>=.88)score=Math.max(score,.86);
    else if(visual>=.78)score=Math.max(score,.72);
    // L'import utilise maintenant la même philosophie que le scanner CMS :
    // même marque + forte identité textuelle + forte ressemblance visuelle.
    // La couleur/forme commune des emballages d'une gamme ne suffit plus.
    const sourceName=`${suggestion.name_fr||""} ${suggestion.name_en||""}`;
    const productName=`${p.name_fr||""} ${p.name_en||""}`;
    const sourceTokens=usefulWords(sourceName),productTokens=usefulWords(productName);
    const distinctive=overlap(sourceTokens,productTokens);
    const sameArticle=!!(norm(suggestion.article_number)&&norm(suggestion.article_number)===norm(p.article_number));
    if(sameBrand&&(sameArticle||(visual>=.94&&text>=.72&&distinctive>=.55))){
      let kind:Match["kind"]="probable",reason="Même marque + identité du produit compatible + image très ressemblante";
      if(sameArticle){kind="certain";reason="Même marque + même numéro d’article"}
      else if(visual>=.97&&text>=.84&&distinctive>=.70){kind="certain";reason="Même marque + nom/contenu très similaire + image presque identique"}
      scored.push({product:p,score:Math.min(score,1),kind,reason})
    }
   }));
   void rows;
  }
  const rank={certain:3,probable:2,related:1}; return scored.filter(m=>m.kind!=="related").sort((a,b)=>rank[b.kind]-rank[a.kind]||b.score-a.score).slice(0,5)
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
const suggestion=result.suggestion as Row;const matches=await rankCatalogVisually(item,suggestion);const match=matches[0];const suggestionWithVisibility={...suggestion,visible_qc:targetVisibility==="qc"||targetVisibility==="both",visible_conakry:targetVisibility==="conakry"||targetVisibility==="both"};const done={...item,url,suggestion:suggestionWithVisibility,group:groupKey(suggestionWithVisibility),catalogMatch:match?.product,catalogScore:match?.score,catalogMatches:matches,state:"done" as const};setItems(a=>regroup(a.map(x=>x.id===item.id?done:x)))}catch(error){setItems(a=>a.map(x=>x.id===item.id?{...x,state:"error",error:error instanceof Error?error.message:"Erreur"}:x))}finally{completed++;setAiProgress({done:completed,total:queue.length,current:item.file.name})}}setWorking(false);setAiProgress(p=>({...p,current:"Terminé"}))}
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
    const suggestion=result.suggestion as Row;const matches=await rankCatalogVisually({...item,url},suggestion);const match=matches[0];
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
 function importPreview(){
 const eligible=items.filter(x=>!x.duplicate&&x.state==="done"&&x.suggestion&&x.url&&!x.error&&!x.matchAccepted);
 const groupMap=new Map<string,Item[]>();for(const item of eligible){const key=item.group||item.id;groupMap.set(key,[...(groupMap.get(key)||[]),item])}
 const articleCount=groupMap.size,imageCount=eligible.length,multi=[...groupMap.values()].filter(g=>g.length>1).length,pending=targetVisibility==="hidden"?articleCount:0;
 return {articleCount,imageCount,multi,pending,failed};
}
async function createAll(){if(!allAnalyzed){window.alert("Enregistrement bloqué : toutes les photos doivent réussir leur analyse IA avant l’importation.");return}const summary=importPreview();const ok=window.confirm(`Résumé avant enregistrement\n\n${summary.articleCount} article(s) seront créés\n${summary.imageCount} photo(s) au total\n${summary.multi} article(s) avec plusieurs images\n${summary.pending} article(s) en attente / masqués\n${summary.failed} analyse(s) en échec\n\nContinuer l’enregistrement ?`);if(!ok)return;setWorking(true);try{const done=items.filter(x=>!x.duplicate&&x.state==="done"&&x.suggestion&&x.url&&!x.error&&!x.matchAccepted);const groups=new Map<string,Item[]>();for(const item of done){const key=item.group||item.id;groups.set(key,[...(groups.get(key)||[]),item])}let created=0;const createdProducts:{id:string;article:string;name:string;images:number}[]=[];for(const group of groups.values()){const ordered=[...group].sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)||(a.imageOrder??999)-(b.imageOrder??999));const first=ordered[0];const urls=ordered.map(x=>x.url!).filter(Boolean);const s=first.suggestion!;const createdRow=await request("/api/admin/products",{method:"POST",body:JSON.stringify({name_fr:String(s.name_fr||"Nouveau produit"),name_en:String(s.name_en||""),description_fr:String(s.description_fr||""),description_en:String(s.description_en||""),category:String(s.category||"eveil"),brand:String(s.brand||""),ages:String(s.ages||"3+"),material:String(s.material||""),dimensions:String(s.dimensions||""),image_url:urls[0],images_json:JSON.stringify(urls.slice(1)),price_qc:0,price_conakry:0,stock_qc:0,stock_conakry:0,visible_qc:targetVisibility==="qc"||targetVisibility==="both",visible_conakry:targetVisibility==="conakry"||targetVisibility==="both",visible:targetVisibility!=="hidden",status:"available",variants_json:"[]"})});createdProducts.push({id:String(createdRow.id||""),article:String(createdRow.article_number||""),name:String(s.name_fr||"Nouveau produit"),images:urls.length});created++}await onDone();if(created===0){window.alert("Aucune nouvelle fiche à enregistrer. Si la correspondance proposée est mauvaise, clique « Ce n’est PAS le même produit » avant d’enregistrer.");return}setImportResult({created:createdProducts,visibility:targetVisibility});setItems([]);setSelectedImportItems(new Set());requestAnimationFrame(()=>requestAnimationFrame(()=>{window.scrollTo({top:0,left:0,behavior:"auto"});document.documentElement.scrollTop=0;document.body.scrollTop=0;const scrollers=Array.from(document.querySelectorAll<HTMLElement>("main,.cms-main,.admin-main,[data-admin-scroll]"));for(const el of scrollers)el.scrollTop=0}))}catch(error){window.alert(error instanceof Error?error.message:"Échec de l’enregistrement des produits.");throw error}finally{setWorking(false)}}
 const duplicates=items.filter(i=>i.duplicate).length,ready=items.filter(i=>!i.duplicate&&i.state==="done"&&i.suggestion&&i.url&&!i.error).length,failed=items.filter(i=>!i.duplicate&&i.state==="error").length,allAnalyzed=items.filter(i=>!i.duplicate).length>0&&items.filter(i=>!i.duplicate).every(i=>i.state==="done"&&!!i.suggestion&&!!i.url&&!i.error),groups=new Set(items.filter(i=>i.group).map(i=>i.group)).size;
 return <section className="cms-ai-batch">
  <div style={{position:"fixed",top:86,left:218,right:24,zIndex:9990,display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:"1px solid #dce6eb",borderRadius:12,background:"#fff",boxShadow:"0 6px 18px rgba(18,52,77,.14)",overflowX:"auto",whiteSpace:"nowrap"}}>
    <input className="cms-search" placeholder="Nom, marque ou numéro d’article…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 280px",minWidth:220,maxWidth:430}} />
    <button className="cms-secondary" disabled={busy} onClick={synchronize}>↻ Importer le catalogue</button>
    <button className="cms-primary" onClick={add}>+ Ajouter manuellement</button>
    <button type="button" className="cms-primary" disabled={duplicateScanning||busy||working} onClick={()=>void scanDuplicates()}>{duplicateScanning?`⌛ Doublons ${duplicateProgress.total?Math.round(duplicateProgress.done/duplicateProgress.total*100):0}%`:"⌕ Scanner les doublons du CMS"}</button>
    <label className="cms-primary cms-ai-file" style={{margin:0}}>Choisir des photos<input type="file" accept="image/*" multiple disabled={busy||working} onChange={e=>void choose(e.target.files)}/></label>
    {items.length>0&&<><label title="Les fiches seront enregistrées dans le CMS mais resteront masquées du site jusqu’à leur activation." style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",border:"1px solid #dce6eb",borderRadius:8,background:standby?"#eef7ff":"#fff",fontWeight:800,cursor:"pointer"}}><input type="checkbox" checked={standby} onChange={e=>setStandby(e.target.checked)}/><span>Mettre en attente</span></label><div style={{display:"flex",alignItems:"center",gap:6,borderLeft:"1px solid #dce6eb",paddingLeft:10}}><span style={{fontSize:12,fontWeight:800,color:"#536b7a"}}>VISIBILITÉ</span>{([["hidden","Masqué"],["qc","Québec"],["conakry","Conakry"],["both","Les 2 sites"]] as const).map(([value,label])=><button key={value} type="button" className={targetVisibility===value?"cms-primary":"cms-secondary"} onClick={()=>{setTargetVisibility(value);setItems(a=>a.map(x=>x.suggestion?{...x,suggestion:{...x.suggestion,visible_qc:value==="qc"||value==="both",visible_conakry:value==="conakry"||value==="both"}}:x))}} style={{padding:"9px 11px"}}>{label}</button>)}</div><button type="button" className="cms-secondary" onClick={()=>setShowSelectedOnly(v=>!v)}>{showSelectedOnly?"Afficher toutes":"Afficher seulement la sélection"}</button><button type="button" className="cms-danger" disabled={working} onClick={cancelBatch}>Annuler</button><button className="cms-secondary" disabled={working||unique.length===0} onClick={()=>void analyzeAll()}>Analyser avec l’IA</button><button className="cms-primary" disabled={working||ready===0||!allAnalyzed} title={!allAnalyzed?"Toutes les photos doivent réussir leur analyse avant l’importation":undefined} onClick={()=>void createAll()}>{targetVisibility==="hidden"?"Enregistrer les fiches en attente":"Enregistrer les nouveaux produits"}</button></>}
  </div>
  <div style={{height:76}} aria-hidden="true" />
  {importResult&&<div style={{margin:"4px 0 18px",padding:16,border:"2px solid #9bc7aa",borderRadius:12,background:"#f3fbf5"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><strong style={{fontSize:18}}>✓ Import terminé · {importResult.created.length} article(s) créé(s)</strong><div style={{marginTop:4,color:"#536b7a"}}>Les nouvelles fiches restent accessibles ici pour contrôle immédiat.</div></div><button type="button" className="cms-secondary" onClick={()=>setImportResult(null)}>Fermer</button></div><div style={{display:"grid",gap:7,marginTop:12}}>{importResult.created.map(p=><div key={p.id} style={{display:"flex",gap:12,alignItems:"center",padding:"8px 10px",background:"#fff",borderRadius:8,border:"1px solid #dbe8df"}}><b>{p.article||"Nouveau"}</b><span style={{flex:1}}>{p.name}</span><span>{p.images} photo{p.images>1?"s":""}</span><span>{importResult.visibility==="hidden"?"En attente":importResult.visibility==="both"?"Québec + Conakry":importResult.visibility==="qc"?"Québec":"Conakry"}</span></div>)}</div></div>}
  <div className="cms-ai-batch-head">
    <div><h3>Analyse des produits par IA</h3><p>Balancez un lot de photos : l’IA détecte les doublons, regroupe les vues d’un même produit et prépare des fiches FR/EN complètes à vérifier avant enregistrement.</p></div>
  </div>{working&&aiProgress.total>0&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",margin:"10px 0",border:"1px solid #b9cbd5",borderRadius:10,background:"#f8fbfc"}}><span style={{fontSize:24}}>⌛</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",gap:12,fontWeight:800}}><span>Analyse IA en cours · {aiProgress.current}</span><span>{Math.round(aiProgress.done/aiProgress.total*100)}% · {aiProgress.done}/{aiProgress.total}</span></div><div style={{height:9,borderRadius:999,background:"#dce6eb",overflow:"hidden",marginTop:7}}><div style={{height:"100%",width:`${aiProgress.done/aiProgress.total*100}%`,background:"#123f61",transition:"width .25s"}} /></div></div></div>}
  {items.length>0&&<>
    <div className="cms-ai-summary"><strong>Nouvelles photos :</strong> {items.length} · {failed>0&&<><strong style={{color:"#a52828"}}>{failed} analyse(s) en échec — importation bloquée</strong> · </>} <strong>{duplicates}</strong> doublon(s) éliminé(s) · <strong>{unique.length}</strong> à analyser · <strong>{groups}</strong> produit(s) regroupé(s) · l’IA propose d’assembler les photos très similaires dans une même fiche · <strong>{ready}</strong> image(s) prête(s)</div>
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
            {item.catalogMatch&&item.catalogMatches?.some(m=>String(m.product.id)===String(item.catalogMatch?.id)&&m.kind!=="related")?<><section style={{display:"grid",gridTemplateColumns:"300px minmax(0,1fr)",gap:24,alignItems:"start",padding:20,marginTop:6,border:"3px solid #5b9fc7",borderRadius:12,background:"#eef7fc"}}>
              <button type="button" onClick={()=>setZoomImage(String(item.catalogMatch!.image_url||item.preview))} style={{width:300,height:300,padding:0,border:"1px solid #bdd5e3",borderRadius:10,background:"#fff",overflow:"hidden",cursor:"zoom-in"}}>
                {item.catalogMatch.image_url?<img src={String(item.catalogMatch.image_url)} alt="Produit déjà présent" style={{display:"block",width:"100%",height:"100%",objectFit:"contain"}}/>:<span>Aucune image existante</span>}
              </button>
              <div style={{display:"grid",alignContent:"center",gap:10,fontSize:15,color:"#17364a"}}>
                <strong style={{fontSize:20}}>{item.catalogMatches?.find(m=>String(m.product.id)===String(item.catalogMatch?.id))?.kind==="certain"?"DOUBLON CERTAIN":item.catalogMatches?.find(m=>String(m.product.id)===String(item.catalogMatch?.id))?.kind==="probable"?"DOUBLON PROBABLE — À VÉRIFIER":"PRODUIT ASSOCIÉ — PAS UN DOUBLON"}</strong>
                <b style={{fontSize:18}}>{String(item.catalogMatch.name_fr||"Produit existant")}</b>
                <span>{String(item.catalogMatch.name_en||"")}</span>
                <span><b>No {String(item.catalogMatch.article_number||"—")}</b></span>
                <span>{categories[String(item.catalogMatch.category)]||String(item.catalogMatch.category||"")}</span>
                <span>Boutique : {item.catalogMatch.visible_qc?"Québec ":""}{item.catalogMatch.visible_conakry?"Conakry":""}</span>
                <span>Confiance : {Math.round((item.catalogScore||0)*100)} %</span><span><b>Pourquoi :</b> {item.catalogMatches?.find(m=>String(m.product.id)===String(item.catalogMatch?.id))?.reason||"Comparaison catalogue"}</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:8}}>
                  <button type="button" className="cms-primary" onClick={()=>setZoomImage(String(item.catalogMatch!.image_url||item.preview))}>Voir en grand</button>
                  <button type="button" className="cms-secondary" onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,matchAccepted:true,matchRejected:false}:x))}>✓ C’est le même produit</button>
                  <button type="button" className="cms-danger" onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,matchRejected:true,matchAccepted:false}:x))}>✕ Ce n’est PAS le même produit</button>
                  <button type="button" className="cms-secondary" disabled={working||!item.url} onClick={()=>void replaceMatchedImage(item)}>↻ Remplacer l’image du doublon</button>
                  <button type="button" className="cms-danger" disabled={working} onClick={()=>void deleteMatchedProduct(item)}>🗑 Supprimer le doublon du catalogue</button>
                </div>
                {item.matchRejected&&<strong style={{color:"#a33"}}>Correspondance refusée — cette photo pourra être créée comme nouveau produit.</strong>}
                {item.matchAccepted&&<strong>Correspondance confirmée manuellement.</strong>}
              </div>
            </section>{(item.catalogMatches?.filter(m=>m.kind!=="related").length||0)>1&&<div style={{marginTop:18,padding:16,border:"2px solid #cbdbe4",borderRadius:12,background:"#f8fbfd"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><strong style={{fontSize:18}}>Doublons correspondants ({item.catalogMatches!.filter(m=>m.kind!=="related").length})</strong>{selectedDuplicates.size>0&&<button type="button" className="cms-danger" disabled={working} onClick={()=>void deleteSelectedDuplicates()}>🗑 Supprimer les doublons sélectionnés ({selectedDuplicates.size})</button>}</div><div style={{display:"flex",gap:10,alignItems:"center",margin:"10px 0 12px",flexWrap:"wrap"}}><input type="search" value={matchSearch} onChange={e=>setMatchSearch(e.target.value)} placeholder="Rechercher dans TOUT le catalogue : nom, article, marque, catégorie…" style={{minWidth:360,maxWidth:620,width:"100%",padding:"11px 13px",border:"1px solid #b9cbd5",borderRadius:9,fontSize:15}}/>{matchSearch&&<button type="button" className="cms-secondary" onClick={()=>setMatchSearch("")}>Effacer</button>}</div><p style={{margin:"5px 0 12px"}}>Clique sur une image pour la comparer en grand avec la photo importée.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:14}}>{(matchSearch.trim()?catalogProducts.map(product=>({product,score:item.catalogMatches?.find(m=>String(m.product.id)===String(product.id))?.score||0})).filter(m=>{const q=norm(matchSearch);return norm(String(m.product.name_fr||"")+" "+String(m.product.name_en||"")+" "+String(m.product.article_number||"")+" "+String(m.product.brand||"")+" "+String(m.product.category||"")+" "+String(m.product.description_fr||"")+" "+String(m.product.description_en||"")).includes(q)}).sort((a,b)=>b.score-a.score):item.catalogMatches!.filter(m=>m.kind!=="related")).map((m,i)=><div key={String(m.product.id||i)} style={{position:"relative"}}><label style={{position:"absolute",zIndex:2,left:10,top:10,display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,.94)",fontWeight:700,cursor:"pointer"}}><input type="checkbox" checked={selectedDuplicates.has(String(m.product.id))} onChange={e=>setSelectedDuplicates(prev=>{const next=new Set(prev);const id=String(m.product.id);e.target.checked?next.add(id):next.delete(id);return next})}/> Sélectionner</label><button type="button" title="Supprimer ce doublon" aria-label="Supprimer ce doublon" disabled={working} onClick={e=>{e.stopPropagation();void deleteMatchedProduct({...item,catalogMatch:m.product,catalogScore:m.score})}} style={{position:"absolute",zIndex:3,right:10,top:10,width:38,height:38,padding:0,border:"1px solid #d8b3b3",borderRadius:9,background:"#fff",fontSize:20,lineHeight:1,cursor:"pointer"}}>🗑</button><button type="button" key={String(m.product.id||i)} onClick={()=>setItems(a=>a.map(x=>x.id===item.id?{...x,catalogMatch:m.product,catalogScore:m.score,matchRejected:false,matchAccepted:false}:x))} style={{display:"grid",gap:8,padding:10,textAlign:"left",border:m.product.id===item.catalogMatch?.id?"3px solid #2676a8":"1px solid #cbdbe4",borderRadius:10,background:"#fff",cursor:"pointer"}}>{m.product.image_url?<img src={String(m.product.image_url)} alt={String(m.product.name_fr||"")} style={{width:"100%",height:210,objectFit:"contain",background:"#fff"}}/>:<div style={{height:210,display:"grid",placeItems:"center"}}>Aucune image</div>}<b>{String(m.product.name_fr||m.product.article_number||"Produit")}</b><span>No {String(m.product.article_number||"—")}</span><span>{m.kind==="certain"?"Doublon certain":m.kind==="probable"?"Doublon probable":"Produit associé"} · {Math.round(m.score*100)} %</span><small>{m.reason}</small></button></div>)}</div></div>}</>:<span>{item.group&&items.filter(x=>x.group===item.group).length>1?`Même produit : ${items.filter(x=>x.group===item.group).length} photos`:"Produit unique"}</span>}
            
          </>:<span>{item.state==="error"?item.error:item.state==="ready"?"Prête à analyser":"Analyse en cours…"}</span>}
          {item.state==="done"&&item.group&&items.filter(x=>x.group===item.group).length>1&&<div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center",padding:"9px",border:"1px solid #d7e2e7",borderRadius:9,background:"#f8fbfc"}}><strong>{item.isPrimary?"★ Photo principale":`Photo ${(item.imageOrder??0)+1}`}</strong><button type="button" className="cms-secondary" onClick={()=>setPrimaryImage(item)} disabled={item.isPrimary}>★ Principale</button><button type="button" className="cms-secondary" onClick={()=>moveGroupImage(item,-1)}>←</button><button type="button" className="cms-secondary" onClick={()=>moveGroupImage(item,1)}>→</button><button type="button" className="cms-danger" onClick={()=>removeFromGroup(item)}>Retirer du groupe</button></div>}
          {item.state==="error"&&<button type="button" className="cms-secondary" disabled={working} onClick={()=>void retryAnalysis(item)}>↻ Réessayer l’analyse</button>}<button type="button" className="cms-danger" disabled={working} onClick={()=>removeItem(item.id)}>Supprimer</button>
        </div>
      </article>)}
    </div>
    

    {zoomImage&&createPortal(<div style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:20,background:"rgba(11,23,36,.94)"}} onClick={()=>setZoomImage(null)}><button type="button" onClick={()=>setZoomImage(null)} style={{position:"fixed",right:24,top:20,width:50,height:50,border:0,borderRadius:"50%",fontSize:32,cursor:"pointer"}}>×</button><img src={zoomImage} alt="Aperçu agrandi" style={{maxWidth:"96vw",maxHeight:"94vh",objectFit:"contain",background:"#fff"}} onClick={e=>e.stopPropagation()}/></div>,document.body)}
  </>}
 </section>
}
