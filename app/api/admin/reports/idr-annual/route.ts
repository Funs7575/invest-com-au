import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:reports:idr-annual");

export const runtime = "nodejs";

interface ComplaintRow {
  id: number;
  category: string;
  severity: string;
  status: string;
  submitted_at: string;
  resolved_at: string | null;
  escalated_at: string | null;
  auto_escalated_at: string | null;
  sla_due_at: string;
  reference_id: string;
}

/**
 * /api/admin/reports/idr-annual?year=YYYY[&format=csv]
 *
 * Generates the ASIC Regulatory Guide 271 "Internal Dispute
 * Resolution" annual report. AFSL holders are required to report
 * aggregated complaint data to ASIC each financial year; this
 * endpoint produces the exact summary they ask for:
 *
 *   - Total complaints received
 *   - Breakdown by category (billing / advisor / privacy / etc)
 *   - Breakdown by outcome (resolved / escalated to AFCA / closed)
 *   - SLA compliance: average + % resolved in 30 days
 *   - Escalations to AFCA
 *
 * Defaults to Australian financial year (1 Jul – 30 Jun) unless
 * you pass ?year=2025 which runs for calendar year 2025.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const format = url.searchParams.get("format") || "json";
  const useCalendarYear = !!yearParam;

  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  // AFY: 1 July (year-1) → 30 June (year). Calendar: 1 Jan → 31 Dec.
  const periodStart = useCalendarYear
    ? `${year}-01-01T00:00:00Z`
    : `${year - 1}-07-01T00:00:00Z`;
  const periodEnd = useCalendarYear
    ? `${year}-12-31T23:59:59Z`
    : `${year}-06-30T23:59:59Z`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("complaints_register")
    .select(
      "id, category, severity, status, submitted_at, resolved_at, escalated_at, auto_escalated_at, sla_due_at, reference_id",
    )
    .gte("submitted_at", periodStart)
    .lte("submitted_at", periodEnd)
    .order("submitted_at", { ascending: false });

  if (error) {
    log.error("idr fetch failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data as ComplaintRow[] | null) || [];

  // ── Aggregate ────────────────────────────────────────────────
  const total = rows.length;
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let resolvedCount = 0;
  let resolvedWithinSla = 0;
  let escalatedToAfca = 0;
  let totalResolutionHours = 0;

  for (const row of rows) {
    byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    bySeverity[row.severity] = (bySeverity[row.severity] || 0) + 1;
    if (row.resolved_at) {
      resolvedCount += 1;
      const submittedMs = new Date(row.submitted_at).getTime();
      const resolvedMs = new Date(row.resolved_at).getTime();
      const hours = (resolvedMs - submittedMs) / 3_600_000;
      totalResolutionHours += hours;
      const dueMs = new Date(row.sla_due_at).getTime();
      if (resolvedMs <= dueMs) resolvedWithinSla += 1;
    }
    if (row.status === "escalated_afca" || row.auto_escalated_at) {
      escalatedToAfca += 1;
    }
  }

  const report = {
    period: {
      label: useCalendarYear ? `${year} (calendar)` : `AFY ${year - 1}/${year}`,
      start: periodStart,
      end: periodEnd,
    },
    totals: {
      received: total,
      resolved: resolvedCount,
      escalated_to_afca: escalatedToAfca,
      still_open: total - resolvedCount - escalatedToAfca,
    },
    by_category: byCategory,
    by_status: byStatus,
    by_severity: bySeverity,
    sla: {
      avg_resolution_hours:
        resolvedCount > 0
          ? Math.round((totalResolutionHours / resolvedCount) * 10) / 10
          : 0,
      resolved_within_sla_pct:
        resolvedCount > 0
          ? Math.round((resolvedWithinSla / resolvedCount) * 1000) / 10
          : 0,
    },
    generated_at: new Date().toISOString(),
    generated_by: guard.email,
  };

  if (format === "csv") {
    const headers = [
      "reference_id",
      "category",
      "severity",
      "status",
      "submitted_at",
      "resolved_at",
      "escalated_at",
      "sla_due_at",
      "resolved_within_sla",
    ];
    const lines: string[] = [headers.join(",")];
    for (const row of rows) {
      const resolvedWithin =
        row.resolved_at &&
        new Date(row.resolved_at).getTime() <=
          new Date(row.sla_due_at).getTime();
      lines.push(
        [
          row.reference_id,
          row.category,
          row.severity,
          row.status,
          row.submitted_at,
          row.resolved_at ?? "",
          row.escalated_at ?? "",
          row.sla_due_at,
          resolvedWithin ? "yes" : "no",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="idr-report-${year}.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}
