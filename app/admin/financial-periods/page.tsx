import AdminShell from "@/components/AdminShell";
import { listRecentPeriods, previousMonthBounds } from "@/lib/financial-periods";
import FinancialPeriodsClient from "./FinancialPeriodsClient";

export const dynamic = "force-dynamic";

/**
 * Admin page for month-end close (financial_periods).
 *
 * Shows every period the automation has touched, their close
 * status, audit row counts and the captured revenue summary.
 * Gives finance the ability to trigger an early close or re-run
 * the rollup for a specific month when a dispute arrives late.
 */
export default async function AdminFinancialPeriodsPage() {
  const periods = await listRecentPeriods(24);
  const lastMonth = previousMonthBounds();

  return (
    <AdminShell title="Financial periods (month-end close)">
      <div className="max-w-5xl">
        <p className="text-sm text-slate-600 mb-6">
          Once a period is marked <code className="text-xs bg-slate-100 px-1 rounded">closed</code>,
          <code className="text-xs bg-slate-100 px-1 rounded">recordFinancialAudit()</code> refuses
          to insert rows dated inside that window. AFSL s912D requires this
          immutability. The nightly cron closes last month automatically on
          the 2nd at 03:00 AEST.
        </p>

        <FinancialPeriodsClient
          initialPeriods={periods.map((p) => ({
            id: p.id,
            period_start: p.period_start,
            period_end: p.period_end,
            status: p.status,
            closed_at: p.closed_at,
            closed_by: p.closed_by,
            audit_row_count: p.audit_row_count,
            total_credits_cents: p.total_credits_cents,
            total_refunds_cents: p.total_refunds_cents,
            notes: p.notes,
          }))}
          defaultPeriodStart={lastMonth.start}
          defaultPeriodEnd={lastMonth.end}
        />
      </div>
    </AdminShell>
  );
}
