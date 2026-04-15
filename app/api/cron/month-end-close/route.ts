import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import {
  closePeriod,
  previousMonthBounds,
  getPeriod,
} from "@/lib/financial-periods";
import { logger } from "@/lib/logger";

const log = logger("cron-month-end-close");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: Month-end close.
 *
 * Runs on the 2nd of each month at 03:00 AEST. Computes the
 * previous month's revenue summary and flips the financial_period
 * status from 'open' → 'closed'. Once closed, recordFinancialAudit
 * refuses to write new rows into that month (AFSL s912D).
 *
 * Idempotent: re-running on an already-closed period is a no-op.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  // Allow the admin to target a specific period via query params
  // (?start=YYYY-MM-DD&end=YYYY-MM-DD) — otherwise close last month.
  const url = new URL(req.url);
  const qStart = url.searchParams.get("start");
  const qEnd = url.searchParams.get("end");

  const bounds = qStart && qEnd
    ? { start: qStart, end: qEnd }
    : previousMonthBounds(new Date());

  const existing = await getPeriod(bounds.start, bounds.end);
  if (existing?.status === "closed") {
    log.info("period already closed", { period: `${bounds.start}/${bounds.end}` });
    return NextResponse.json({
      ok: true,
      already_closed: true,
      period: existing,
    });
  }

  const result = await closePeriod({
    periodStart: bounds.start,
    periodEnd: bounds.end,
    closedBy: req.headers.get("x-admin-manual") || "system:month-end-close",
    notes: "automated month-end close",
  });

  if (!result.ok) {
    log.warn("month-end close failed", { reason: result.reason });
    return NextResponse.json(
      { ok: false, error: result.reason },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    period: result.period,
    summary: result.summary,
  });
}

export const GET = wrapCronHandler("month-end-close", handler);
