import Link from "next/link";
import type { FeatureOverview } from "@/lib/admin/automation-metrics";

const HEALTH_STYLES: Record<FeatureOverview["health"], string> = {
  green: "bg-emerald-50 border-emerald-200 text-emerald-800",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
  red: "bg-red-50 border-red-200 text-red-800",
  unknown: "bg-slate-50 border-slate-200 text-slate-600",
};

const HEALTH_DOT: Record<FeatureOverview["health"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  unknown: "bg-slate-400",
};

/**
 * A single feature tile on the /admin/automation overview page.
 *
 * Shows:
 *   - Feature title + health dot
 *   - Pending queue count (escalated items waiting for human review)
 *   - Last run time + status (cron-driven features only)
 *   - 7-day auto-acted count
 *   - Click-through to the feature's drill-down page
 */
export default function HealthTile({ overview }: { overview: FeatureOverview }) {
  const { display, pending, lastRun, health, recentCounts } = overview;

  const lastRunLabel = (() => {
    if (!lastRun || lastRun.status === "never_run") {
      return display.cronName ? "Never run" : "—";
    }
    if (!lastRun.startedAt) return "—";
    const diffMs = Date.now() - new Date(lastRun.startedAt).getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  })();

  return (
    <Link
      href={`/admin/automation/${display.slug}`}
      className={`block rounded-xl border p-4 transition hover:shadow-md hover:border-slate-400 ${HEALTH_STYLES[health]}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[health]}`} aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900 truncate">{display.title}</h3>
          </div>
          <p className="text-[0.7rem] text-slate-500 leading-snug line-clamp-2">{display.description}</p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 pt-3 border-t border-black/5">
        <div>
          <dt className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">Pending</dt>
          <dd className="text-base font-bold text-slate-900">{pending}</dd>
        </div>
        <div>
          <dt className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">7-day auto</dt>
          <dd className="text-base font-bold text-slate-900">{recentCounts.autoActed}</dd>
        </div>
        <div>
          <dt className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">Last run</dt>
          <dd className="text-xs font-semibold text-slate-700">{lastRunLabel}</dd>
        </div>
      </dl>

      {lastRun?.errorMessage && (
        <p className="mt-2 text-[0.65rem] text-red-700 line-clamp-2" title={lastRun.errorMessage}>
          ⚠ {lastRun.errorMessage}
        </p>
      )}
    </Link>
  );
}
