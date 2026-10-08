import { currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

/** Admin-only, read-only QuickBooks connection check. No invoices or accounting writes. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const auth = await accessTokenForSandbox();
    if (!auth) {
      return Response.json({ connected: false, error: "Connexion Sandbox non configurée." }, {
        status: 503, headers: { "Cache-Control": "no-store" },
      });
    }
    const { realmId, accessToken } = auth;
    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return Response.json({
        connected: true,
        api_verified: false,
        error: `Réponse de l'API QuickBooks Sandbox : HTTP ${response.status}`,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object") throw new Error("Invalid QuickBooks company response");
    const company = (result as Record<string, unknown>).CompanyInfo;
    if (!company || typeof company !== "object") throw new Error("Missing QuickBooks company info");
    const details = company as Record<string, unknown>;
    return Response.json({
      connected: true,
      api_verified: true,
      environment: "sandbox",
      realm_id: realmId,
      company_name: typeof details.CompanyName === "string" ? details.CompanyName : null,
      country: typeof details.Country === "string" ? details.Country : null,
    }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    // Never echo stored tokens, credentials or remote API response content.
    return Response.json({
      connected: false, api_verified: false,
      error: "Vérification QuickBooks impossible. Vérifiez les identifiants Sandbox ou renouvelez l'autorisation.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
