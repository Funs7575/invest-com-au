import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import HealthTile from "@/components/admin/automation/HealthTile";
import {
  getAllFeatureOverviews,
  type FeatureOverview,
} from "@/lib/admin/automation-metrics";

// Server component — fetches every feature overview in parallel.
// `dynamic = "force-dynamic"` because the metrics change minute-to-
// minute and we don't want stale numbers on the dashboard.
export const dynamic = "force-dynamic";

export default async function AdminAutomationPage() {
  const overviews = await getAllFeatureOverviews();

  const healthCounts = {
    green: overviews.filter((o) => o.health === "green").length,
    amber: overviews.filter((o) => o.health === "amber").length,
    red: overviews.filter((o) => o.health === "red").length,
    unknown: overviews.filter((o) => o.health === "unknown").length,
  };

  const needsAttention = buildNeedsAttentionFeed(overviews);

  return (
    <AdminShell title="Automation" subtitle="Classifier health + pending queues + manual controls">
      <div className="p-4 md:p-6 max-w-7xl">
        {/* ── Global nav strip ── */}
        <nav className="flex flex-wrap gap-2 mb-5 text-xs">
          <Link href="/admin/automation/config" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700">
            ⚙ Thresholds
          </Link>
          <Link href="/admin/automation/kill-switch" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700">
            ⏸ Kill switches
          </Link>
          <Link href="/admin/automation/audit-log" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700">
            📜 Audit log
          </Link>
          <Link href="/admin/automation/dry-run" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700">
            🧪 Dry-run tester
          </Link>
          <Link href="/admin/automation/attribution" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700">
            📊 Attribution
          </Link>
          <Link href="/admin/automation/forms" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700">
            📝 Form funnels
          </Link>
          <Link href="/admin/automation/db-health" className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700">
            🗄 DB health
          </Link>
        </nav>

        {/* ── Top summary bar ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <SummaryCard label="Healthy" value={healthCounts.green} dotClass="bg-emerald-500" />
          <SummaryCard label="Warnings" value={healthCounts.amber} dotClass="bg-amber-500" />
          <SummaryCard label="Errors" value={healthCounts.red} dotClass="bg-red-500" />
          <SummaryCard label="Unknown" value={healthCounts.unknown} dotClass="bg-slate-400" />
        </div>

        {/* ── Needs attention feed ── */}
        {needsAttention.length > 0 && (
          <section className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Needs attention</h2>
              <span className="text-xs text-slate-500">{needsAttention.length} items</span>
            </header>
            <ul className="divide-y divide-slate-100">
              {needsAttention.map((item, i) => (
                <li key={i} className="px-4 py-3 flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${item.severity === "red" ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/automation/${item.slug}`}
                      className="text-sm font-semibold text-slate-900 hover:text-amber-600"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Feature tile grid ── */}
        <section>
          <header className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-slate-900">All features</h2>
            <p className="text-xs text-slate-500">Click a tile to drill down, override decisions, and manually trigger crons.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overviews.map((overview) => (
              <HealthTile key={overview.feature} overview={overview} />
            ))}
          </div>
        </section>

        {/* ── Docs / config link ── */}
        <footer className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
          <p>
            Classifier source of truth lives in <code className="bg-slate-100 px-1 rounded">lib/</code>.
            Every cron logs to <code className="bg-slate-100 px-1 rounded">cron_run_log</code> table —
            90-day retention. Override decisions are audited in the
            <code className="bg-slate-100 px-1 rounded">admin_overridden_at / admin_overridden_by</code> columns on each target table.
          </p>
        </footer>
      </div>
    </AdminShell>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: number;
  dotClass: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ─── Needs-attention feed builder ────────────────────────────────────

interface NeedsAttentionItem {
  title: string;
  detail: string;
  slug: string;
  severity: "amber" | "red";
}

function buildNeedsAttentionFeed(overviews: FeatureOverview[]): NeedsAttentionItem[] {
  const items: NeedsAttentionItem[] = [];

  for (const o of overviews) {
    if (o.health === "red") {
      items.push({
        title: o.display.title,
        detail:
          o.lastRun?.errorMessage ||
          (o.pending > 0 ? `${o.pending} items pending — queue is critical` : "Last run errored"),
        slug: o.display.slug,
        severity: "red",
      });
    } else if (o.health === "amber") {
      items.push({
        title: o.display.title,
        detail:
          o.pending > 0
            ? `${o.pending} items pending review`
            : o.lastRun?.status === "partial"
              ? "Last run completed with partial failures"
              : "Last run is overdue",
        slug: o.display.slug,
        severity: "amber",
      });
    }
  }

  return items;
}
