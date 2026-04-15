import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import {
  listRecentPeriods,
  closePeriod,
} from "@/lib/financial-periods";

export const runtime = "nodejs";

/**
 * /api/admin/financial-periods
 *
 *   GET  — list the last 24 closed/closing/open periods
 *   POST — body: { period_start, period_end, notes? }
 *          Manually close a period. Usually the cron handles this
 *          on the 2nd of each month but admins can trigger an
 *          early close (e.g. for an audit snapshot).
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const items = await listRecentPeriods(24);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const periodStart = typeof body.period_start === "string" ? body.period_start : null;
  const periodEnd = typeof body.period_end === "string" ? body.period_end : null;
  const notes = typeof body.notes === "string" ? body.notes : undefined;

  if (!periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "Missing period_start or period_end (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  // Shape check — must be a valid YYYY-MM-DD date string
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    return NextResponse.json(
      { error: "Dates must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const result = await closePeriod({
    periodStart,
    periodEnd,
    closedBy: `admin:${guard.email}`,
    notes,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason || "close_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    period: result.period,
    summary: result.summary,
    already_closed: result.reason === "already_closed",
  });
}
