import { cmsEnv } from "@/lib/cms";
import { currentCustomer } from "@/lib/customer-auth";
import { normalizeMarket } from "@/lib/markets";

export async function GET(request: Request) {
  const customer = await currentCustomer(request);
  if (!customer) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const { results } = await cmsEnv().DB.prepare("SELECT id,product_name,quantity,total,status,region,currency,items_json,created_at FROM orders WHERE lower(customer_email)=lower(?) ORDER BY created_at DESC")
    .bind(String(customer.email)).all();
  return Response.json({ orders: results });
}

export async function POST(request: Request) {
  const customer = await currentCustomer(request);
  if (!customer) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const body = await request.json().catch(()=>null) as { id?: string; action?: string } | null;
  if (!body?.id || body.action !== "cancel") return Response.json({ error: "Requête invalide." }, { status: 400 });
  const db = cmsEnv().DB;
  const order = await db.prepare("SELECT id,status,region,items_json FROM orders WHERE id=? AND lower(customer_email)=lower(?)").bind(body.id,String(customer.email)).first<Record<string,unknown>>();
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });
  if (!["new","confirmed"].includes(String(order.status))) return Response.json({ error: "Cette commande est déjà en préparation ou terminée. Contactez la boutique pour l’annuler." }, { status: 409 });
  const now=new Date().toISOString();
  const region=normalizeMarket(order.region);
  const stockColumn=region==="qc"?"stock_qc":"stock_conakry";
  const statements=[];
  try {
    const items=JSON.parse(String(order.items_json||"[]")) as Array<{product_id?:string;quantity?:number}>;
    for(const item of items) if(item.product_id&&Number(item.quantity)>0) statements.push(db.prepare(`UPDATE products SET ${stockColumn}=${stockColumn}+?,updated_at=? WHERE id=?`).bind(Number(item.quantity),now,String(item.product_id)));
  } catch {}
  statements.push(db.prepare("UPDATE orders SET status='cancelled',updated_at=? WHERE id=?").bind(now,body.id));
  await db.batch(statements);
  return Response.json({ ok:true });
}

export async function DELETE(request: Request) {
  const customer = await currentCustomer(request);
  if (!customer) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const id=new URL(request.url).searchParams.get("id");
  if(!id) return Response.json({error:"Commande invalide."},{status:400});
  const order=await cmsEnv().DB.prepare("SELECT status FROM orders WHERE id=? AND lower(customer_email)=lower(?)").bind(id,String(customer.email)).first<Record<string,unknown>>();
  if(!order) return Response.json({error:"Commande introuvable."},{status:404});
  if(String(order.status)!=="cancelled") return Response.json({error:"La commande doit être annulée avant de pouvoir être supprimée."},{status:409});
  await cmsEnv().DB.prepare("DELETE FROM orders WHERE id=?").bind(id).run();
  return Response.json({ok:true});
}
