import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Database health dashboard.
 *
 * Three panels, all powered by pg_stat_statements + pg_stat_activity
 * (wrapped in SQL views created by the wave 7 migration):
 *
 *   1. Slow queries — top 50 by mean execution time
 *   2. Connection pool — current connection count per state
 *   3. Retention rules — last run + rows affected
 *
 * Read-only. Every query is bounded to protect the dashboard from
 * runaway rows.
 */
export default async function DbHealthPage() {
  const admin = createAdminClient();

  const [slowRes, poolRes, retentionRes] = await Promise.all([
    admin
      .from("slow_query_snapshot")
      .select("*")
      .order("mean_exec_time", { ascending: false })
      .limit(50),
    admin.from("connection_pool_snapshot").select("*"),
    admin.from("retention_rules").select("*").order("table_name"),
  ]);

  const slow = slowRes.data || [];
  const pool = poolRes.data || [];
  const retention = retentionRes.data || [];

  return (
    <AdminShell title="Database health" subtitle="Slow queries, connection pool, retention">
      <div className="p-4 md:p-6 max-w-6xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        {/* ── Connection pool ── */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Connection pool</h2>
            <p className="text-[0.65rem] text-slate-500">Alert at 85% of Supabase pool cap</p>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
            {pool.length === 0 && (
              <div className="col-span-full text-xs text-slate-500 text-center py-4">
                No connection data — is pg_stat_activity available?
              </div>
            )}
            {pool.map((row) => (
              <div key={(row.state as string) || "null"} className="border border-slate-200 rounded p-3">
                <div className="text-[0.6rem] uppercase tracking-wider text-slate-500">
                  {(row.state as string) || "unknown"}
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {(row.connection_count as number) || 0}
                </div>
                <div className="text-[0.65rem] text-slate-500">
                  max age: {Math.round((row.max_age_seconds as number) || 0)}s
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Slow queries ── */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Slow queries</h2>
            <p className="text-[0.65rem] text-slate-500">Top 50 by mean execution time (ms)</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Query</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Calls</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Mean ms</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Max ms</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Rows</th>
                </tr>
              </thead>
              <tbody>
                {slow.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      No slow queries. All mean exec times below 50ms.
                    </td>
                  </tr>
                )}
                {slow.map((q) => (
                  <tr key={(q.queryid as string | number).toString()} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-mono text-[0.65rem] text-slate-700 max-w-[40ch] truncate" title={q.query_sample as string}>
                      {q.query_sample as string}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {((q.calls as number) || 0).toLocaleString("en-AU")}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {Math.round((q.mean_exec_time as number) || 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {Math.round((q.max_exec_time as number) || 0)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">
                      {((q.rows as number) || 0).toLocaleString("en-AU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Retention rules ── */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900">Retention rules</h2>
            <p className="text-[0.65rem] text-slate-500">GDPR + Privacy Act data trimming policy</p>
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 text-left font-semibold">Table</th>
                <th className="px-4 py-2 text-left font-semibold">Strategy</th>
                <th className="px-4 py-2 text-right font-semibold">Keep days</th>
                <th className="px-4 py-2 text-left font-semibold">Last run</th>
                <th className="px-4 py-2 text-right font-semibold">Last affected</th>
              </tr>
            </thead>
            <tbody>
              {retention.map((r) => (
                <tr key={r.id as number} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{r.table_name as string}</td>
                  <td className="px-4 py-2 text-xs">
                    <span className={`px-2 py-0.5 rounded text-[0.6rem] font-semibold ${r.strategy === "delete" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      {r.strategy as string}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-slate-700">
                    {(r.keep_days as number).toLocaleString("en-AU")}
                  </td>
                  <td className="px-4 py-2 text-[0.65rem] text-slate-500">
                    {r.last_run_at
                      ? new Date(r.last_run_at as string).toLocaleString("en-AU")
                      : "never"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-slate-700">
                    {r.last_rows_affected != null
                      ? (r.last_rows_affected as number).toLocaleString("en-AU")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AdminShell>
  );
}
