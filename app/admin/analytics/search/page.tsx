import AdminShell from "@/components/AdminShell";
import { topQueries, zeroResultQueries } from "@/lib/search-analytics";
import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * /admin/analytics/search — top queries + zero-result report.
 *
 * Editorial uses this daily to decide what content to write next.
 * A query showing up 10+ times with result_count=0 is a direct
 * signal of a content gap.
 */
export default async function AdminSearchAnalyticsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin");

  const [top30, zeros] = await Promise.all([
    topQueries({ daysBack: 30, limit: 50 }),
    zeroResultQueries({ daysBack: 30, limit: 30 }),
  ]);

  const totalQueries = top30.reduce((s, r) => s + r.count, 0);

  return (
    <AdminShell title="Search analytics">
      <div className="max-w-5xl space-y-8">
        <section>
          <p className="text-sm text-slate-600">
            Last 30 days: <strong>{totalQueries.toLocaleString()}</strong>{" "}
            captured searches across every site surface. PII is redacted at
            write time — emails, phone numbers, TFNs and card numbers never
            land in the log.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Top queries ({top30.length})
          </h2>
          {top30.length === 0 ? (
            <p className="text-sm text-slate-500">
              No search queries captured yet. Wire the{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">
                /api/analytics/search-log
              </code>{" "}
              call into the search inputs on /articles, /advisors and /compare.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Query</th>
                    <th className="text-right px-3 py-2">Count</th>
                    <th className="text-right px-3 py-2">Avg results</th>
                    <th className="text-right px-3 py-2">Click rate</th>
                  </tr>
                </thead>
                <tbody>
                  {top30.map((r) => (
                    <tr key={r.query_text} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-slate-800">
                        {r.query_text}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.count}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {r.avg_results != null ? r.avg_results.toFixed(1) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {(r.click_rate * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Zero-result queries (content gaps)
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            These are searches that returned zero hits. Each one is a content
            idea — write a piece answering it and the next reader gets a match.
          </p>
          {zeros.length === 0 ? (
            <p className="text-sm text-slate-500">
              No zero-result queries recorded.
            </p>
          ) : (
            <ul className="space-y-1">
              {zeros.map((r) => (
                <li
                  key={r.query_text}
                  className="flex justify-between rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
                >
                  <span className="font-mono text-amber-900">
                    {r.query_text}
                  </span>
                  <span className="font-bold text-amber-700">
                    {r.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
