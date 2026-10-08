import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { createAuthorizeUrl, randomState, sandboxCredentials, stateHash } from "@/lib/quickbooks-oauth";

export async function GET(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();

  const credentials = sandboxCredentials();
  if (!credentials) {
    return Response.json({
      error: "Connexion QuickBooks en mode sandbox non configurée. Configurez les secrets Worker.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const state = randomState();
  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const database = cmsEnv().DB;
  await database.prepare("DELETE FROM quickbooks_oauth_states WHERE expires_at < ?")
    .bind(now.toISOString()).run();
  await database.prepare(
    "INSERT INTO quickbooks_oauth_states (state_hash,admin_id,expires_at,created_at) VALUES (?,?,?,?)",
  ).bind(await stateHash(state), admin.id, expires, now.toISOString()).run();

  return new Response(null, {
    status: 302,
    headers: {
      Location: createAuthorizeUrl(credentials.clientId, state),
      "Set-Cookie": `qb_oauth_state=${state}; Path=/api/quickbooks/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
