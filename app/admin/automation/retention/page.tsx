import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cohort retention dashboard.
 *
 * Reads `advisor_cohort_metrics` (materialised view refreshed by
 * the job-queue worker) and renders month-by-month signups +
 * still-active counts + retention %.
 *
 * The LTV column approximates revenue potential: the sum of
 * credit_balance_cents for the cohort, divided by signup count,
 * converted to AUD. This is a rough proxy — a proper LTV would
 * plug in the advisor_billing table over time — but it gives
 * exec visibility without a warehouse.
 */
export default async function RetentionPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_cohort_metrics")
    .select("*")
    .order("cohort_month", { ascending: false })
    .limit(24);

  const rows = data || [];

  return (
    <AdminShell title="Cohort retention" subtitle="Monthly advisor cohorts — signup → still active → rough LTV">
      <div className="p-4 md:p-6 max-w-5xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Advisor cohorts</h2>
              <p className="text-[0.65rem] text-slate-500">
                Materialised view — refresh nightly via the job queue
              </p>
            </div>
            <form action="/api/admin/cohort/refresh" method="POST">
              <button
                type="submit"
                className="px-3 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                ↻ Refresh now
              </button>
            </form>
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 text-left font-semibold">Cohort</th>
                <th className="px-4 py-2 text-right font-semibold">Signed up</th>
                <th className="px-4 py-2 text-right font-semibold">Still active</th>
                <th className="px-4 py-2 text-right font-semibold">Retention %</th>
                <th className="px-4 py-2 text-right font-semibold">Credit balance (AUD)</th>
                <th className="px-4 py-2 w-32">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No cohort data yet. Wait for the nightly refresh or click
                    &quot;Refresh now&quot; above.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const retention = Number(row.retention_pct) || 0;
                const bucket =
                  retention >= 80 ? "emerald" : retention >= 60 ? "amber" : "red";
                return (
                  <tr
                    key={row.cohort_month as string}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-slate-700">
                      {new Date(row.cohort_month as string).toLocaleDateString("en-AU", {
                        year: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                      {(row.advisors_signed_up as number).toLocaleString("en-AU")}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                      {(row.advisors_still_active as number).toLocaleString("en-AU")}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      <span
                        className={
                          bucket === "emerald"
                            ? "text-emerald-700"
                            : bucket === "amber"
                              ? "text-amber-700"
                              : "text-red-700"
                        }
                      >
                        {retention.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                      $
                      {Math.round(
                        Number(row.total_credit_balance_cents || 0) / 100,
                      ).toLocaleString("en-AU")}
                    </td>
                    <td className="px-4 py-2 w-32">
                      <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                        <div
                          className={`h-full ${
                            bucket === "emerald"
                              ? "bg-emerald-500"
                              : bucket === "amber"
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, retention)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
