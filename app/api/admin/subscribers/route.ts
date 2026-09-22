import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = new URL(request.url).searchParams.get("region");
  const { results } = region === "qc" || region === "conakry" ? await cmsEnv().DB.prepare("SELECT * FROM subscribers WHERE region=? ORDER BY created_at DESC").bind(region).all() : await cmsEnv().DB.prepare("SELECT * FROM subscribers ORDER BY created_at DESC").all();
  return Response.json({ subscribers: results });
}


export async function DELETE(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Abonné invalide." }, { status: 400 });
  const database=cmsEnv().DB;const subscriber=await database.prepare("SELECT * FROM subscribers WHERE id=?").bind(id).first<Record<string,unknown>>();if(!subscriber)return Response.json({error:"Abonné introuvable."},{status:404});
  const result = await database.prepare("DELETE FROM subscribers WHERE id=?").bind(id).run();
  if (!result.meta.changes) return Response.json({ error: "Abonné introuvable." }, { status: 404 });
  const undoKey=`cms_undo:${Date.now()}:${crypto.randomUUID()}`;await database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)").bind(undoKey,JSON.stringify({type:"row_delete",table:"subscribers",label:`Suppression abonné · ${String(subscriber.email||id)}`,before:subscriber}),new Date().toISOString()).run();
  return Response.json({ ok: true });
}
