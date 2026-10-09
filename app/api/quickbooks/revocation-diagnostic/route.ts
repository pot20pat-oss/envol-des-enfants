import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { SANDBOX_REVOCATION_FENCE } from "@/lib/quickbooks-oauth";

/** Read-only, admin-only diagnostic. Never decrypts or returns any OAuth token. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const database = cmsEnv().DB;
  const [pending, connection] = await Promise.all([
    database.prepare(
      "SELECT created_at FROM quickbooks_oauth_states WHERE state_hash=?",
    ).bind(SANDBOX_REVOCATION_FENCE).first<{ created_at: string }>(),
    database.prepare(
      "SELECT realm_id,updated_at FROM quickbooks_connections WHERE environment='sandbox'",
    ).first<{ realm_id: string; updated_at: string }>(),
  ]);
  return Response.json({
    environment: "sandbox",
    revocation_pending: Boolean(pending),
    pending_since: pending?.created_at ?? null,
    connection_present: Boolean(connection),
    // No tokens, encryption material, or Intuit API calls in this response.
    manual_review_required: Boolean(pending),
    next_step: pending
      ? "Do not clear the revocation fence until Intuit's revocation outcome and local connection have been reviewed."
      : "No pending revocation fence.",
  }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
