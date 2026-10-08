import { cmsEnv } from "@/lib/cms";
import {
  clearStateCookie, encryptSandboxTokens, exchangeAuthorizationCode,
  sandboxCredentials, stateCookie, stateHash,
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
  const pending = await database.prepare(
    "SELECT admin_id,expires_at FROM quickbooks_oauth_states WHERE state_hash=?",
  ).bind(digest).first<{ admin_id: string; expires_at: string }>();

  if (!pending || pending.expires_at <= new Date().toISOString()) {
    return responseWithClearedCookie("Lien d'autorisation expiré. Recommencez depuis le CMS.", 400);
  }

  // Single use: reject replay even if the authorization code is repeated.
  await database.prepare("DELETE FROM quickbooks_oauth_states WHERE state_hash=?").bind(digest).run();

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
    await database.prepare(
      "INSERT INTO quickbooks_connections (environment,realm_id,encrypted_tokens,connected_at,updated_at) " +
      "VALUES ('sandbox',?,?,?,?) ON CONFLICT(environment) DO UPDATE SET " +
      "realm_id=excluded.realm_id,encrypted_tokens=excluded.encrypted_tokens," +
      "connected_at=excluded.connected_at,updated_at=excluded.updated_at",
    ).bind(realmId, encrypted, now, now).run();

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
