import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden, hashPassword, stringValue } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const passwordSchema = v.object({
  current_password: v.string(),
  new_password: v.pipe(v.string(), v.minLength(12)),
});

export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  const parsed = await validateJsonBody(request, passwordSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;
  const current = stringValue(data.current_password);
  const next = stringValue(data.new_password);
  const row = await cmsEnv().DB.prepare("SELECT password_hash,salt FROM admins WHERE id=?").bind(admin.id).first<{ password_hash: string; salt: string }>();
  if (!row || await hashPassword(current, row.salt) !== row.password_hash) return Response.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
  const salt = crypto.randomUUID();
  await cmsEnv().DB.prepare("UPDATE admins SET password_hash=?,salt=? WHERE id=?").bind(await hashPassword(next, salt), salt, admin.id).run();
  return Response.json({ success: true });
}
