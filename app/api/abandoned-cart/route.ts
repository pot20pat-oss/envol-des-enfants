import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import { validateJsonBody } from "@/lib/api-validation";

const cartSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.minLength(20), v.maxLength(128)),
  region: v.string(),
  customer_name: v.optional(v.string()),
  customer_email: v.optional(v.string()),
  customer_phone: v.optional(v.string()),
  items: v.pipe(v.array(v.object({
    product_id: v.string(),
    name: v.string(),
    quantity: v.pipe(v.number(), v.minValue(1), v.maxValue(99)),
    unit_price: v.number(),
  })), v.minLength(1), v.maxLength(50)),
});

const keyFor = (id:string) => `abandoned_cart:${id}`;

export async function GET(request:Request){
  if(!await currentAdmin(request))return forbidden();
  const regionParam=new URL(request.url).searchParams.get("region");
  const rows=await cmsEnv().DB.prepare("SELECT key,value,updated_at FROM settings WHERE key LIKE 'abandoned_cart:%' ORDER BY updated_at DESC LIMIT 100")
    .all<{key:string;value:string;updated_at:string}>();
  const carts=(rows.results||[]).flatMap(row=>{
    try{
      const value=JSON.parse(row.value) as Record<string,unknown>;
      if(regionParam&&normalizeMarket(value.region)!==normalizeMarket(regionParam))return [];
      return [{...value,id:String(value.id||row.key.slice("abandoned_cart:".length)),updated_at:row.updated_at}];
    }catch{return []}
  });
  return Response.json({carts});
}

export async function POST(request:Request){
  const parsed=await validateJsonBody(request,cartSchema);
  if(!parsed.success)return parsed.response;
  const data=parsed.data;
  const now=new Date().toISOString();
  const total=data.items.reduce((sum,item)=>sum+Number(item.unit_price||0)*item.quantity,0);
  const payload={
    id:data.id,
    region:normalizeMarket(data.region),
    customer_name:String(data.customer_name||"").trim(),
    customer_email:String(data.customer_email||"").trim(),
    customer_phone:String(data.customer_phone||"").trim(),
    items:data.items,
    total,
  };
  await cmsEnv().DB.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at")
    .bind(keyFor(data.id),JSON.stringify(payload),now).run();
  return Response.json({success:true});
}

export async function DELETE(request:Request){
  let body:{id?:string}={};
  try{body=await request.json() as typeof body}catch{}
  const id=String(body.id||"").trim();
  if(id.length<20||id.length>128)return Response.json({error:"Panier invalide."},{status:400});
  await cmsEnv().DB.prepare("DELETE FROM settings WHERE key=?").bind(keyFor(id)).run();
  return Response.json({success:true});
}
