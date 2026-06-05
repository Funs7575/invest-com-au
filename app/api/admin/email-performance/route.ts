/**
 * /api/admin/email-performance — admin-only email-list health data.
 *
 *   GET ?period=7d|30d|90d|all — returns pre-aggregated capture / quiz / drip
 *   metrics plus the recent-bounce list.
 *
 * Why this exists: the admin Email Performance dashboard previously read
 * email_captures, quiz_leads, fee_alert_subscriptions and investor_drip_log
 * through the browser anon client. Post-RLS-hardening, quiz_leads is
 * service-role-only (browser read returned 0, so the Total-List and
 * list-health figures were wrong) and fee_alert_subscriptions / email_captures
 * carry subscriber PII. This route does every read with the service-role
 * client behind the ADMIN_EMAILS guard and aggregates server-side so only
 * counts (plus the bounce addresses the admin is here to action) cross the
 * wire — never the full subscriber list.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:email-performance");

export const runtime = "nodejs";

type Period = "7d" | "30d" | "90d" | "all";

function resolvePeriod(raw: string | null): Period {
  return raw === "7d" || raw === "90d" || raw === "all" ? raw : "30d";
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const period = resolvePeriod(new URL(request.url).searchParams.get("period"));
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 9999;
  const since =
    days < 9999
      ? new Date(Date.now() - days * 86400000).toISOString()
      : "2020-01-01T00:00:00Z";

  const supabase = createAdminClient();

  const [capturesRes, quizRes, feeAlertsRes, bouncedRes, unsubRes, dripsRes, bounceListRes] =
    await Promise.all([
      supabase
        .from("email_captures")
        .select("id, source, created_at, utm_source, status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("quiz_leads").select("email, unsubscribed, created_at").gte("created_at", since),
      supabase.from("fee_alert_subscriptions").select("email, verified"),
      supabase.from("email_captures").select("id", { count: "exact", head: true }).eq("status", "bounced"),
      supabase.from("quiz_leads").select("id", { count: "exact", head: true }).eq("unsubscribed", true),
      supabase
        .from("investor_drip_log")
        .select("email, template_id, sent_at")
        .gte("sent_at", since)
        .order("sent_at", { ascending: false })
        .limit(2000),
      supabase.from("email_captures").select("email, status").eq("status", "bounced").limit(10),
    ]);

  const firstError =
    capturesRes.error ||
    quizRes.error ||
    feeAlertsRes.error ||
    bouncedRes.error ||
    unsubRes.error ||
    dripsRes.error ||
    bounceListRes.error;
  if (firstError) {
    log.error("Email performance read failed", { err: firstError.message });
    return NextResponse.json({ error: "Failed to load email data" }, { status: 500 });
  }

  const captures = capturesRes.data || [];
  const quiz = quizRes.data || [];
  const drips = dripsRes.data || [];

  // Captures by source.
  const srcMap = new Map<string, number>();
  for (const c of captures) srcMap.set(c.source || "unknown", (srcMap.get(c.source || "unknown") || 0) + 1);

  // Captures by UTM source.
  const utmMap = new Map<string, number>();
  for (const c of captures) {
    if (c.utm_source) utmMap.set(c.utm_source, (utmMap.get(c.utm_source) || 0) + 1);
  }

  // Daily captures.
  const dayMap = new Map<string, number>();
  for (const c of captures) {
    const day = new Date(c.created_at).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  }

  // Drips by template.
  const tplMap = new Map<string, number>();
  for (const d of drips) tplMap.set(d.template_id || "unknown", (tplMap.get(d.template_id || "unknown") || 0) + 1);

  return NextResponse.json({
    totalCaptures: captures.length,
    totalQuiz: quiz.length,
    totalFeeAlerts: (feeAlertsRes.data || []).filter((a) => a.verified).length,
    bounced: bouncedRes.count || 0,
    unsubscribed: unsubRes.count || 0,
    dripsSent: drips.length,
    capturesBySource: [...srcMap.entries()].sort((a, b) => b[1] - a[1]),
    capturesByUtm: [...utmMap.entries()].sort((a, b) => b[1] - a[1]),
    dailyCaptures: [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30),
    dripByTemplate: [...tplMap.entries()].sort((a, b) => b[1] - a[1]),
    recentBounces: (bounceListRes.data || []).map((c) => c.email),
  });
}
