import { allowedEmails, body, bootstrapAdmins, cmsEnv, createSession, currentAdmin, deleteSession, hashPassword, stringValue } from "@/lib/cms";

export async function GET(request: Request) {
  try {
    const admin = await currentAdmin(request);
    return Response.json({ authenticated: Boolean(admin), admin });
  } catch {
    return Response.json({ authenticated: false, configured: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await bootstrapAdmins();
    const data = await body(request);
    const email = stringValue(data.email).toLowerCase();
    const password = stringValue(data.password);
    const runtime = cmsEnv();
    if (!allowedEmails(runtime).includes(email)) return Response.json({ error: "Identifiants invalides." }, { status: 401 });
    const admin = await runtime.DB.prepare("SELECT id, email, name, password_hash, salt FROM admins WHERE email = ? AND active = 1")
      .bind(email).first<{ id: string; email: string; name: string; password_hash: string; salt: string }>();
    if (!admin || await hashPassword(password, admin.salt) !== admin.password_hash) return Response.json({ error: "Identifiants invalides." }, { status: 401 });
    await runtime.DB.prepare("UPDATE admins SET last_login_at = ? WHERE id = ?").bind(new Date().toISOString(), admin.id).run();
    return Response.json({ admin: { id: admin.id, email: admin.email, name: admin.name } }, { headers: { "Set-Cookie": await createSession(admin.id) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Connexion impossible." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  return Response.json({ success: true }, { headers: { "Set-Cookie": await deleteSession(request) } });
}
