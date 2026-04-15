import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

/**
 * GET /api/admin/reports/afsl-monthly?month=YYYY-MM
 *
 * Generates a compliance-ready summary of financial + moderation
 * activity for an AFSL audit. Default month is the previous month.
 *
 * The JSON body is what the monthly report needs — admins open it
 * in the browser, paste to a template doc, sign, and file. We
 * don't generate a PDF server-side because that pulls in headless
 * Chromium, which is a lot of weight for a monthly export.
 *
 * Covers:
 *   1. Financial audit — refunds, credit adjustments, disputes
 *      resolved, total refunded cents, top 10 reason strings
 *   2. AFSL verification — advisor applications verified vs.
 *      escalated by the ASIC register lookup
 *   3. Photo moderation — checks, rejections, flags
 *   4. Text moderation — reviews auto-published / auto-rejected /
 *      escalated
 *   5. Kill switches — any flag that was flipped during the month
 *   6. SLO incidents — severity breakdown + resolution count
 *
 * One-shot report: no DB writes, purely aggregation.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const monthParam = request.nextUrl.searchParams.get("month");
  const { start, end, label } = resolveMonth(monthParam);

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [
    financial,
    advisorApps,
    photoMod,
    textModBroker,
    textModAdvisor,
    killSwitchLog,
    sloIncidents,
    disputeRows,
  ] = await Promise.all([
    admin
      .from("financial_audit_log")
      .select("action, amount_cents, reason")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    admin
      .from("advisor_applications")
      .select("status, reviewed_by, verification_result")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    admin
      .from("photo_moderation_log")
      .select("verdict")
      .gte("checked_at", startIso)
      .lt("checked_at", endIso),
    admin
      .from("user_reviews")
      .select("auto_moderated_verdict")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    admin
      .from("professional_reviews")
      .select("auto_moderated_verdict")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    admin
      .from("admin_action_log")
      .select("feature, action, target_verdict, reason, admin_email, created_at")
      .eq("action", "kill_switch")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    admin
      .from("slo_incidents")
      .select("severity, slo_name, started_at, resolved_at")
      .gte("started_at", startIso)
      .lt("started_at", endIso),
    admin
      .from("lead_disputes")
      .select("status, refunded_cents, auto_resolved_verdict")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
  ]);

  const financialRows = financial.data || [];
  const advisorAppsRows = advisorApps.data || [];
  const photoRows = photoMod.data || [];
  const textBrokerRows = textModBroker.data || [];
  const textAdvisorRows = textModAdvisor.data || [];
  const killRows = killSwitchLog.data || [];
  const sloRows = sloIncidents.data || [];
  const disputesRows = disputeRows.data || [];

  const totalRefundedCents = financialRows
    .filter((r) => r.action === "refund")
    .reduce((s, r) => s + ((r.amount_cents as number | null) || 0), 0);

  const report = {
    report_type: "afsl_monthly",
    month_label: label,
    period: { start: startIso, end: endIso },
    generated_at: new Date().toISOString(),
    generated_by: guard.email,
    financial_audit: {
      total_rows: financialRows.length,
      by_action: tallyField(financialRows, "action"),
      total_refunded_cents: totalRefundedCents,
      total_refunded_aud: (totalRefundedCents / 100).toFixed(2),
    },
    advisor_verification: {
      total: advisorAppsRows.length,
      by_status: tallyField(advisorAppsRows, "status"),
      auto_reviewed: advisorAppsRows.filter((r) => r.reviewed_by === "auto").length,
    },
    photo_moderation: {
      total_checks: photoRows.length,
      by_verdict: tallyField(photoRows, "verdict"),
    },
    text_moderation: {
      user_reviews: {
        total: textBrokerRows.length,
        by_verdict: tallyField(textBrokerRows, "auto_moderated_verdict"),
      },
      professional_reviews: {
        total: textAdvisorRows.length,
        by_verdict: tallyField(textAdvisorRows, "auto_moderated_verdict"),
      },
    },
    lead_disputes: {
      total: disputesRows.length,
      by_status: tallyField(disputesRows, "status"),
      by_auto_verdict: tallyField(disputesRows, "auto_resolved_verdict"),
      total_refunded_cents: disputesRows.reduce(
        (s, r) => s + ((r.refunded_cents as number | null) || 0),
        0,
      ),
    },
    kill_switches_flipped: killRows.map((r) => ({
      feature: r.feature,
      verdict: r.target_verdict,
      admin: r.admin_email,
      reason: r.reason,
      when: r.created_at,
    })),
    slo_incidents: {
      total: sloRows.length,
      by_severity: tallyField(sloRows, "severity"),
      unresolved: sloRows.filter((r) => !r.resolved_at).length,
    },
  };

  return NextResponse.json(report, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="afsl-monthly-${label}.json"`,
    },
  });
}

function tallyField(
  rows: Array<Record<string, unknown>>,
  field: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = (row[field] as string) || "null";
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function resolveMonth(param: string | null): { start: Date; end: Date; label: string } {
  const now = new Date();
  let year: number;
  let month: number;
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    year = y;
    month = m - 1;
  } else {
    // Default to last month
    const d = new Date(now);
    d.setUTCMonth(d.getUTCMonth() - 1);
    year = d.getUTCFullYear();
    month = d.getUTCMonth();
  }
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const label = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { start, end, label };
}
