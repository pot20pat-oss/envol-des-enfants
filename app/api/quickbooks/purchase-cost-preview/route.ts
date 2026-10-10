import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

const REALM = "9341458454408573";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

/**
 * Read-only, admin-only cost comparison for manually verified Québec mappings.
 * Never create mappings, infer SKU identity, update product costs, or touch QuickBooks.
 * Conakry is excluded: GNF cannot be equated with Sandbox company CAD.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const runtime = cmsEnv();
    if (runtime.QUICKBOOKS_MODE !== "sandbox") {
      return Response.json({ verified: false, read_only: true, error: "Mode Sandbox requis." }, { status: 409, headers: HEADERS });
    }
    const auth = await accessTokenForSandbox();
    if (!auth || auth.realmId !== REALM) {
      return Response.json({ verified: false, read_only: true, error: "Connexion Sandbox non vérifiée." }, { status: 409, headers: HEADERS });
    }
    const db = runtime.DB;
    const mappings = await db.prepare(
      "SELECT m.product_id,m.qbo_item_id,m.qbo_item_sku,p.article_number,p.name_fr,p.cost_qc " +
      "FROM quickbooks_product_mappings m JOIN products p ON p.id=m.product_id " +
      "WHERE m.environment='sandbox' AND m.realm_id=? AND m.region='qc' AND m.currency='CAD' " +
      "AND m.state='verified' AND UPPER(TRIM(m.cms_article_number))=UPPER(TRIM(p.article_number)) " +
      "ORDER BY p.article_number LIMIT 11",
    ).bind(REALM).all<{
      product_id: string; qbo_item_id: string; qbo_item_sku: string;
      article_number: string; name_fr: string; cost_qc: number | null;
    }>();
    const rows = mappings.results || [];
    if (rows.length > 10) {
      return Response.json({ verified: false, read_only: true, error: "Plus de 10 correspondances : consultation par lots requise." }, { status: 409, headers: HEADERS });
    }
    const comparisons = [];
    for (const mapping of rows) {
      if (!/^\d{1,30}$/.test(mapping.qbo_item_id)) {
        return Response.json({ verified: false, read_only: true, error: "Identifiant QuickBooks non valide dans une correspondance." }, { status: 409, headers: HEADERS });
      }
      const url = new URL(`https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/query`);
      url.searchParams.set("query", `SELECT * FROM Item WHERE Id = '${mapping.qbo_item_id}'`);
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        return Response.json({ verified: false, read_only: true, error: "Lecture d'un article QuickBooks indisponible.", quickbooks_http_status: response.status }, { status: 502, headers: HEADERS });
      }
      const data = await response.json() as { QueryResponse?: { Item?: Array<{ Id?: string; Sku?: string; PurchaseCost?: number; Type?: string; Active?: boolean }> } };
      const items = data.QueryResponse?.Item || [];
      const item = items.length === 1 ? items[0] : null;
      const identityVerified = !!item && item.Id === mapping.qbo_item_id &&
        item.Sku === mapping.qbo_item_sku && item.Type === "Inventory" && item.Active !== false;
      const qboCostCents = identityVerified && typeof item?.PurchaseCost === "number" &&
        Number.isFinite(item.PurchaseCost) && item.PurchaseCost >= 0
        ? Math.round(item.PurchaseCost * 100) : null;
      comparisons.push({
        product_id: mapping.product_id,
        article_number: mapping.article_number,
        name_fr: mapping.name_fr,
        cms_cost_cents_cad: mapping.cost_qc,
        qbo_item_id: mapping.qbo_item_id,
        qbo_identity_verified: identityVerified,
        qbo_purchase_cost_cents_cad: qboCostCents,
        difference_cents_cad: identityVerified && qboCostCents != null && mapping.cost_qc != null ? qboCostCents - mapping.cost_qc : null,
        eligible_for_manual_review: identityVerified && qboCostCents != null,
      });
    }
    return Response.json({
      verified: true, read_only: true, environment: "sandbox", region: "qc", currency: "CAD",
      cms_costs_modified: false, quickbooks_modified: false, automatic_sync_enabled: false,
      mapping_requirements: "verified + exact article number + exact QuickBooks ID and SKU",
      conakry_excluded: "QuickBooks Sandbox CAD: conversion vers GNF non autorisée.",
      mapped_items_checked: comparisons.length, comparisons,
    }, { headers: HEADERS });
  } catch (cause) {
    console.error("QuickBooks purchase cost preview failed", cause);
    return Response.json({ verified: false, read_only: true, error: "Prévisualisation des coûts indisponible. Aucune donnée modifiée." }, { status: 503, headers: HEADERS });
  }
}
