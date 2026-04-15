import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import { getMonthlyReportsOverview } from "@/lib/admin/automation-metrics";

export const dynamic = "force-dynamic";

export default async function MonthlyReportsDrillDown() {
  const overview = await getMonthlyReportsOverview();
  const stats = overview.lastRun?.stats || {};

  return (
    <DrillDownShell overview={overview}>
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Last run details</h2>
        {overview.lastRun && overview.lastRun.status !== "never_run" ? (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Scanned" value={(stats.scanned as number) || 0} />
            <Stat label="Emailed" value={(stats.emailed as number) || 0} />
            <Stat label="Skipped (no leads)" value={(stats.skipped_no_leads as number) || 0} />
            <Stat label="Errored" value={(stats.errored as number) || 0} />
          </dl>
        ) : (
          <p className="text-xs text-slate-500">Never run. The cron fires on the 1st of each month at 9am AEST.</p>
        )}
        <p className="text-[0.7rem] text-slate-500 mt-4">
          Each advisor with at least one lead last month receives a performance email with leads received /
          responded / converted, average response time, and percentile rank across peers in the same category.
        </p>
      </section>
    </DrillDownShell>
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
