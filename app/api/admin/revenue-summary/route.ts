/**
 * /api/admin/revenue-summary — admin-only revenue dashboard data.
 *
 *   GET — returns the anonymised affiliate-click stream plus pre-aggregated
 *         advisor / marketplace / article revenue summaries.
 *
 * Why this exists: the admin Revenue dashboard (app/admin/revenue) previously
 * read advisor_billing, broker_wallets, professional_leads and professionals
 * directly through the browser anon client. After the RLS hardening in
 * #1407–#1410, those tables deny the browser client (broker_wallets is
 * broker_slug-scoped, advisor_billing is is_admin()-only, etc.), so the
 * Cash-Position figures silently read 0. This route moves every privileged
 * read to the service-role client behind the standard ADMIN_EMAILS guard and
 * returns only the aggregates — raw Stripe ids, advisor PII and per-row
 * billing never cross the wire.
 *
 * Affiliate clicks are returned as rows (broker_slug / source / page /
 * created_at only — no PII) because the page does its own period filtering
 * client-side; that table is anon-readable by design.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:revenue-summary");

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();

  const [
    clicksRes,
    brokersRes,
    leadsRes,
    billingRes,
    walletsRes,
    campaignsRes,
    articlesRes,
    prosRes,
    disputesRes,
  ] = await Promise.all([
    supabase
      .from("affiliate_clicks")
      .select("id, broker_slug, broker_name, source, page, created_at, placement_type")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("brokers").select("slug, platform_type").eq("status", "active"),
    supabase.from("professional_leads").select("id, billed, bill_amount_cents, status"),
    supabase.from("advisor_billing").select("id, amount_cents, status"),
    supabase
      .from("broker_wallets")
      .select("balance_cents, lifetime_deposited_cents, lifetime_spent_cents"),
    supabase.from("broker_campaigns").select("id, status").eq("status", "active"),
    supabase
      .from("advisor_articles")
      .select("id, status, price_cents, payment_status")
      .not("status", "eq", "draft"),
    supabase
      .from("professionals")
      .select("id, lead_price_cents, free_leads_used, stripe_customer_id")
      .eq("status", "active"),
    supabase.from("lead_disputes").select("id"),
  ]);

  // Fatal-error check EXCLUDES campaignsRes: the `broker_campaigns` relation
  // does not exist in production (schema drift — see
  // docs/audits/SCHEMA-DRIFT-2026-06-05.md). The pre-#1410 browser dashboard
  // read each table independently and simply showed 0 active campaigns when that
  // query failed; this server route must not let one missing optional table
  // 500 the entire revenue dashboard. activeCampaigns falls back to 0 below.
  const firstError =
    clicksRes.error ||
    brokersRes.error ||
    leadsRes.error ||
    billingRes.error ||
    walletsRes.error ||
    articlesRes.error ||
    prosRes.error ||
    disputesRes.error;
  if (firstError) {
    log.error("Revenue summary read failed", { err: firstError.message });
    return NextResponse.json({ error: "Failed to load revenue data" }, { status: 500 });
  }
  if (campaignsRes.error) {
    log.warn("Revenue summary: broker_campaigns read failed (treating as 0)", {
      err: campaignsRes.error.message,
    });
  }

  // Broker platform-type map (drives the client-side CPA estimate).
  const brokerTypes: Record<string, string> = {};
  for (const b of brokersRes.data || []) {
    brokerTypes[b.slug] = b.platform_type || "share_broker";
  }

  // Advisor revenue — aggregate server-side; nothing per-row leaves.
  const leads = leadsRes.data || [];
  const billing = billingRes.data || [];
  const pros = prosRes.data || [];
  const advisorRev = {
    totalLeads: leads.length,
    billedLeads: leads.filter((l) => l.billed).length,
    freeLeads: leads.filter((l) => !l.billed).length,
    pendingBillingCents: billing
      .filter((b) => b.status === "pending")
      .reduce((s, b) => s + (b.amount_cents || 0), 0),
    paidBillingCents: billing
      .filter((b) => b.status === "paid")
      .reduce((s, b) => s + (b.amount_cents || 0), 0),
    totalBillingCents: billing.reduce((s, b) => s + (b.amount_cents || 0), 0),
    disputedLeads: (disputesRes.data || []).length,
    convertedLeads: leads.filter((l) => l.status === "converted").length,
    activeAdvisors: pros.length,
    stripeConnected: pros.filter((p) => p.stripe_customer_id).length,
    freeLeadsUsed: pros.reduce((s, p) => s + (p.free_leads_used || 0), 0),
    avgLeadPrice:
      pros.length > 0
        ? pros.reduce((s, p) => s + (p.lead_price_cents || 4900), 0) / pros.length
        : 4900,
  };

  // Marketplace revenue — broker_wallets is service-role-only, hence this route.
  const wallets = walletsRes.data || [];
  const marketplaceRev = {
    totalWallets: wallets.length,
    totalBalanceCents: wallets.reduce((s, w) => s + (w.balance_cents || 0), 0),
    totalDepositedCents: wallets.reduce((s, w) => s + (w.lifetime_deposited_cents || 0), 0),
    totalSpentCents: wallets.reduce((s, w) => s + (w.lifetime_spent_cents || 0), 0),
    activeCampaigns: (campaignsRes.data || []).length,
  };

  // Article revenue.
  const articles = articlesRes.data || [];
  const articleRev = {
    totalSubmitted: articles.length,
    totalPublished: articles.filter((a) => a.status === "published").length,
    paidCents: articles
      .filter((a) => a.payment_status === "paid")
      .reduce((s, a) => s + (a.price_cents || 0), 0),
    waivedCents: articles
      .filter((a) => a.payment_status === "waived")
      .reduce((s, a) => s + (a.price_cents || 0), 0),
    unpaidCents: articles
      .filter((a) => a.payment_status === "unpaid" && a.status === "approved")
      .reduce((s, a) => s + (a.price_cents || 0), 0),
  };

  return NextResponse.json({
    clicks: clicksRes.data || [],
    brokerTypes,
    advisorRev,
    marketplaceRev,
    articleRev,
  });
}
