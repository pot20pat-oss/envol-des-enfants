import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { decryptSandboxTokens, sandboxCredentials } from "@/lib/quickbooks-oauth";

const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

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
    const stored = await decryptSandboxTokens(credentials.tokenEncryptionKey, connection.realm_id, connection.encrypted_tokens);
    refreshToken = stored.refresh_token;
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
