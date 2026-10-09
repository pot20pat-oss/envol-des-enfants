import { cmsEnv } from "@/lib/cms";
import {
  clearStateCookie, encryptSandboxTokens, exchangeAuthorizationCode,
  sandboxCredentials, stateCookie, stateHash, SANDBOX_REVOCATION_FENCE,
} from "@/lib/quickbooks-oauth";

function responseWithClearedCookie(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
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
    return responseWithClearedCookie("Autorisation QuickBooks invalide ou expirée. Recommencez depuis le CMS.", 400);
  }

  const database = cmsEnv().DB;
  const digest = await stateHash(state);
  // Atomically consume the state: only one concurrent callback may proceed.
  const consumed = await database.prepare(
    "DELETE FROM quickbooks_oauth_states WHERE state_hash=? AND expires_at>?",
  ).bind(digest, new Date().toISOString()).run();
  if (consumed.meta.changes !== 1) {
    return responseWithClearedCookie("Lien d'autorisation expiré ou déjà utilisé. Recommencez depuis le CMS.", 400);
  }

  if (url.searchParams.get("error")) {
    return responseWithClearedCookie("Connexion QuickBooks annulée. Aucun compte n'a été associé.", 400);
  }

  const code = url.searchParams.get("code") || "";
  const realmId = url.searchParams.get("realmId") || "";
  if (!code || !/^[0-9]{5,25}$/.test(realmId)) {
    return responseWithClearedCookie("Réponse QuickBooks incomplète.", 400);
  }

  const credentials = sandboxCredentials();
  if (!credentials) {
    return responseWithClearedCookie("Mode sandbox QuickBooks non configuré.", 503);
  }

  try {
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
      return responseWithClearedCookie("Une révocation Sandbox exige une vérification administrative avant toute reconnexion.", 409);
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
  } catch (error) {
    // Never log OAuth authorization codes, client secrets or tokens.
    console.error("QuickBooks sandbox OAuth callback failed", error instanceof Error ? error.message : "unknown");
    return responseWithClearedCookie("Connexion QuickBooks impossible. Vérifiez les paramètres Intuit et réessayez.", 502);
  }
}
