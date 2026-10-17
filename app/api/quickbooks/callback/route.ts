import { cmsEnv } from "@/lib/cms";
import {
  clearStateCookie, encryptSandboxTokens, exchangeAuthorizationCode,
  sandboxCredentials, stateCookie, stateHash, SANDBOX_REVOCATION_FENCE,
} from "@/lib/quickbooks-oauth";

type OAuthOutcome = "invalid-state" | "expired-state" | "cancelled" | "incomplete" | "unconfigured" | "revocation-pending" | "failed";

function redirectWithClearedCookie(outcome: OAuthOutcome): Response {
  // Never leave OAuth codes, state or realmId in the browser URL after a failed callback.
  // Use a fixed same-origin destination and a finite set of non-sensitive status values.
  const location = new URL("https://envoldesenfants.com/admin");
  location.searchParams.set("quickbooks", `sandbox-${outcome}`);
  return new Response(null, {
    status: 303,
    headers: {
      Location: location.toString(),
      "Cache-Control": "no-cache, no-store",
      "Set-Cookie": clearStateCookie,
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const cookie = stateCookie(request);
  if (!/^[a-f0-9]{64}$/.test(state) || cookie !== state) {
    return redirectWithClearedCookie("invalid-state");
  }

  try {
    const database = cmsEnv().DB;
    const digest = await stateHash(state);
    // Atomically consume the state: only one concurrent callback may proceed.
  const consumed = await database.prepare(
    "DELETE FROM quickbooks_oauth_states WHERE state_hash=? AND expires_at>?",
  ).bind(digest, new Date().toISOString()).run();
  if (consumed.meta.changes !== 1) {
    return redirectWithClearedCookie("expired-state");
  }

  if (url.searchParams.get("error")) {
    return redirectWithClearedCookie("cancelled");
  }

  const code = url.searchParams.get("code") || "";
  const realmId = url.searchParams.get("realmId") || "";
  if (!code || !/^[0-9]{5,25}$/.test(realmId)) {
    return redirectWithClearedCookie("incomplete");
  }

  const credentials = sandboxCredentials();
  if (!credentials) {
    return redirectWithClearedCookie("unconfigured");
  }

  {
    const tokens = await exchangeAuthorizationCode(code, credentials);
    const encrypted = await encryptSandboxTokens(credentials.tokenEncryptionKey, realmId, tokens);
    const now = new Date().toISOString();
    // Check the fence in the same SQLite statement that writes the connection.
    // A separate preflight SELECT would leave a race with revocation.
    const saved = await database.prepare(
      "INSERT INTO quickbooks_connections (environment,realm_id,encrypted_tokens,connected_at,updated_at) " +
      "SELECT 'sandbox',?,?,?,? WHERE NOT EXISTS " +
      "(SELECT 1 FROM quickbooks_oauth_states WHERE state_hash=?) " +
      "ON CONFLICT(environment) DO UPDATE SET " +
      "realm_id=excluded.realm_id,encrypted_tokens=excluded.encrypted_tokens," +
      "connected_at=excluded.connected_at,updated_at=excluded.updated_at " +
      "WHERE NOT EXISTS (SELECT 1 FROM quickbooks_oauth_states WHERE state_hash=?)",
    ).bind(realmId, encrypted, now, now, SANDBOX_REVOCATION_FENCE, SANDBOX_REVOCATION_FENCE).run();
    if (saved.meta.changes !== 1) {
      return redirectWithClearedCookie("revocation-pending");
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: "https://envoldesenfants.com/admin?quickbooks=sandbox-connected",
        "Set-Cookie": clearStateCookie,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    // Do not log exception details: upstream errors may contain OAuth secrets.
    console.error("QuickBooks sandbox OAuth callback failed");
    return redirectWithClearedCookie("failed");
  }
}
