import AdminShell from "@/components/AdminShell";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface RollupRow {
  run_date: string;
  metric: string;
  page_path: string;
  device_kind: string;
  sample_count: number;
  p50: number;
  p75: number;
  p95: number;
  good_pct: number | null;
  poor_pct: number | null;
}

const THRESHOLDS: Record<string, { good: number; poor: number; unit: string }> = {
  LCP: { good: 2500, poor: 4000, unit: "ms" },
  INP: { good: 200, poor: 500, unit: "ms" },
  CLS: { good: 0.1, poor: 0.25, unit: "" },
  FCP: { good: 1800, poor: 3000, unit: "ms" },
  TTFB: { good: 800, poor: 1800, unit: "ms" },
};

function classify(value: number, metric: string): "good" | "needs" | "poor" {
  const t = THRESHOLDS[metric];
  if (!t) return "needs";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs";
  return "poor";
}

function formatValue(value: number, metric: string): string {
  const t = THRESHOLDS[metric];
  if (!t) return value.toFixed(2);
  if (metric === "CLS") return value.toFixed(3);
  return `${Math.round(value)}${t.unit}`;
}

/**
 * /admin/analytics/perf — 30-day web vitals overview.
 *
 * Groups by metric × page_path × device, shows the latest
 * p75 value + colour-coded tier. Highlights the 10 worst
 * pages so the dev on rotation has one list to attack.
 */
export default async function AdminPerfPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin");

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("web_vitals_daily_rollup")
    .select("*")
    .gte("run_date", since)
    .order("run_date", { ascending: false })
    .limit(2000);

  const rows = (data as RollupRow[] | null) || [];

  // Aggregate: for each (metric, page_path, device), take the
  // latest run_date's row as the "current" p75.
  interface Current {
    row: RollupRow;
    key: string;
  }
  const bucket = new Map<string, Current>();
  for (const r of rows) {
    const key = `${r.metric}|${r.page_path}|${r.device_kind}`;
    const existing = bucket.get(key);
    if (!existing || r.run_date > existing.row.run_date) {
      bucket.set(key, { row: r, key });
    }
  }

  const current = Array.from(bucket.values()).map((c) => c.row);
  // Sort by (metric, p75 desc) so the worst rise to the top of each metric.
  current.sort((a, b) => {
    if (a.metric !== b.metric) return a.metric.localeCompare(b.metric);
    return b.p75 - a.p75;
  });

  // "Top offenders" — per metric, the worst 5 p75s overall
  const worstByMetric = new Map<string, RollupRow[]>();
  for (const r of current) {
    const list = worstByMetric.get(r.metric) || [];
    if (list.length < 5) list.push(r);
    worstByMetric.set(r.metric, list);
  }

  return (
    <AdminShell title="Web vitals">
      <div className="max-w-6xl space-y-8">
        <section>
          <p className="text-sm text-slate-600">
            Rolled up from{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              web_vitals_samples
            </code>{" "}
            daily. Shows the most-recent p75 per page × device × metric. Only
            populated once{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              /api/web-vitals
            </code>{" "}
            is wired into the client (see lib/web-vitals.ts).
          </p>
        </section>

        {current.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              No rollup data yet. The rollup cron runs daily at 01:00 AEST;
              run it manually via{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">
                /api/cron/web-vitals-rollup
              </code>{" "}
              once a few samples have been captured.
            </p>
          </div>
        ) : (
          <>
            {Array.from(worstByMetric.entries()).map(([metric, list]) => (
              <section key={metric}>
                <h2 className="text-base font-bold text-slate-900 mb-3">
                  {metric} — top 5 slowest pages
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2">Page</th>
                        <th className="text-left px-3 py-2">Device</th>
                        <th className="text-right px-3 py-2">Samples</th>
                        <th className="text-right px-3 py-2">p50</th>
                        <th className="text-right px-3 py-2">p75</th>
                        <th className="text-right px-3 py-2">p95</th>
                        <th className="text-right px-3 py-2">Good %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => {
                        const band = classify(r.p75, r.metric);
                        const bandCls =
                          band === "good"
                            ? "bg-emerald-50"
                            : band === "poor"
                              ? "bg-rose-50"
                              : "bg-amber-50";
                        return (
                          <tr
                            key={`${r.metric}-${r.page_path}-${r.device_kind}`}
                            className={`border-t border-slate-100 ${bandCls}`}
                          >
                            <td className="px-3 py-2 font-mono text-slate-800">
                              {r.page_path}
                            </td>
                            <td className="px-3 py-2 text-slate-600 capitalize">
                              {r.device_kind}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                              {r.sample_count}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatValue(r.p50, r.metric)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-bold">
                              {formatValue(r.p75, r.metric)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                              {formatValue(r.p95, r.metric)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                              {r.good_pct != null ? `${r.good_pct}%` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </AdminShell>
  );
}
