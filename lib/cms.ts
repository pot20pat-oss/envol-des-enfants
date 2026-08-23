import { env } from "cloudflare:workers";

export type CmsEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_EMAILS?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
  SESSION_SECRET?: string;
};

const COOKIE = "envol_admin_session";
const SESSION_DAYS = 7;
const encoder = new TextEncoder();

export function cmsEnv(): CmsEnv {
  const runtime = env as unknown as CmsEnv;
  if (!runtime.DB) throw new Error("La base de données D1 n’est pas configurée.");
  return runtime;
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100_000, hash: "SHA-256" }, material, 256);
  return hex(result);
}

export function allowedEmails(runtime: CmsEnv): string[] {
  return (runtime.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export async function bootstrapAdmins(): Promise<void> {
  const runtime = cmsEnv();
  const emails = allowedEmails(runtime);
  const password = runtime.ADMIN_BOOTSTRAP_PASSWORD;
  if (!emails.length || !password || password.length < 12) return;
  for (const email of emails) {
    const existing = await runtime.DB.prepare("SELECT id FROM admins WHERE email = ?").bind(email).first();
    if (existing) continue;
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(password, salt);
    await runtime.DB.prepare("INSERT INTO admins (id, email, name, password_hash, salt, role, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), email, email.split("@")[0], passwordHash, salt, "admin", 1, new Date().toISOString()).run();
  }
}

function cookieToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? null;
}

export async function currentAdmin(request: Request): Promise<{ id: string; email: string; name: string } | null> {
  const token = cookieToken(request);
  if (!token) return null;
  const runtime = cmsEnv();
  const digest = hex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
  const result = await runtime.DB.prepare("SELECT admins.id, admins.email, admins.name FROM sessions INNER JOIN admins ON admins.id = sessions.admin_id WHERE sessions.id = ? AND sessions.expires_at > ? AND admins.active = 1")
    .bind(digest, new Date().toISOString()).first<{ id: string; email: string; name: string }>();
  if (!result || !allowedEmails(runtime).includes(result.email.toLowerCase())) return null;
  return result;
}

export async function createSession(adminId: string): Promise<string> {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const digest = hex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
  const now = new Date();
  await cmsEnv().DB.prepare("INSERT INTO sessions (id, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(digest, adminId, new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString(), now.toISOString()).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}

export async function deleteSession(request: Request): Promise<string> {
  const token = cookieToken(request);
  if (token) {
    const digest = hex(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
    await cmsEnv().DB.prepare("DELETE FROM sessions WHERE id = ?").bind(digest).run();
  }
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function forbidden(): Response {
  return Response.json({ error: "Authentification administrateur requise." }, { status: 401 });
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  const parsed = await request.json();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Requête invalide.");
  return parsed as Record<string, unknown>;
}

export function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}
