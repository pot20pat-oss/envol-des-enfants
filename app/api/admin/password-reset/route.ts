import * as v from "valibot";

import { allowedEmails, cmsEnv, hashPassword } from "@/lib/cms";
import { validateJsonBody } from "@/lib/api-validation";

const requestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
});

const resetSchema = v.object({
  token: v.pipe(v.string(), v.trim(), v.minLength(20)),
  new_password: v.pipe(v.string(), v.minLength(12)),
});

const encoder = new TextEncoder();

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendResetEmail(request: Request, email: string, token: string) {
  const runtime = cmsEnv();
  if (!runtime.RESEND_API_KEY) throw new Error("Resend n’est pas configuré.");
  const from = runtime.ORDER_EMAIL_FROM || "L’Envol des Enfants <onboarding@resend.dev>";
  const link = `${new URL(request.url).origin}/admin?reset=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Réinitialisation du mot de passe — L’Envol des Enfants",
      html: `<p>Une demande de réinitialisation du mot de passe administrateur a été reçue.</p><p><a href="${link}">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 30 minutes. Si vous n’avez pas demandé cette modification, ignorez ce courriel.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Envoi Resend impossible (${response.status}).`);
}

export async function POST(request: Request) {
  const parsed = await validateJsonBody(request, requestSchema);
  if (!parsed.success) return parsed.response;

  const runtime = cmsEnv();
  const email = parsed.data.email.toLowerCase();
  const generic = Response.json({ success: true, message: "Si cette adresse est autorisée, un lien de réinitialisation a été envoyé." });

  if (!allowedEmails(runtime).includes(email)) return generic;
  const admin = await runtime.DB.prepare("SELECT id,email FROM admins WHERE LOWER(email)=? AND active=1")
    .bind(email).first<{ id: string; email: string }>();
  if (!admin) return generic;

  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const digest = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const key = `admin_password_reset:${digest}`;

  await runtime.DB.prepare("DELETE FROM settings WHERE key LIKE 'admin_password_reset:%' AND updated_at < ?")
    .bind(new Date(now.getTime() - 60 * 60 * 1000).toISOString()).run();
  await runtime.DB.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at")
    .bind(key, JSON.stringify({ adminId: admin.id, expiresAt }), now.toISOString()).run();

  try {
    await sendResetEmail(request, admin.email, token);
  } catch (error) {
    await runtime.DB.prepare("DELETE FROM settings WHERE key=?").bind(key).run();
    console.error("Admin password reset email failed", error);
    return Response.json({ error: "Le courriel de réinitialisation n’a pas pu être envoyé." }, { status: 502 });
  }

  return generic;
}

export async function PUT(request: Request) {
  const parsed = await validateJsonBody(request, resetSchema);
  if (!parsed.success) return parsed.response;

  const runtime = cmsEnv();
  const digest = await sha256(parsed.data.token);
  const key = `admin_password_reset:${digest}`;
  const row = await runtime.DB.prepare("SELECT value FROM settings WHERE key=?")
    .bind(key).first<{ value: string }>();

  if (!row) return Response.json({ error: "Lien de réinitialisation invalide ou expiré." }, { status: 400 });

  let payload: { adminId?: string; expiresAt?: string } = {};
  try { payload = JSON.parse(row.value) as typeof payload; } catch {}
  if (!payload.adminId || !payload.expiresAt || new Date(payload.expiresAt).getTime() <= Date.now()) {
    await runtime.DB.prepare("DELETE FROM settings WHERE key=?").bind(key).run();
    return Response.json({ error: "Lien de réinitialisation invalide ou expiré." }, { status: 400 });
  }

  const admin = await runtime.DB.prepare("SELECT id,email FROM admins WHERE id=? AND active=1")
    .bind(payload.adminId).first<{ id: string; email: string }>();
  if (!admin || !allowedEmails(runtime).includes(admin.email.toLowerCase())) {
    await runtime.DB.prepare("DELETE FROM settings WHERE key=?").bind(key).run();
    return Response.json({ error: "Compte administrateur invalide." }, { status: 400 });
  }

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(parsed.data.new_password, salt);
  await runtime.DB.batch([
    runtime.DB.prepare("UPDATE admins SET password_hash=?,salt=? WHERE id=?").bind(passwordHash, salt, admin.id),
    runtime.DB.prepare("DELETE FROM sessions WHERE admin_id=?").bind(admin.id),
    runtime.DB.prepare("DELETE FROM settings WHERE key=?").bind(key),
  ]);

  return Response.json({ success: true });
}
