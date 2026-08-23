import { body, cmsEnv, currentAdmin, forbidden, hashPassword, stringValue } from "@/lib/cms";

export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  const data = await body(request);
  const current = stringValue(data.current_password);
  const next = stringValue(data.new_password);
  if (next.length < 12) return Response.json({ error: "Le nouveau mot de passe doit comporter au moins 12 caractères." }, { status: 400 });
  const row = await cmsEnv().DB.prepare("SELECT password_hash,salt FROM admins WHERE id=?").bind(admin.id).first<{ password_hash: string; salt: string }>();
  if (!row || await hashPassword(current, row.salt) !== row.password_hash) return Response.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
  const salt = crypto.randomUUID();
  await cmsEnv().DB.prepare("UPDATE admins SET password_hash=?,salt=? WHERE id=?").bind(await hashPassword(next, salt), salt, admin.id).run();
  return Response.json({ success: true });
}
