import { cmsEnv,currentAdmin,forbidden } from "@/lib/cms";
import { updateProductBindings } from "../products/product-input";

type Action={key:string;type:string;label:string;before:Record<string,unknown>;after?:Record<string,unknown>;table?:string;state?:"applied"|"restored";updated_at?:string};

async function history():Promise<Action[]>{
 const rows=await cmsEnv().DB.prepare("SELECT key,value,updated_at FROM settings WHERE key LIKE 'cms_undo:%' ORDER BY updated_at DESC,key DESC LIMIT 20").all<{key:string;value:string;updated_at:string}>();
 return (rows.results||[]).flatMap(row=>{try{return [{key:row.key,...JSON.parse(row.value),updated_at:row.updated_at} as Action]}catch{return []}});
}

function publicAction(action:Action){return {key:action.key,type:action.type,label:action.label,state:action.state||"applied",updated_at:action.updated_at};}

export async function GET(request:Request){
 if(!await currentAdmin(request))return forbidden();
 const actions=await history();
 return Response.json({actions:actions.map(publicAction),action:actions[0]?publicAction(actions[0]):null});
}

export async function POST(request:Request){
 if(!await currentAdmin(request))return forbidden();
 const db=cmsEnv().DB;
 let body:{key?:string}={};try{body=await request.json() as {key?:string}}catch{}
 const actions=await history();
 const action=(body.key?actions.find(a=>a.key===body.key):actions[0])||null;
 if(!action?.before)return Response.json({error:"Action introuvable dans les 20 dernières modifications."},{status:404});

 const before=action.before,id=String(before.id||"");
 if(!id)return Response.json({error:"Historique invalide."},{status:400});
 const state=action.state||"applied";

 if(action.type==="product_update"){
  const current=await db.prepare("SELECT * FROM products WHERE id=?").bind(id).first<Record<string,unknown>>();
  if(!current)return Response.json({error:"Produit introuvable."},{status:404});
  const after=action.after||current;
  const source=state==="restored"?after:before;
  const reference=state==="restored"?before:after;
  const target={...current};
  for(const key of Object.keys(source)){
   if(key==="id"||key==="updated_at")continue;
   if(!action.after || current[key]===reference[key]) target[key]=source[key];
  }
  await db.prepare("UPDATE products SET name_fr=?,name_en=?,description_fr=?,description_en=?,category=?,price=?,stock=?,status=?,badge=?,ages=?,image_url=?,image_sheet=?,image_position=?,brand=?,material=?,dimensions=?,exchange_terms_fr=?,exchange_terms_en=?,visible=?,price_qc=?,price_conakry=?,stock_qc=?,stock_conakry=?,visible_qc=?,visible_conakry=?,alert_threshold=?,featured=?,promo_price_qc=?,promo_price_conakry=?,variants_json=?,images_json=?,updated_at=? WHERE id=?").bind(...updateProductBindings(target,id,new Date().toISOString())).run();
  action.after=after;
 }else if(action.type==="product_delete"||action.type==="row_delete"||action.type==="order_delete"){
  const table=action.type==="product_delete"?"products":String(action.table||"");
  const allowed=new Set(["products","customers","subscribers","promotions","orders"]);
  if(!allowed.has(table))return Response.json({error:"Type de restauration invalide."},{status:400});
  if(state==="restored"){
   await db.prepare(`DELETE FROM ${table} WHERE id=?`).bind(id).run();
  }else{
   const cols=Object.keys(before),values=cols.map(k=>before[k]);
   await db.prepare(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(()=>"?").join(",")})`).bind(...values).run();
   if(action.type==="order_delete"&&String(before.status)!=="cancelled"&&before.items_json){try{const items=JSON.parse(String(before.items_json)) as Array<{product_id?:string;quantity?:number}>;const stockColumn=String(before.region)==="qc"?"stock_qc":"stock_conakry";const now=new Date().toISOString();const statements=items.filter(i=>i.product_id&&Number(i.quantity)>0).map(i=>db.prepare(`UPDATE products SET ${stockColumn}=MAX(0,${stockColumn}-?),updated_at=? WHERE id=?`).bind(Number(i.quantity),now,String(i.product_id)));if(statements.length)await db.batch(statements)}catch{}}
  }
 }else return Response.json({error:"Cette action ne peut pas encore être restaurée."},{status:400});

 action.state=state==="restored"?"applied":"restored";
 const now=new Date().toISOString();
 await db.prepare("UPDATE settings SET value=?,updated_at=? WHERE key=?").bind(JSON.stringify({...action,updated_at:undefined,key:undefined}),now,action.key).run();
 return Response.json({success:true,label:action.label,state:action.state});
}
