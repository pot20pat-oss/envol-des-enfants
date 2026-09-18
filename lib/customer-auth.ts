import { cmsEnv, hashPassword } from "./cms";

const COOKIE = "envol_customer_session";
const encoder = new TextEncoder();

function tokenFrom(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || null;
}

async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function currentCustomer(request: Request) {
  const token = tokenFrom(request);
  if (!token) return null;
  return cmsEnv().DB.prepare("SELECT customers.id,customers.email,customers.name,customers.phone,customers.address,customers.region FROM customer_sessions INNER JOIN customers ON customers.id=customer_sessions.customer_id WHERE customer_sessions.id=? AND customer_sessions.expires_at>?")
    .bind(await digest(token), new Date().toISOString()).first<Record<string, unknown>>();
}

export async function customerSession(customerId: string) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const now = new Date();
  await cmsEnv().DB.prepare("INSERT INTO customer_sessions (id,customer_id,expires_at,created_at) VALUES (?,?,?,?)")
    .bind(await digest(token), customerId, new Date(now.getTime() + 30 * 86400000).toISOString(), now.toISOString()).run();
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 86400}`;
}

export async function clearCustomerSession(request: Request) {
  const token = tokenFrom(request);
  if (token) await cmsEnv().DB.prepare("DELETE FROM customer_sessions WHERE id=?").bind(await digest(token)).run();
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export { hashPassword };
