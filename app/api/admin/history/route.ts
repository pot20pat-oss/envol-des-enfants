import { cmsEnv,currentAdmin,forbidden } from "@/lib/cms";
import { updateProductBindings } from "../products/product-input";

type Action={key:string;type:string;label:string;before:Record<string,unknown>;after?:Record<string,unknown>;table?:string;state?:"applied"|"restored";updated_at?:string};

// Names and binding positions match updateProductBindings(). Never write the
// three inventory fields when undoing a stock-neutral product edit.
const PRODUCT_UPDATE_FIELDS = [
  "name_fr", "name_en", "description_fr", "description_en", "category",
  "price", "stock", "status", "badge", "ages", "image_url", "image_sheet",
  "image_position", "brand", "material", "dimensions", "exchange_terms_fr",
  "exchange_terms_en", "visible", "price_qc", "price_conakry", "stock_qc",
  "stock_conakry", "visible_qc", "visible_conakry", "alert_threshold",
  "featured", "promo_price_qc", "promo_price_conakry",
  "variants_json", "images_json", "updated_at",
] as const;
const INVENTORY_FIELDS = new Set<string>(["stock", "stock_qc", "stock_conakry"]);

function validQuantity(snapshot: Record<string,unknown>, key: string): number | null {
  if (!Object.prototype.hasOwnProperty.call(snapshot, key)) return null;
  const n = Number(snapshot[key]);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function historyStockRisk(action: Action): string | null {
  if (!action.before) return "Données d'historique incomplètes.";
  if (action.type === "product_update") {
    if (!action.after) return "Sauvegarde après modification absente.";
    for (const field of ["stock_qc", "stock_conakry"]) {
      const before = validQuantity(action.before, field);
      const after = validQuantity(action.after, field);
      if (before === null || after === null) return "Quantités historiques manquantes.";
      if (before !== after) return "Cette action modifie un inventaire.";
    }
    return null;
  }
  if (action.type === "product_delete" || action.type === "order_delete" ||
    (action.type === "row_delete" &&
      (action.table === "orders" || action.table === "products"))) {
    return "La restauration ou suppression de cette entrée peut modifier l'inventaire.";
  }
  if (action.type === "row_delete" &&
    ["customers", "subscribers", "promotions"].includes(action.table ?? "")) {
    return null;
  }
  return "Type d'historique non vérifié.";
}


async function history():Promise<Action[]>{
 const rows=await cmsEnv().DB.prepare("SELECT key,value,updated_at FROM settings WHERE key LIKE 'cms_undo:%' ORDER BY updated_at DESC,key DESC LIMIT 20").all<{key:string;value:string;updated_at:string}>();
 return (rows.results||[]).flatMap(row=>{try{return [{key:row.key,...JSON.parse(row.value),updated_at:row.updated_at} as Action]}catch{return []}});
}

function publicAction(action:Action){return {key:action.key,type:action.type,label:action.label,state:action.state||"applied",updated_at:action.updated_at};}

export async function GET(request:Request){
 if(!await currentAdmin(request))return forbidden();
 const actions=await history();
 const firstRestored=actions.findIndex(a=>(a.state||"applied")==="restored");
 const undoCount=firstRestored<0?actions.length:firstRestored;
 const redoCount=firstRestored<0?0:actions.length-firstRestored;
 return Response.json({actions:actions.map(publicAction),undoCount,redoCount,action:undoCount?publicAction(actions[0]):null});
}

export async function POST(request:Request){
 if(!await currentAdmin(request))return forbidden();
 const db=cmsEnv().DB;
 let body:{direction?:"undo"|"redo";steps?:number}={};try{body=await request.json() as typeof body}catch{}
 const direction=body.direction==="redo"?"redo":"undo";
 const actions=await history();
 const firstRestored=actions.findIndex(a=>(a.state||"applied")==="restored");
 const undoable=actions.slice(0,firstRestored<0?actions.length:firstRestored);
 const redoable=firstRestored<0?[]:actions.slice(firstRestored);
 const stack=direction==="undo"?undoable:redoable;
 const steps=Math.max(1,Math.min(Number(body.steps)||1,stack.length));
 if(!stack.length)return Response.json({error:direction==="undo"?"Aucune action à annuler.":"Aucune action à rétablir."},{status:404});
 const selected=stack.slice(0,steps);

 // Review all requested operations BEFORE changing a single database record.
 // A multi-step undo must not partly modify inventory before hitting a risky
 // product/order operation later in the history stack.
 for(const action of selected){
  const reason=historyStockRisk(action);
  if(reason){
   return Response.json({
    error: "Annuler/Rétablir protégé : " + reason +
      " Utilise les opérations du CMS prévues pour les stocks et les commandes.",
    code: "HISTORY_INVENTORY_PROTECTED",
    history_key: action.key,
    inventory_changed: false,
   },{status:409});
  }
 }

 async function toggle(action:Action){
  if(!action.before)throw new Error("Historique invalide.");
  const before=action.before,id=String(before.id||"");if(!id)throw new Error("Historique invalide.");
  const state=action.state||"applied";
  if(direction==="undo"&&state==="restored")throw new Error("Ordre d’annulation invalide.");
  if(direction==="redo"&&state!=="restored")throw new Error("Ordre de rétablissement invalide.");
  if(action.type==="product_update"){
   const current=await db.prepare("SELECT * FROM products WHERE id=?").bind(id).first<Record<string,unknown>>();
   if(!current)throw new Error("Produit introuvable.");
   const target=direction==="undo"?before:action.after;
   if(!target)throw new Error("Cette ancienne modification ne peut pas être rétablie.");
   // Restore only non-stock product fields. The current inventory may have
   // changed since this historical action (sales, restocks, cancellations).
   const bindings=updateProductBindings(target,id,new Date().toISOString());
   if(bindings.length!==PRODUCT_UPDATE_FIELDS.length+1){
    throw new Error("Structure de produit inattendue : restauration annulée.");
   }
   const allowed=PRODUCT_UPDATE_FIELDS.map((field,index)=>({field,value:bindings[index]}))
    .filter(({field})=>!INVENTORY_FIELDS.has(field));
   await db.prepare(`UPDATE products SET ${allowed.map(({field})=>field+"=?").join(",")} WHERE id=?`)
    .bind(...allowed.map(({value})=>value),id).run();
   if(!action.after)action.after=current;
  }else if(action.type==="product_delete"||action.type==="row_delete"||action.type==="order_delete"){
   const table=action.type==="product_delete"?"products":String(action.table||"");const allowed=new Set(["products","customers","subscribers","promotions","orders"]);if(!allowed.has(table))throw new Error("Type de restauration invalide.");
   if(direction==="undo"){
    const cols=Object.keys(before),values=cols.map(k=>before[k]);await db.prepare(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(()=>"?").join(",")})`).bind(...values).run();
    if(action.type==="order_delete"&&String(before.status)!=="cancelled"&&before.items_json){try{const items=JSON.parse(String(before.items_json)) as Array<{product_id?:string;quantity?:number}>;const stockColumn=String(before.region)==="qc"?"stock_qc":"stock_conakry";const now=new Date().toISOString();const statements=items.filter(i=>i.product_id&&Number(i.quantity)>0).map(i=>db.prepare(`UPDATE products SET ${stockColumn}=MAX(0,${stockColumn}-?),updated_at=? WHERE id=?`).bind(Number(i.quantity),now,String(i.product_id)));if(statements.length)await db.batch(statements)}catch{}}
   }else await db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
  }else throw new Error("Cette action ne peut pas encore être annulée.");
  action.state=direction==="undo"?"restored":"applied";
  await db.prepare("UPDATE settings SET value=? WHERE key=?").bind(JSON.stringify({...action,updated_at:undefined,key:undefined}),action.key).run();
 }
 try{for(const action of selected)await toggle(action)}catch(e){return Response.json({error:e instanceof Error?e.message:"Opération impossible."},{status:409})}
 return Response.json({success:true,direction,steps:selected.length,label:selected[selected.length-1]?.label});
}
