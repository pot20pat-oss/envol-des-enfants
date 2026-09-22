import { cmsEnv,currentAdmin,forbidden } from "@/lib/cms";
import { updateProductBindings } from "../products/product-input";

type Action={key:string;type:string;label:string;before:Record<string,unknown>};
async function latest():Promise<Action|null>{
 const row=await cmsEnv().DB.prepare("SELECT key,value FROM settings WHERE key LIKE 'cms_undo:%' ORDER BY updated_at DESC,key DESC LIMIT 1").first<{key:string;value:string}>();
 if(!row)return null;try{return {key:row.key,...JSON.parse(row.value)} as Action}catch{return null}
}
export async function GET(request:Request){if(!await currentAdmin(request))return forbidden();const action=await latest();return Response.json({action:action?{type:action.type,label:action.label}:null})}
export async function POST(request:Request){
 if(!await currentAdmin(request))return forbidden();const db=cmsEnv().DB;const action=await latest();if(!action?.before)return Response.json({error:"Aucune action à annuler."},{status:404});
 const before=action.before,id=String(before.id||"");if(!id)return Response.json({error:"Historique invalide."},{status:400});
 if(action.type==="product_update"){
  const current=await db.prepare("SELECT * FROM products WHERE id=?").bind(id).first<Record<string,unknown>>();if(!current)return Response.json({error:"Produit introuvable."},{status:404});
  await db.prepare("UPDATE products SET name_fr=?,name_en=?,description_fr=?,description_en=?,category=?,price=?,stock=?,status=?,badge=?,ages=?,image_url=?,image_sheet=?,image_position=?,brand=?,material=?,dimensions=?,exchange_terms_fr=?,exchange_terms_en=?,visible=?,price_qc=?,price_conakry=?,stock_qc=?,stock_conakry=?,visible_qc=?,visible_conakry=?,alert_threshold=?,featured=?,promo_price_qc=?,promo_price_conakry=?,variants_json=?,images_json=?,updated_at=? WHERE id=?").bind(...updateProductBindings(before,id,new Date().toISOString())).run();
  const redoKey=`cms_redo:${Date.now()}:${crypto.randomUUID()}`;await db.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)").bind(redoKey,JSON.stringify({type:"product_update",label:action.label,before:current}),new Date().toISOString()).run();
 }else if(action.type==="product_delete"){
  const cols=Object.keys(before);const values=cols.map(k=>before[k]);await db.prepare(`INSERT INTO products (${cols.join(",")}) VALUES (${cols.map(()=>"?").join(",")})`).bind(...values).run();
 }else return Response.json({error:"Cette action ne peut pas encore être annulée."},{status:400});
 await db.prepare("DELETE FROM settings WHERE key=?").bind(action.key).run();return Response.json({success:true,label:action.label});
}
