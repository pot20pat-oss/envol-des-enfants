import { cmsEnv } from "@/lib/cms";

export const QUICKBOOKS_CALLBACK = "https://envoldesenfants.com/api/quickbooks/callback";
const AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export type SandboxCredentials = {
  clientId: string;
  clientSecret: string;
  tokenEncryptionKey: string;
};

export function sandboxCredentials(): SandboxCredentials | null {
  const runtime = cmsEnv();
  // Explicit opt-in prevents accidentally connecting a production company.
  if (runtime.QUICKBOOKS_MODE !== "sandbox") return null;
  const clientId = runtime.QUICKBOOKS_CLIENT_ID?.trim();
  const clientSecret = runtime.QUICKBOOKS_CLIENT_SECRET?.trim();
  const tokenEncryptionKey = runtime.QUICKBOOKS_TOKEN_KEY?.trim();
  if (!clientId || !clientSecret || !tokenEncryptionKey) return null;
  return { clientId, clientSecret, tokenEncryptionKey };
}

export function createAuthorizeUrl(clientId: string, state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  url.searchParams.set("redirect_uri", QUICKBOOKS_CALLBACK);
  url.searchParams.set("state", state);
  return url.toString();
}

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function stateHash(state: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function stateCookie(request: Request): string | null {
  const part = (request.headers.get("Cookie") || "").split(";").map(x => x.trim())
    .find(x => x.startsWith("qb_oauth_state="));
  return part ? part.slice("qb_oauth_state=".length) : null;
}

export const clearStateCookie = "qb_oauth_state=; Path=/api/quickbooks/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax";

export async function exchangeAuthorizationCode(code: string, credentials: SandboxCredentials): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: QUICKBOOKS_CALLBACK,
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) throw new Error(`Intuit token endpoint returned HTTP ${response.status}`);
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") throw new Error("Invalid Intuit token response");
  const tokens = result as Record<string, unknown>;
  if (typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string") {
    throw new Error("Incomplete Intuit token response");
  }
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: Number(tokens.expires_in || 3600),
    x_refresh_token_expires_in: Number(tokens.x_refresh_token_expires_in || 0),
  };
}

export async function encryptSandboxTokens(
  tokenEncryptionKey: string, realmId: string, tokens: Awaited<ReturnType<typeof exchangeAuthorizationCode>>,
): Promise<string> {
  const keyBytes = Uint8Array.from(atob(tokenEncryptionKey), c => c.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error("QUICKBOOKS_TOKEN_KEY must encode 32 bytes");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    refresh_expires_at: Date.now() + tokens.x_refresh_token_expires_in * 1000,
  });
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv,
    additionalData: new TextEncoder().encode(`quickbooks:sandbox:${realmId}`),
  }, key, new TextEncoder().encode(payload));
  const base64 = (bytes: Uint8Array) => btoa(Array.from(bytes, c => String.fromCharCode(c)).join(""));
  return JSON.stringify({ v: 1, iv: base64(iv), ciphertext: base64(new Uint8Array(encrypted)) });
}


type StoredSandboxTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at: number;
};

/** Unseal token data saved with AES-GCM, tied to its sandbox company ID. */
async function decryptSandboxTokens(
  encryptionKey: string, realmId: string, encryptedValue: string,
): Promise<StoredSandboxTokens> {
  const envelope: unknown = JSON.parse(encryptedValue);
  if (!envelope || typeof envelope !== "object") throw new Error("Invalid QuickBooks token envelope");
  const { v, iv, ciphertext } = envelope as Record<string, unknown>;
  if (v !== 1 || typeof iv !== "string" || typeof ciphertext !== "string") {
    throw new Error("Unknown QuickBooks token envelope");
  }
  const keyBytes = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error("Invalid QuickBooks encryption key");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const nonce = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  if (nonce.length !== 12) throw new Error("Invalid QuickBooks encryption nonce");
  const encrypted = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const opened = await crypto.subtle.decrypt({
    name: "AES-GCM",
    iv: nonce,
    additionalData: new TextEncoder().encode(`quickbooks:sandbox:${realmId}`),
  }, key, encrypted);
  const value: unknown = JSON.parse(new TextDecoder().decode(opened));
  if (!value || typeof value !== "object") throw new Error("Invalid QuickBooks token data");
  const parsed = value as Record<string, unknown>;
  if (
    typeof parsed.access_token !== "string" ||
    typeof parsed.refresh_token !== "string" ||
    typeof parsed.expires_at !== "number" ||
    typeof parsed.refresh_expires_at !== "number"
  ) throw new Error("Incomplete QuickBooks token data");
  return parsed as StoredSandboxTokens;
}

/** Refreshes a sandbox OAuth token and persists rotated credentials before API use. */
export async function accessTokenForSandbox(): Promise<{ realmId: string; accessToken: string } | null> {
  const credentials = sandboxCredentials();
  if (!credentials) return null;
  const database = cmsEnv().DB;
  const connection = await database.prepare(
    "SELECT realm_id,encrypted_tokens FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string; encrypted_tokens: string }>();
  if (!connection) return null;

  const tokens = await decryptSandboxTokens(
    credentials.tokenEncryptionKey, connection.realm_id, connection.encrypted_tokens,
  );
  if (tokens.expires_at > Date.now() + 90_000) {
    return { realmId: connection.realm_id, accessToken: tokens.access_token };
  }
  if (tokens.refresh_expires_at > 0 && tokens.refresh_expires_at <= Date.now()) {
    throw new Error("QuickBooks sandbox authorization expired; reconnect from the CMS");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`QuickBooks sandbox token refresh failed (${response.status})`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") throw new Error("Invalid QuickBooks refresh response");
  const refreshed = payload as Record<string, unknown>;
  if (typeof refreshed.access_token !== "string" || typeof refreshed.refresh_token !== "string") {
    throw new Error("QuickBooks token refresh returned no tokens");
  }
  const refreshedTokens = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_in: Number(refreshed.expires_in || 3600),
    x_refresh_token_expires_in: Number(refreshed.x_refresh_token_expires_in || 0),
  };
  const sealed = await encryptSandboxTokens(
    credentials.tokenEncryptionKey, connection.realm_id, refreshedTokens,
  );
  // Optimistic update avoids overwriting tokens saved by a concurrent refresh.
  const update = await database.prepare(
    "UPDATE quickbooks_connections SET encrypted_tokens=?,updated_at=? " +
    "WHERE environment='sandbox' AND realm_id=? AND encrypted_tokens=?",
  ).bind(sealed, new Date().toISOString(), connection.realm_id, connection.encrypted_tokens).run();
  if (update.meta.changes === 1) {
    return { realmId: connection.realm_id, accessToken: refreshedTokens.access_token };
  }

  // Another request changed the connection while this refresh was in flight.
  // Never return credentials that were not persisted: reload the winning state.
  const current = await database.prepare(
    "SELECT realm_id,encrypted_tokens FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string; encrypted_tokens: string }>();
  if (!current || current.realm_id !== connection.realm_id) {
    throw new Error("QuickBooks sandbox connection changed during token refresh");
  }
  const persisted = await decryptSandboxTokens(
    credentials.tokenEncryptionKey, current.realm_id, current.encrypted_tokens,
  );
  if (persisted.expires_at <= Date.now() + 90_000) {
    throw new Error("QuickBooks sandbox token refresh conflict; retry the request");
  }
  return { realmId: current.realm_id, accessToken: persisted.access_token };
}
