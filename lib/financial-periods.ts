/**
 * Financial period (month-end close) helper.
 *
 * A "period" is a calendar month. The lifecycle is:
 *
 *   open    → month is in progress, financial_audit_log rows may
 *             be inserted freely.
 *   closing → month is being reconciled; cron + admin are sweeping
 *             final refunds and generating the revenue_summary.
 *   closed  → period is locked. recordFinancialAudit MUST refuse
 *             inserts whose occurred_at falls inside a closed
 *             period. This is the enforceable "books are sealed"
 *             guarantee AFSL s912D expects.
 *
 * We key by (period_start, period_end) which are always the first
 * and last day of a calendar month.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("financial-periods");

export type PeriodStatus = "open" | "closing" | "closed";

export interface FinancialPeriodRow {
  id: number;
  period_start: string; // date
  period_end: string;   // date
  status: PeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  revenue_summary: Record<string, unknown> | null;
  total_refunds_cents: number | null;
  total_credits_cents: number | null;
  audit_row_count: number | null;
  notes: string | null;
}

function monthBounds(year: number, monthZeroIdx: number) {
  const start = new Date(Date.UTC(year, monthZeroIdx, 1));
  const end = new Date(Date.UTC(year, monthZeroIdx + 1, 0)); // last day
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function previousMonthBounds(now: Date = new Date()) {
  // The "last closed month". Typically run from a cron on the 1st.
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
  return monthBounds(year, month);
}

export async function getPeriod(
  periodStart: string,
  periodEnd: string,
): Promise<FinancialPeriodRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("financial_periods")
      .select("*")
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle();
    return (data as FinancialPeriodRow | null) || null;
  } catch {
    return null;
  }
}

export async function listRecentPeriods(
  limit = 12,
): Promise<FinancialPeriodRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("financial_periods")
      .select("*")
      .order("period_start", { ascending: false })
      .limit(limit);
    return (data as FinancialPeriodRow[] | null) || [];
  } catch {
    return [];
  }
}

/**
 * Returns true if the given timestamp falls inside a period whose
 * status is 'closed'. Used by recordFinancialAudit as a guard.
 *
 * Design note: we check by date range rather than foreign-keying
 * the audit row to a period_id. This keeps inserts fast + allows
 * the audit log to accept rows before we know which period they
 * belong to (e.g., during the pre-close window).
 */
export async function isPeriodClosedAt(at: Date): Promise<boolean> {
  const dateStr = at.toISOString().slice(0, 10);
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("financial_periods")
      .select("status")
      .lte("period_start", dateStr)
      .gte("period_end", dateStr)
      .eq("status", "closed")
      .limit(1);
    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}

export interface CloseResult {
  ok: boolean;
  period?: FinancialPeriodRow;
  reason?: string;
  summary?: {
    audit_row_count: number;
    total_refunds_cents: number;
    total_credits_cents: number;
  };
}

/**
 * Close a calendar month. Idempotent: calling twice on an already-
 * closed period returns ok:true without re-running the sweep.
 *
 * Steps:
 *   1. upsert the period with status='closing'
 *   2. aggregate financial_audit_log rows for the month
 *   3. write the rollup + flip status to 'closed'
 */
export async function closePeriod(input: {
  periodStart: string;
  periodEnd: string;
  closedBy: string;
  notes?: string;
}): Promise<CloseResult> {
  const supabase = createAdminClient();

  // Check current status — bail if already closed.
  const existing = await getPeriod(input.periodStart, input.periodEnd);
  if (existing?.status === "closed") {
    return { ok: true, period: existing, reason: "already_closed" };
  }

  // Upsert to 'closing'
  const { error: upErr } = await supabase.from("financial_periods").upsert(
    {
      period_start: input.periodStart,
      period_end: input.periodEnd,
      status: "closing",
      notes: input.notes ?? null,
    },
    { onConflict: "period_start,period_end" },
  );
  if (upErr) {
    log.warn("closePeriod upsert failed", { error: upErr.message });
    return { ok: false, reason: upErr.message };
  }

  // Aggregate audit rows in the period.
  const { data: auditRows, error: auditErr } = await supabase
    .from("financial_audit_log")
    .select("action, amount_cents")
    .gte("created_at", `${input.periodStart}T00:00:00Z`)
    .lte("created_at", `${input.periodEnd}T23:59:59Z`);

  if (auditErr) {
    log.warn("closePeriod audit query failed", { error: auditErr.message });
    return { ok: false, reason: auditErr.message };
  }

  const rows = (auditRows as { action: string; amount_cents: number | null }[]) || [];
  const audit_row_count = rows.length;
  let total_refunds_cents = 0;
  let total_credits_cents = 0;
  for (const r of rows) {
    const amt = r.amount_cents || 0;
    if (r.action === "refund") total_refunds_cents += amt;
    if (r.action === "credit") total_credits_cents += amt;
  }

  const revenue_summary = {
    audit_row_count,
    total_refunds_cents,
    total_credits_cents,
    computed_at: new Date().toISOString(),
  };

  const { data: closed, error: closeErr } = await supabase
    .from("financial_periods")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: input.closedBy,
      audit_row_count,
      total_refunds_cents,
      total_credits_cents,
      revenue_summary,
    })
    .eq("period_start", input.periodStart)
    .eq("period_end", input.periodEnd)
    .select("*")
    .single();

  if (closeErr) {
    log.warn("closePeriod update failed", { error: closeErr.message });
    return { ok: false, reason: closeErr.message };
  }

  log.info("financial period closed", {
    period: `${input.periodStart}/${input.periodEnd}`,
    audit_row_count,
    total_refunds_cents,
    total_credits_cents,
  });

  return {
    ok: true,
    period: closed as FinancialPeriodRow,
    summary: { audit_row_count, total_refunds_cents, total_credits_cents },
  };
}
