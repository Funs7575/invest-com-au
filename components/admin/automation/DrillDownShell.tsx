import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import CronTriggerButton from "@/components/admin/automation/CronTriggerButton";
import type { FeatureOverview } from "@/lib/admin/automation-metrics";

/**
 * Shared header + layout for every automation drill-down page.
 *
 * Renders:
 *   - Breadcrumb back to /admin/automation
 *   - Feature title + description
 *   - Health/pending/7-day stat row
 *   - Manual trigger button (for cron-driven features)
 *   - `children` slot for the feature-specific content (tables, lists)
 */
export default function DrillDownShell({
  overview,
  children,
}: {
  overview: FeatureOverview;
  children: React.ReactNode;
}) {
  return (
    <AdminShell title={overview.display.title} subtitle={overview.display.description}>
      <div className="p-4 md:p-6 max-w-7xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <HealthDot health={overview.health} />
                <h1 className="text-lg md:text-xl font-bold text-slate-900">{overview.display.title}</h1>
              </div>
              <p className="text-sm text-slate-500 max-w-2xl">{overview.display.description}</p>
            </div>
            {overview.display.cronName && (
              <CronTriggerButton cronName={overview.display.cronName} label={`Run ${overview.display.cronName} now`} />
            )}
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-slate-100">
            <Stat label="Pending review" value={overview.pending} />
            <Stat label="Auto-acted (7d)" value={overview.recentCounts.autoActed} />
            <Stat label="Escalated (7d)" value={overview.recentCounts.escalated} />
            <Stat label="Rejected (7d)" value={overview.recentCounts.rejected} />
            <Stat label="Approved (7d)" value={overview.recentCounts.approved} />
          </dl>

          {overview.lastRun && overview.lastRun.status !== "never_run" && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Last run:{" "}
                <strong className="text-slate-700">
                  {overview.lastRun.startedAt ? new Date(overview.lastRun.startedAt).toLocaleString("en-AU") : "—"}
                </strong>
              </span>
              <span>
                Status:{" "}
                <strong className={statusClass(overview.lastRun.status)}>
                  {overview.lastRun.status}
                </strong>
              </span>
              {overview.lastRun.durationMs !== null && (
                <span>
                  Duration: <strong className="text-slate-700">{overview.lastRun.durationMs}ms</strong>
                </span>
              )}
              {overview.lastRun.triggeredBy && (
                <span>
                  Triggered by: <strong className="text-slate-700">{overview.lastRun.triggeredBy}</strong>
                </span>
              )}
            </div>
          )}

          {overview.lastRun?.errorMessage && (
            <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              ⚠ {overview.lastRun.errorMessage}
            </div>
          )}
        </div>

        {children}
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-lg font-bold text-slate-900">{value}</dd>
    </div>
  );
}

function HealthDot({ health }: { health: FeatureOverview["health"] }) {
  const cls: Record<FeatureOverview["health"], string> = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    unknown: "bg-slate-400",
  };
  return <span className={`w-2.5 h-2.5 rounded-full ${cls[health]}`} aria-hidden="true" />;
}

function statusClass(status: string): string {
  switch (status) {
    case "ok":
      return "text-emerald-700";
    case "error":
      return "text-red-700";
    case "partial":
      return "text-amber-700";
    case "running":
      return "text-blue-700";
    default:
      return "text-slate-700";
  }
}
