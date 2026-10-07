import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { marketPrice, markets, type Market } from "@/lib/markets";
import { productHierarchy, sharedHierarchyDepth } from "@/lib/product-duplicate-hierarchy";
import { categories, request, type Row } from "./admin-shared";
import { AiBatchImport } from "./admin-ai-batch-import";

export function ProductsSection({ products, catalogProducts, market, busy, search, setSearch, category, setCategory, visibility, setVisibility, stock, setStock, synchronize, add, edit, adjustStock, remove, reload }: {
  products: Row[]; catalogProducts: Row[]; market: Market; busy: boolean; search: string; setSearch: (value: string) => void;
  category: string; setCategory: (value: string) => void; visibility: string; setVisibility: (value: string) => void;
  stock: string; setStock: (value: string) => void; synchronize: () => void; add: () => void;
  edit: (product: Row) => void; adjustStock: (product: Row) => void; remove: (id: string) => void; reload: () => Promise<void>;
}) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [imageSearchBusy,setImageSearchBusy]=useState(false);
  const [imageSearchResults,setImageSearchResults]=useState<Array<{product:Row;score:number}>>([]);
  const imageSearchInput=useRef<HTMLInputElement>(null);
  const [visibilityBusy, setVisibilityBusy] = useState<string | null>(null);
  const [selectedProducts,setSelectedProducts]=useState<Set<string>>(new Set());
  const [bulkBusy,setBulkBusy]=useState(false);
  const [mergeBusy,setMergeBusy]=useState(false);
  const [bulkPrice,setBulkPrice]=useState("");
  const [bulkPriceMode,setBulkPriceMode]=useState<"set"|"percent">("set");
  const [bulkVisibility,setBulkVisibility]=useState("keep");
  const [bulkCategory,setBulkCategory]=useState("keep");
  const [bulkMarket,setBulkMarket]=useState<"keep"|"qc"|"conakry"|"both"|"hidden">("keep");
  const [duplicateScan, setDuplicateScan] = useState<{groups: Array<{products:Row[];visual:number;match:number;semantic:number;legacy:number;cropped:number;name:number;distinctive:number;sameBrand:boolean;confidence:"certain"|"probable"|"review"}>; scanned: number} | null>(null);
  const [duplicateScanning, setDuplicateScanning] = useState(false);
  const [duplicateProgress, setDuplicateProgress] = useState({done:0,total:0});
  const [showReviewDuplicates,setShowReviewDuplicates]=useState(false);
  const [showDuplicateDiagnostics,setShowDuplicateDiagnostics]=useState(true);
  const [duplicateVerdicts,setDuplicateVerdicts]=useState<Record<string,"confirmed"|"rejected"|"variant">>({});
  const [savingDuplicatePairs,setSavingDuplicatePairs]=useState<Set<string>>(new Set());
  const [showRejectedDuplicates,setShowRejectedDuplicates]=useState(false);
  const [duplicateReviewFilter,setDuplicateReviewFilter]=useState<"all"|"unreviewed"|"confirmed"|"rejected"|"variant">("unreviewed");
  const [duplicateReviewSearch,setDuplicateReviewSearch]=useState("");
  const [duplicateReviewIndex,setDuplicateReviewIndex]=useState(0);
  const [duplicateReviewOnlySameBrand,setDuplicateReviewOnlySameBrand]=useState(false);
  const [duplicateReviewOnlySameCategory,setDuplicateReviewOnlySameCategory]=useState(false);
  const [duplicateReviewOnlyDifferentArticles,setDuplicateReviewOnlyDifferentArticles]=useState(false);
  const [duplicateReviewOnlyCrossBrand,setDuplicateReviewOnlyCrossBrand]=useState(false);
  const resetDuplicateReviewFilters=()=>{setDuplicateReviewFilter("unreviewed");setDuplicateReviewSearch("");setDuplicateReviewOnlySameBrand(false);setDuplicateReviewOnlySameCategory(false);setDuplicateReviewOnlyDifferentArticles(false);setDuplicateReviewOnlyCrossBrand(false);setDuplicateReviewIndex(0)};
  const duplicatePairKey=(items:Row[])=>JSON.stringify(items.map(p=>String(p.id)).sort());
  const duplicateVerdictLabel=(verdict:"confirmed"|"rejected"|"variant"|undefined)=>verdict==="confirmed"?"Vrai doublon":verdict==="rejected"?"Pas un doublon":verdict==="variant"?"Variante distincte":"Non révisé";
  const duplicateReviewStats=duplicateScan?{total:duplicateScan.groups.length,unreviewed:duplicateScan.groups.filter(g=>!duplicateVerdicts[duplicatePairKey(g.products)]).length,confirmed:duplicateScan.groups.filter(g=>duplicateVerdicts[duplicatePairKey(g.products)]==="confirmed").length,rejected:duplicateScan.groups.filter(g=>duplicateVerdicts[duplicatePairKey(g.products)]==="rejected").length,variant:duplicateScan.groups.filter(g=>duplicateVerdicts[duplicatePairKey(g.products)]==="variant").length}:null;
  const markDuplicate=async(items:Row[],verdict:"confirmed"|"rejected"|"variant"|null)=>{
    const key=duplicatePairKey(items);
    if(savingDuplicatePairs.has(key))return;
    setSavingDuplicatePairs(previous=>new Set(previous).add(key));
    try {
      await request("/api/admin/duplicate-verdicts",{method:"PUT",body:JSON.stringify({productA:String(items[0].id),productB:String(items[1].id),verdict})});
      setDuplicateVerdicts(previous=>{const next={...previous};if(verdict)next[key]=verdict;else delete next[key];return next});
    } catch(error) {
      window.alert(error instanceof Error?error.message:"Impossible d’enregistrer le verdict.");
    } finally {
      setSavingDuplicatePairs(previous=>{const next=new Set(previous);next.delete(key);return next});
    }
  };

  const duplicateImageHashCache=useRef(new Map<string,string>());
  const searchByImage=async(file:File)=>{
    setImageSearchBusy(true);setImageSearchResults([]);
    try{
      const objectUrl=URL.createObjectURL(file);
      try{
        const query=await imageFingerprint(objectUrl);
        const source=catalogProducts.length?catalogProducts:products;
        const scored:Array<{product:Row;score:number}>=[];
        for(const product of source){
          const url=String(product.image_url||"");if(!url)continue;
          try{const fp=await imageFingerprint(url);const score=imageScores(query,fp).visual;if(score>=.72)scored.push({product,score})}catch{}
        }
        scored.sort((a,b)=>b.score-a.score);setImageSearchResults(scored.slice(0,20));
      }finally{URL.revokeObjectURL(objectUrl)}
    }catch(error){window.alert(error instanceof Error?error.message:"Recherche par image impossible.")}
    finally{setImageSearchBusy(false);if(imageSearchInput.current)imageSearchInput.current.value=""}
  };
  const assembleSelectedProductImages=async()=>{
    const selected=products.filter(product=>selectedProducts.has(String(product.id)));
    if(selected.length<2){window.alert("Sélectionne au moins 2 produits à assembler.");return;}
    const target=selected[0];
    const sources=selected.slice(1);
    const imageList:string[]=[];
    const addImage=(value:unknown)=>{if(typeof value!=="string")return;const image=value.trim();if(image&&!imageList.includes(image))imageList.push(image);};
    for(const product of selected){
      addImage(product.image_url);
      try{const extras=JSON.parse(String(product.images_json||"[]"));if(Array.isArray(extras))extras.forEach(addImage);}catch{}
    }
    if(!imageList.length){window.alert("Aucune image trouvée dans la sélection.");return;}
    const sourceNames=sources.map(product=>String(product.name_fr||product.article_number||product.id)).join("\n• ");
    if(!window.confirm(`Assembler ${selected.length} fiches en un seul produit ?\n\nProduit conservé :\n• ${String(target.name_fr||target.article_number||target.id)}\n\nLes images seront ajoutées à cette fiche. Les autres fiches seront supprimées mais resteront récupérables dans l’historique :\n• ${sourceNames}`))return;
    setMergeBusy(true);
    try{
      await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...target,image_url:imageList[0],images_json:JSON.stringify(imageList.slice(1))})});
      for(const source of sources){
        await request(`/api/admin/products?id=${encodeURIComponent(String(source.id))}`,{method:"DELETE"});
      }
      setSelectedProducts(new Set([String(target.id)]));
      await reload();
      window.alert(`Assemblage terminé : ${imageList.length} image(s) réunie(s) dans « ${String(target.name_fr||target.article_number||"le produit")} ».`);
    }catch(error){
      window.alert(error instanceof Error?error.message:"Assemblage impossible.");
    }finally{
      setMergeBusy(false);
    }
  };
  const reset = () => { setSearch(""); setCategory("all"); setVisibility("all"); setStock("all"); };
  const setProductBoutique=async(product:Row,value:string)=>{setVisibilityBusy(String(product.id));try{await request("/api/admin/products",{method:"PUT",body:JSON.stringify({...product,visible_qc:value==="qc"||value==="both",visible_conakry:value==="conakry"||value==="both",visible:value!=="hidden"})});await reload()}finally{setVisibilityBusy(null)}};
  const toggleSelected=(id:string,checked:boolean)=>setSelectedProducts(prev=>{const next=new Set(prev);checked?next.add(id):next.delete(id);return next});
  const applyBulk=async()=>{const selected=products.filter(p=>selectedProducts.has(String(p.id)));if(!selected.length)return;const priceRaw=bulkPrice.trim()===""?null:Number(bulkPrice);if(priceRaw!==null&&!Number.isFinite(priceRaw)){window.alert("Prix invalide.");return}const changes:string[]=[];if(bulkVisibility!=="keep")changes.push(`visibilité: ${bulkVisibility}`);if(bulkMarket!=="keep")changes.push(`déplacer vers: ${bulkMarket==="qc"?"Québec":bulkMarket==="conakry"?"Conakry":bulkMarket==="both"?"Québec + Conakry":"Masqué"}`);if(bulkCategory!=="keep")changes.push(`catégorie: ${categories[bulkCategory]||bulkCategory}`);if(priceRaw!==null)changes.push(bulkPriceMode==="percent"?`prix ${market}: ${priceRaw>=0?"+":""}${priceRaw}%`:`prix ${market}: ${priceRaw}`);if(!changes.length){window.alert("Choisis au moins une modification.");return}if(!window.confirm(`${selected.length} produit(s) sélectionné(s)

${changes.join("\n")}

Appliquer ces modifications ?`))return;setBulkBusy(true);try{for(const product of selected){const patch:Row={...product};if(bulkVisibility!=="keep"){patch.visible_qc=bulkVisibility==="qc"||bulkVisibility==="both";patch.visible_conakry=bulkVisibility==="conakry"||bulkVisibility==="both";patch.visible=bulkVisibility!=="hidden"}if(bulkMarket!=="keep"){patch.visible_qc=bulkMarket==="qc"||bulkMarket==="both";patch.visible_conakry=bulkMarket==="conakry"||bulkMarket==="both";patch.visible=bulkMarket!=="hidden"}if(bulkCategory!=="keep")patch.category=bulkCategory;if(priceRaw!==null){const key=`price_${market}`;const current=Number(product[key]||0);patch[key]=bulkPriceMode==="percent"?Math.max(0,Math.round(current*(1+priceRaw/100)*100)/100):Math.max(0,priceRaw)}await request("/api/admin/products",{method:"PUT",body:JSON.stringify(patch)})}setSelectedProducts(new Set());setBulkPrice("");await reload()}catch(error){window.alert(error instanceof Error?error.message:"Modification en lot impossible.")}finally{setBulkBusy(false)}};

  const normalizeDuplicate = (value: unknown) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const duplicateWords = (value: unknown) => new Set(normalizeDuplicate(value).split(" ").filter(word => word.length > 2));
  const wordSimilarity = (a: unknown, b: unknown) => {
    const aw = duplicateWords(a), bw = duplicateWords(b);
    if (!aw.size || !bw.size) return 0;
    let same = 0; for (const word of aw) if (bw.has(word)) same++;
    return same / Math.min(aw.size, bw.size);
  };
  const genericDuplicateWords=new Set(["barbie","mattel","ken","poupee","poupees","figurine","figurines","jouet","jouets","disney","princess","princesse","dc","marvel","batman","aquaman","nerf","blaster","xshot","shot"]);
  const distinctiveWords=(value:unknown)=>new Set([...duplicateWords(value)].filter(word=>!genericDuplicateWords.has(word)));
  const distinctiveSimilarity=(a:unknown,b:unknown)=>{
    const aw=distinctiveWords(a),bw=distinctiveWords(b);if(!aw.size||!bw.size)return 0;
    let same=0;for(const word of aw)if(bw.has(word))same++;return same/Math.max(aw.size,bw.size);
  };
  type VisualFingerprint={shape:string;color:number[];legacy:string;url:string};
  const imageFingerprint = async (url: string):Promise<VisualFingerprint> => {
    const cacheKey="v2:"+url;const cached=duplicateImageHashCache.current.get(cacheKey);
    if(cached){const parsed=JSON.parse(cached) as VisualFingerprint;return parsed}
    const img=new Image();img.crossOrigin="anonymous";img.src=url;await img.decode();
    const source=document.createElement("canvas");source.width=128;source.height=128;
    const sctx=source.getContext("2d",{willReadFrequently:true});if(!sctx)throw new Error("Canvas indisponible");
    sctx.fillStyle="#fff";sctx.fillRect(0,0,128,128);
    const scale=Math.min(128/img.naturalWidth,128/img.naturalHeight);const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    sctx.drawImage(img,(128-w)/2,(128-h)/2,w,h);
    const pixels=sctx.getImageData(0,0,128,128).data;
    const legacyCanvas=document.createElement("canvas");legacyCanvas.width=64;legacyCanvas.height=64;const legacyCtx=legacyCanvas.getContext("2d",{willReadFrequently:true});if(!legacyCtx)throw new Error("Canvas indisponible");legacyCtx.fillStyle="#fff";legacyCtx.fillRect(0,0,64,64);legacyCtx.drawImage(img,0,0,64,64);const legacyData=legacyCtx.getImageData(0,0,64,64).data;const legacyGray:number[]=[];for(let i=0;i<legacyData.length;i+=4)legacyGray.push(legacyData[i]*.299+legacyData[i+1]*.587+legacyData[i+2]*.114);const legacyAvg=legacyGray.reduce((x,y)=>x+y,0)/legacyGray.length;const legacy=legacyGray.map(v=>v>=legacyAvg?"1":"0").join("");
    let minX=127,minY=127,maxX=0,maxY=0,found=false;
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;const r=pixels[i],g=pixels[i+1],bl=pixels[i+2];const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl);if(mx<242||(mx-mn)>18){found=true;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}
    if(!found){minX=0;minY=0;maxX=127;maxY=127}
    const pad=4;minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(127,maxX+pad);maxY=Math.min(127,maxY+pad);
    const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Canvas indisponible");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,64,64);ctx.drawImage(source,minX,minY,maxX-minX+1,maxY-minY+1,0,0,64,64);
    const data=ctx.getImageData(0,0,64,64).data;const gray:number[]=[];const color=new Array(12).fill(0);let colored=0;
    for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],bl=data[i+2];gray.push(r*.299+g*.587+bl*.114);if(Math.min(r,g,bl)<245){color[Math.min(3,Math.floor(r/64))]++;color[4+Math.min(3,Math.floor(g/64))]++;color[8+Math.min(3,Math.floor(bl/64))]++;colored++}}
    const avg=gray.reduce((x,y)=>x+y,0)/gray.length;const shape=gray.map(v=>v>=avg?"1":"0").join("");const denom=Math.max(1,colored);const normalized=color.map(v=>v/denom);
    const fp={shape,color:normalized,legacy,url};duplicateImageHashCache.current.set(cacheKey,JSON.stringify(fp));return fp;
  };
  const bitSimilarity=(a:string,b:string)=>{if(!a||!b||a.length!==b.length)return 0;let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return 1-d/a.length};
  const colorSimilarity=(a:number[],b:number[])=>{if(a.length!==b.length)return 0;let d=0;for(let i=0;i<a.length;i++)d+=Math.abs(a[i]-b[i]);return Math.max(0,1-d/(a.length/3))};
  const imageScores=(a:VisualFingerprint|undefined,b:VisualFingerprint|undefined)=>{if(!a||!b)return {visual:0,legacy:0,cropped:0,exact:false};const exact=a.url===b.url;const legacy=bitSimilarity(a.legacy,b.legacy);const cropped=bitSimilarity(a.shape,b.shape)*.72+colorSimilarity(a.color,b.color)*.28;return {visual:exact?1:Math.max(legacy,cropped),legacy,cropped,exact}};
  const [duplicatePass,setDuplicatePass]=useState<1|2|3>(1);
  const passesDuplicate=(g:{legacy:number;cropped:number;name:number;distinctive:number;sameBrand:boolean;visual:number;match:number},pass:1|2|3)=>{
    if(pass===1)return true;
    // Deux preuves indépendantes: une image forte ET un indice de produit.
    const visualStrong=g.legacy>=.975||g.cropped>=.985;
    const productEvidence=g.name>=.72||g.distinctive>=.65||g.sameBrand;
    if(pass===2)return visualStrong&&productEvidence;
    // Confirmation plus stricte: visuel quasi identique ET titre ou marque cohérents.
    return (g.legacy>=.975&&g.name>=.80)||(g.legacy>=.995)||(g.cropped>=.985&&g.name>=.80);
  };
  const duplicateEligible=(g:NonNullable<typeof duplicateScan>["groups"][number],pass:1|2|3)=> {
    const verdict=duplicateVerdicts[duplicatePairKey(g.products)];
    const reviewMatches=duplicateReviewFilter==="all"||(duplicateReviewFilter==="unreviewed"?!verdict:verdict===duplicateReviewFilter); const needle=duplicateReviewSearch.trim().toLocaleLowerCase("fr"); const searchMatches=!needle||g.products.some(product=>[product.name_fr,product.name_en,product.brand,product.article_number,product.category].some(value=>String(value||"").toLocaleLowerCase("fr").includes(needle))); const brandMatches=!duplicateReviewOnlySameBrand||g.sameBrand; const categoryMatches=!duplicateReviewOnlySameCategory||sharedHierarchyDepth(g.products[0],g.products[1])>=1; const articleA=String(g.products[0]?.article_number||"").trim(); const articleB=String(g.products[1]?.article_number||"").trim(); const articleMatches=!duplicateReviewOnlyDifferentArticles||(!articleA||!articleB||articleA!==articleB); const crossBrandMatches=!duplicateReviewOnlyCrossBrand||!g.sameBrand; const explicitSavedVerdict=verdict!==undefined&&duplicateReviewFilter===verdict; return searchMatches&&brandMatches&&categoryMatches&&articleMatches&&crossBrandMatches&&reviewMatches&&(showRejectedDuplicates||(verdict!=="rejected"&&verdict!=="variant")||duplicateReviewFilter==="rejected"||duplicateReviewFilter==="variant")&&(verdict==="confirmed"||explicitSavedVerdict||(passesDuplicate(g,pass)&&(showReviewDuplicates||g.confidence!=="review")));
  };
  const visibleDuplicateGroups=(duplicateScan?.groups.filter(g=>duplicateEligible(g,duplicatePass))||[]).sort((a,b)=>{const confirmed=Number(duplicateVerdicts[duplicatePairKey(b.products)]==="confirmed")-Number(duplicateVerdicts[duplicatePairKey(a.products)]==="confirmed");if(confirmed)return confirmed;const hierarchy=sharedHierarchyDepth(b.products[0],b.products[1])-sharedHierarchyDepth(a.products[0],a.products[1]);if(hierarchy)return hierarchy;return b.match-a.match;}); const safeDuplicateReviewIndex=Math.min(duplicateReviewIndex,Math.max(0,visibleDuplicateGroups.length-1)); const activeDuplicateGroup=visibleDuplicateGroups[safeDuplicateReviewIndex];
  const scanDuplicates = async () => {
    try{const saved=await request("/api/admin/duplicate-verdicts") as {verdicts:Record<string,"confirmed"|"rejected">};setDuplicateVerdicts(saved.verdicts||{})}catch(error){window.alert(error instanceof Error?error.message:"Impossible de charger les verdicts D1.");return}

    setDuplicateScanning(true);
    try {
      const source=catalogProducts.length?catalogProducts:products;
      setDuplicateProgress({done:0,total:source.length});
      const fingerprints=new Map<string,VisualFingerprint>();
      for(let i=0;i<source.length;i++){
        const url=String(source[i].image_url||"");
        if(url)try{fingerprints.set(String(source[i].id),await imageFingerprint(url))}catch{}
        if(i%5===0||i===source.length-1){setDuplicateProgress({done:i+1,total:source.length});await new Promise(resolve=>setTimeout(resolve,0))}
      }
      // Le scan principal reste 100 % local et déterministe. L'enrichissement NVIDIA
      // sera réactivé séparément après affichage des résultats afin qu'aucun appel réseau
      // ne puisse bloquer le bouton à 100 %.
      const semanticVectors=new Map<string,number[]>();
      const semanticError="";
      const cosine=(a:number[]|undefined,b:number[]|undefined)=>{if(!a||!b||a.length!==b.length)return 0;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa&&bb?dot/Math.sqrt(aa*bb):0};
      const pairs:Array<{a:Row;b:Row;visual:number;match:number;semantic:number;legacy:number;cropped:number;name:number;distinctive:number;sameBrand:boolean;confidence:"certain"|"probable"|"review"}>=[];const seen=new Set<string>();
      for(let i=0;i<source.length;i++)for(let j=i+1;j<source.length;j++){
        const a=source[i],b=source[j],aid=String(a.id),bid=String(b.id);
        const ah=fingerprints.get(aid),bh=fingerprints.get(bid);
        const scores=imageScores(ah,bh);const visual=scores.visual;const semantic=cosine(semanticVectors.get(aid),semanticVectors.get(bid));
        const articleA=normalizeDuplicate(a.article_number),articleB=normalizeDuplicate(b.article_number);
        const sameArticle=!!(articleA&&articleA===articleB);
        const brandA=normalizeDuplicate(a.brand).replace(/\s+/g,""),brandB=normalizeDuplicate(b.brand).replace(/\s+/g,"");
        const sameBrand=!!(brandA&&brandA===brandB);
        const nameA=`${a.name_fr||""} ${a.name_en||""}`,nameB=`${b.name_fr||""} ${b.name_en||""}`;
        const name=wordSimilarity(nameA,nameB),distinctive=distinctiveSimilarity(nameA,nameB);
        const desc=wordSimilarity(`${a.description_fr||""} ${a.description_en||""}`,`${b.description_fr||""} ${b.description_en||""}`);
        // L'image est maintenant analysée pour TOUT le catalogue. Une forte ressemblance visuelle
        // suffit à signaler une paire, même si marque/titre/catégorie ont été saisis différemment.
        const metadata=Math.max(name*.55+distinctive*.30+(sameBrand?.15:0),sameBrand&&desc>=.72?Math.min(1,name*.65+desc*.20+.15):0);const visualEvidence=Math.max(scores.cropped,scores.legacy*.94);const visualBoost=visual>=.99?.97:visual>=.985?.94:visual>=.975?.90:0;const match=sameArticle||scores.exact?1:Math.max(visualBoost,Math.min(1,visualEvidence*.82+metadata*.18));const legacyStrong=scores.legacy>=.975;const croppedStrong=scores.cropped>=.985;const metadataStrong=sameBrand||name>=.62||distinctive>=.55;const duplicate=sameArticle||scores.exact||semantic>=.90||legacyStrong||croppedStrong||(scores.cropped>=.955&&metadataStrong)||(sameBrand&&distinctive>=.72&&name>=.90&&desc>=.72);
        if(duplicate){const key=[aid,bid].sort().join("|");if(!seen.has(key)){seen.add(key);const strongNameVisual=scores.legacy>=.975&&name>=.92;const strongBrandVisual=sameBrand&&scores.legacy>=.965&&name>=.72;const strongCrop=scores.cropped>=.985&&metadata>=.48;const multiEvidence=strongNameVisual||strongBrandVisual||strongCrop;const probableEvidence=(scores.legacy>=.965&&name>=.72)||(scores.legacy>=.975&&metadata>=.12)||(scores.cropped>=.965&&metadata>=.32);const confidence:"certain"|"probable"|"review"=sameArticle||scores.exact||semantic>=.965||(semantic>=.93&&name>=.55)||multiEvidence?"certain":semantic>=.90||probableEvidence?"probable":"review";pairs.push({a,b,visual,match,semantic,legacy:scores.legacy,cropped:scores.cropped,name,distinctive,sameBrand,confidence})}}
      }
      // Le filtre local réduit fortement le nombre d'appels. NVIDIA Vision, avec le
      // même modèle que l'analyse produit, tranche ensuite les paires réellement suspectes.
      const aiPairs = pairs.filter(pair => pair.confidence !== "review" || pair.match >= .90).slice(0, 60);
      for (const pair of aiPairs) {
        try {
          const verdict = await request("/api/admin/compare-products", {
            method: "POST",
            body: JSON.stringify({ image_a: pair.a.image_url, image_b: pair.b.image_url }),
          }) as { verdict?: "same"|"variant"|"different"; confidence?: number };
          const confidence = Math.max(0, Math.min(1, Number(verdict.confidence) || 0));
          if (verdict.verdict === "same" && confidence >= .82) {
            pair.confidence = confidence >= .94 ? "certain" : "probable";
            pair.match = Math.max(pair.match, confidence);
            pair.semantic = Math.max(pair.semantic, confidence);
          } else if ((verdict.verdict === "different" || verdict.verdict === "variant") && confidence >= .88) {
            pair.confidence = "review";
            pair.semantic = -confidence;
          }
        } catch {
          // Le scanner local reste utilisable si NVIDIA est momentanément indisponible.
        }
      }

      const rank={certain:0,probable:1,review:2};
      const groups=pairs.map(pair=>({products:[pair.a,pair.b],visual:pair.visual,match:pair.match,semantic:pair.semantic,legacy:pair.legacy,cropped:pair.cropped,name:pair.name,distinctive:pair.distinctive,sameBrand:pair.sameBrand,confidence:pair.confidence}));
      groups.sort((a,b)=>{const evidence=(x:typeof a)=>x.legacy*.38+x.name*.28+(x.legacy*x.name)*.22+Math.min(x.legacy,x.cropped)*.08+(x.sameBrand?.04:0);const tier=(x:typeof a)=>x.legacy>=.975&&x.name>=.92?0:x.legacy>=.965&&x.name>=.80?1:x.legacy>=.99?2:3;return tier(a)-tier(b)||evidence(b)-evidence(a)||rank[a.confidence]-rank[b.confidence]||b.visual-a.visual});
      setDuplicatePass(1);
      setDuplicateScan({groups,scanned:source.length});
      if(semanticError) setNotice(`Scanner classique utilisé : ${semanticError}`); else if(semanticVectors.size) setNotice(`Analyse sémantique NVIDIA active sur ${semanticVectors.size} produit(s).`);
    } finally { setDuplicateScanning(false); }
  };
  return <section className="cms-panel">
    <AiBatchImport market={market} busy={busy} onDone={reload} catalogProducts={catalogProducts} search={search} setSearch={setSearch} synchronize={synchronize} add={add} scanDuplicates={scanDuplicates} duplicateScanning={duplicateScanning} duplicateProgress={duplicateProgress} onImageSearch={searchByImage} imageSearchBusy={imageSearchBusy} />
    <div className={`cms-bulk-toolbar${selectedProducts.size?" has-selection":""}`}><strong>Actions en lot · {selectedProducts.size} sélectionné(s)</strong><button type="button" className="cms-secondary" onClick={()=>setSelectedProducts(new Set(products.map(p=>String(p.id))))}>Tout sélectionner ({products.length})</button><button type="button" className="cms-secondary" disabled={!selectedProducts.size} onClick={()=>setSelectedProducts(new Set())}>Désélectionner</button><button type="button" className="cms-primary" disabled={mergeBusy||selectedProducts.size<2} onClick={()=>void assembleSelectedProductImages()}>{mergeBusy?"⌛ Assemblage…":`🖼 Assembler les images en 1 produit (${selectedProducts.size})`}</button><select value={bulkVisibility} onChange={e=>setBulkVisibility(e.target.value)}><option value="keep">Visibilité — ne pas modifier</option><option value="hidden">Masqué partout</option><option value="qc">Québec seulement</option><option value="conakry">Conakry seulement</option><option value="both">Québec + Conakry</option></select><select aria-label="Déplacer la sélection vers une boutique" value={bulkMarket} onChange={e=>setBulkMarket(e.target.value as typeof bulkMarket)}><option value="keep">Déplacer — ne pas modifier</option><option value="qc">→ Québec seulement</option><option value="conakry">→ Conakry seulement</option><option value="both">→ Québec + Conakry</option><option value="hidden">→ Retirer des boutiques</option></select><select value={bulkCategory} onChange={e=>setBulkCategory(e.target.value)}><option value="keep">Catégorie — ne pas modifier</option>{Object.entries(categories).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select value={bulkPriceMode} onChange={e=>setBulkPriceMode(e.target.value as "set"|"percent")}><option value="set">Prix fixe · {markets[market].label}</option><option value="percent">Variation % · {markets[market].label}</option></select><input type="number" step="0.01" placeholder={bulkPriceMode==="percent"?"Ex. 10 ou -5":"Nouveau prix"} value={bulkPrice} onChange={e=>setBulkPrice(e.target.value)} style={{width:130}}/><button type="button" className="cms-primary" disabled={bulkBusy||!selectedProducts.size} onClick={()=>void applyBulk()}>{bulkBusy?"⌛ Modification…":"Appliquer à la sélection"}</button></div>
    <div className="cms-product-filters">
      <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Toutes les catégories</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Visibilité<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="all">Tous</option><option value="visible">Visibles</option><option value="hidden">Masqués</option><option value="qc">Québec seulement</option><option value="conakry">Conakry seulement</option><option value="both">Québec + Conakry</option></select></label>
      <label>Stock<select value={stock} onChange={(event) => setStock(event.target.value)}><option value="all">Tous</option><option value="available">En stock</option><option value="low">Stock faible</option><option value="empty">Épuisés</option></select></label>
      <span className="cms-filter-count">{products.length} résultat(s)</span><button type="button" className="cms-secondary" onClick={reset}>Réinitialiser</button>
    </div>
    <div className="cms-product-card-list">
      {products.map((product) => <article key={String(product.id)} className={`cms-product-card${selectedProducts.has(String(product.id))?" is-selected":""}`}>
        <label className="cms-product-select" title="Sélectionner cet article"><input type="checkbox" checked={selectedProducts.has(String(product.id))} onChange={e=>toggleSelected(String(product.id),e.target.checked)}/><span>Sélectionner</span></label>
        <button type="button" className="cms-product-card-image" onClick={() => product.image_url && setZoomImage(String(product.image_url))} title="Agrandir l’image">
          {product.image_url ? <img src={String(product.image_url)} alt={String(product.name_fr||"")} /> : <span className="cms-product-placeholder">□</span>}
        </button>
        <div className="cms-product-card-info">
          <div><strong className="cms-product-card-title">{String(product.name_fr)}</strong>{product.name_en&&<span className="cms-product-card-subtitle">{String(product.name_en)}</span>}</div>
          <div className="cms-product-card-meta"><span><b>No d’article</b>{String(product.article_number || "—")}</span><span><b>Catégorie</b>{categories[String(product.category)] || String(product.category)}</span><span><b>Prix · {markets[market].label}</b>{marketPrice(product[`price_${market}`], market)}</span><span><b>Stock</b>{String(product[`stock_${market}`] || 0)} <button className="cms-inline" onClick={() => adjustStock(product)}>Ajuster</button></span></div>
          <div className="cms-product-card-visibility"><b>Visibilité</b><select aria-label="Boutique où afficher le produit" disabled={visibilityBusy===String(product.id)} value={product.visible_qc&&product.visible_conakry?"both":product.visible_qc?"qc":product.visible_conakry?"conakry":"hidden"} onChange={e=>void setProductBoutique(product,e.target.value)}><option value="hidden">🔒 Masqué partout</option><option value="qc">🇨🇦 Québec seulement</option><option value="conakry">🇬🇳 Conakry seulement</option><option value="both">👁 Québec + Conakry</option></select>{visibilityBusy===String(product.id)&&<span>Enregistrement…</span>}</div>
        </div>
        <div className="cms-product-card-actions"><button className="cms-primary" onClick={() => edit(product)}>Modifier</button><button className="cms-danger" onClick={() => remove(String(product.id))}>Supprimer</button></div>
      </article>)}
    </div>
    {!products.length && <p className="cms-empty">Aucun produit trouvé.</p>}
    {zoomImage && createPortal(<div style={{position:"fixed",inset:0,zIndex:99999,display:"grid",placeItems:"center",padding:20,background:"rgba(11,23,36,.94)"}} role="dialog" aria-modal="true" onClick={() => setZoomImage(null)}><button type="button" onClick={() => setZoomImage(null)} style={{position:"fixed",top:20,right:24,width:52,height:52,border:0,borderRadius:"50%",background:"#fff",fontSize:32,cursor:"pointer"}}>×</button><img src={zoomImage} alt="Aperçu agrandi" style={{maxWidth:"96vw",maxHeight:"94vh",width:"auto",height:"auto",objectFit:"contain",background:"#fff"}} onClick={(event) => event.stopPropagation()} /></div>, document.body)}
  </section>;
}
