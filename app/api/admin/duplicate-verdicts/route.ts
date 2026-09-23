import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

type Verdict = "confirmed" | "rejected";
function canonicalPair(a: unknown, b: unknown) {
  if (typeof a !== "string" || typeof b !== "string" || !a.trim() || !b.trim() || a === b || a.length > 128 || b.length > 128) return null;
  const [first, second] = [a, b].sort();
  return { first, second, key: JSON.stringify([first, second]) };
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const rows = await cmsEnv().DB.prepare("SELECT pair_key,verdict FROM cms_duplicate_verdicts").all<{pair_key:string;verdict:Verdict}>();
  return Response.json({ verdicts: Object.fromEntries(rows.results.map(row => [row.pair_key,row.verdict])) });
}

export async function PUT(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({error:"JSON invalide."},{status:400}); }
  if (!payload || typeof payload !== "object") return Response.json({error:"Données invalides."},{status:400});
  const data = payload as Record<string,unknown>;
  const pair = canonicalPair(data.productA,data.productB);
  if (!pair || (data.verdict !== "confirmed" && data.verdict !== "rejected" && data.verdict !== null)) return Response.json({error:"Paire ou verdict invalide."},{status:400});
  const db = cmsEnv().DB;
  const existing = await db.prepare("SELECT id FROM products WHERE id IN (?,?)").bind(pair.first,pair.second).all<{id:string}>();
  if (existing.results.length !== 2) return Response.json({error:"Un produit n’existe plus."},{status:404});
  const before = await db.prepare("SELECT verdict FROM cms_duplicate_verdicts WHERE pair_key=?").bind(pair.key).first<{verdict:Verdict}>();
  if ((before?.verdict ?? null) === data.verdict) return Response.json({success:true,verdict:data.verdict});
  const now = new Date().toISOString();
  const event = db.prepare("INSERT INTO cms_duplicate_verdict_events(id,pair_key,product_a,product_b,previous_verdict,next_verdict,decided_by,created_at) VALUES (?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),pair.key,pair.first,pair.second,before?.verdict ?? null,data.verdict,admin.id,now);
  const change = data.verdict === null
    ? db.prepare("DELETE FROM cms_duplicate_verdicts WHERE pair_key=?").bind(pair.key)
    : db.prepare("INSERT INTO cms_duplicate_verdicts(pair_key,product_a,product_b,verdict,decided_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(pair_key) DO UPDATE SET verdict=excluded.verdict,decided_by=excluded.decided_by,updated_at=excluded.updated_at")
      .bind(pair.key,pair.first,pair.second,data.verdict,admin.id,now,now);
  await db.batch([change,event]);
  return Response.json({success:true,verdict:data.verdict});
}
