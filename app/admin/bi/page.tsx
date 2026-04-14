import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Exec BI dashboard.
 *
 * Reads the last 30 days from warehouse_daily_facts and renders
 * a grid of sparklines per metric. Keeps the queries cheap (one
 * select, no joins) because the warehouse cron already did the
 * aggregation work.
 */
const METRIC_GROUPS: Array<{
  title: string;
  metrics: Array<{ key: string; label: string; format?: "number" | "currency" | "decimal" }>;
}> = [
  {
    title: "Acquisition",
    metrics: [
      { key: "quiz_leads_captured", label: "Quiz leads" },
      { key: "newsletter_signups", label: "Newsletter signups" },
      { key: "advisors_signed_up", label: "New advisors" },
      { key: "advisors_active_snapshot", label: "Active advisors" },
    ],
  },
  {
    title: "Engagement",
    metrics: [
      { key: "advisor_enquiries", label: "Advisor enquiries" },
      { key: "broker_affiliate_clicks", label: "Affiliate clicks" },
    ],
  },
  {
    title: "Quality",
    metrics: [
      { key: "nps_responses", label: "NPS responses" },
      { key: "nps_avg_score", label: "NPS avg score", format: "decimal" },
      { key: "disputes_opened", label: "Disputes opened" },
      { key: "disputes_auto_refunded", label: "Auto-refunded" },
      { key: "total_refunded_cents", label: "Refunded ($)", format: "currency" },
    ],
  },
];

export default async function BIPage() {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const { data } = await admin
    .from("warehouse_daily_facts")
    .select("day, metric_name, metric_value")
    .gte("day", thirtyDaysAgo)
    .order("day", { ascending: true })
    .limit(10_000);

  const byMetric = new Map<string, Array<{ day: string; value: number }>>();
  for (const row of data || []) {
    const name = row.metric_name as string;
    if (!byMetric.has(name)) byMetric.set(name, []);
    byMetric.get(name)!.push({
      day: row.day as string,
      value: Number(row.metric_value) || 0,
    });
  }

  return (
    <AdminShell title="Business intelligence" subtitle="30-day exec view from the warehouse">
      <div className="p-4 md:p-6 max-w-6xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        {byMetric.size === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-sm text-amber-900">
            Warehouse is empty. Run{" "}
            <code className="font-mono">/api/cron/warehouse-rollup</code> to populate it.
          </div>
        )}

        <div className="space-y-6">
          {METRIC_GROUPS.map((group) => (
            <section
              key={group.title}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <h2 className="text-sm font-bold text-slate-900 mb-4">{group.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.metrics.map((m) => {
                  const points = byMetric.get(m.key) || [];
                  const latest = points[points.length - 1]?.value || 0;
                  const total = points.reduce((s, p) => s + p.value, 0);
                  return (
                    <MetricCard
                      key={m.key}
                      label={m.label}
                      latest={latest}
                      total={total}
                      format={m.format || "number"}
                      points={points}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-8 pt-5 border-t border-slate-200 text-[0.65rem] text-slate-500">
          Rollup runs daily at 01:30 UTC. Metrics are append-only,
          safe to re-query, and include the last 3 days on every run
          to catch late-arriving events.
        </footer>
      </div>
    </AdminShell>
  );
}

function MetricCard({
  label,
  latest,
  total,
  format,
  points,
}: {
  label: string;
  latest: number;
  total: number;
  format: "number" | "currency" | "decimal";
  points: Array<{ day: string; value: number }>;
}) {
  const formatted = (v: number) => {
    if (format === "currency") return `$${(v / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
    if (format === "decimal") return v.toFixed(1);
    return v.toLocaleString("en-AU");
  };

  // Mini sparkline
  const max = Math.max(1, ...points.map((p) => p.value));
  const width = 200;
  const height = 40;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - (p.value / max) * height).toFixed(1)}`)
    .join(" ");

  return (
    <div className="border border-slate-100 rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-2 gap-2">
        <div>
          <div className="text-[0.6rem] uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-xl font-bold text-slate-900">{formatted(latest)}</div>
        </div>
        <div className="text-right">
          <div className="text-[0.6rem] uppercase tracking-wider text-slate-500">30d total</div>
          <div className="text-xs font-mono text-slate-700">{formatted(total)}</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" aria-hidden="true">
        {points.length > 0 && (
          <path d={path} fill="none" stroke="#0f172a" strokeWidth="1.5" />
        )}
      </svg>
    </div>
  );
}
