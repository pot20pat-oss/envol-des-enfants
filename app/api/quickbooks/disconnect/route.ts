import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { sandboxCredentials } from "@/lib/quickbooks-oauth";

const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

type TokenEnvelope = { v: number; iv: string; ciphertext: string };

async function readRefreshToken(keyText: string, realmId: string, stored: string): Promise<string> {
  const envelope = JSON.parse(stored) as TokenEnvelope;
  if (envelope.v !== 1 || typeof envelope.iv !== "string" || typeof envelope.ciphertext !== "string") {
    throw new Error("Invalid stored token envelope");
  }
  const decode = (input: string) => Uint8Array.from(atob(input), c => c.charCodeAt(0));
  const keyData = decode(keyText);
  if (keyData.length !== 32) throw new Error("Invalid encryption key length");
  const key = await crypto.subtle.importKey("raw", keyData, "AES-GCM", false, ["decrypt"]);
  const clear = await crypto.subtle.decrypt({
    name: "AES-GCM", iv: decode(envelope.iv),
    additionalData: new TextEncoder().encode(`quickbooks:sandbox:${realmId}`),
  }, key, decode(envelope.ciphertext));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(clear));
  if (!parsed || typeof parsed !== "object" || typeof (parsed as { refresh_token?: unknown }).refresh_token !== "string") {
    throw new Error("Invalid stored refresh token");
  }
  return (parsed as { refresh_token: string }).refresh_token;
}

/** Explicit admin-only Sandbox disconnection. GET and page visits never revoke tokens. */
export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const credentials = sandboxCredentials();
  if (!credentials) return Response.json({ error: "Sandbox not configured" }, { status: 503 });

  const origin = request.headers.get("Origin");
  if (request.headers.get("Sec-Fetch-Site") !== "same-origin" ||
      (origin && origin !== new URL(request.url).origin)) {
    return Response.json({ error: "Cross-site request denied" }, { status: 403 });
  }
  if (!(request.headers.get("Content-Type") || "").startsWith("application/json")) {
    return Response.json({ error: "JSON required" }, { status: 415 });
  }
  const input = await request.json().catch(() => null) as { confirm?: unknown; realmId?: unknown } | null;
  if (input?.confirm !== "REVOKE_SANDBOX_QUICKBOOKS" || typeof input.realmId !== "string") {
    return Response.json({ error: "Explicit confirmation and company identifier required" }, { status: 400 });
  }

  const database = cmsEnv().DB;
  const connection = await database.prepare(
    "SELECT realm_id,encrypted_tokens FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string; encrypted_tokens: string }>();
  if (!connection || connection.realm_id !== input.realmId) {
    return Response.json({ error: "Sandbox connection not found or company mismatch" }, { status: 409 });
  }

  let refreshToken: string;
  try {
    refreshToken = await readRefreshToken(credentials.tokenEncryptionKey, connection.realm_id, connection.encrypted_tokens);
  } catch {
    return Response.json({ error: "Stored Sandbox credentials could not be decrypted" }, { status: 500 });
  }
  let response: Response;
  try {
    response = await fetch(REVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: refreshToken }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return Response.json({ error: "Intuit revocation could not be verified; local connection retained" }, { status: 502 });
  }
  if (!response.ok) {
    return Response.json({ error: `Intuit revocation failed (HTTP ${response.status}); local connection retained` }, { status: 502 });
  }

  // Never delete a newer connection or refreshed credentials in a concurrent request.
  const deleted = await database.prepare(
    "DELETE FROM quickbooks_connections WHERE environment='sandbox' AND realm_id=? AND encrypted_tokens=?",
  ).bind(connection.realm_id, connection.encrypted_tokens).run();
  if (deleted.meta.changes !== 1) {
    return Response.json({
      error: "Intuit accepted revocation, but connection changed concurrently; administrator must review remaining connection",
    }, { status: 409 });
  }
  return Response.json({ disconnected: true, environment: "sandbox" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
