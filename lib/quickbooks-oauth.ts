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
