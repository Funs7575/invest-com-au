import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 30;
export const runtime = "nodejs";

interface Tile {
  label: string;
  value: string | number;
  detail?: string;
  intent?: "ok" | "warn" | "fail";
  href?: string;
}

const TILE_INTENT_COLOR: Record<NonNullable<Tile["intent"]>, string> = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  fail: "border-red-200 bg-red-50 text-red-700",
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function lastHourIso(): string {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

async function loadTiles(): Promise<Tile[]> {
  const supabase = createAdminClient();
  const today = startOfTodayIso();
  const hourAgo = lastHourIso();

  const [
    quizCompletes,
    leadSubmits,
    listingEnquiries,
    advisorEnquiries,
    failedCronRuns,
    openIncidents,
    openBugReports,
    syntheticFailures,
  ] = await Promise.all([
    supabase
      .from("form_events")
      .select("id", { count: "exact", head: true })
      .eq("event", "quiz_complete")
      .gte("created_at", today),
    supabase
      .from("form_events")
      .select("id", { count: "exact", head: true })
      .in("event", ["lead_submit", "form_submit"])
      .gte("created_at", today),
    supabase
      .from("listing_enquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("professional_leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("cron_run_log")
      .select("id", { count: "exact", head: true })
      .neq("status", "success")
      .gte("started_at", hourAgo),
    supabase
      .from("slo_incidents")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "acknowledged"]),
    supabase
      .from("bug_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("synthetic_check_runs")
      .select("flow, ok, started_at")
      .order("started_at", { ascending: false })
      .limit(60),
  ]);

  // Reduce synthetic_check_runs to "latest result per flow"
  const seenFlows = new Set<string>();
  const latestPerFlow: Array<{ flow: string; ok: boolean }> = [];
  for (const r of syntheticFailures.data ?? []) {
    if (seenFlows.has(r.flow)) continue;
    seenFlows.add(r.flow);
    latestPerFlow.push({ flow: r.flow, ok: r.ok });
  }
  const failingFlows = latestPerFlow.filter((r) => !r.ok);

  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const deployedAtRaw = process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE
    ?? process.env.VERCEL_DEPLOYMENT_DATE;
  const deployedAt = deployedAtRaw
    ? new Date(deployedAtRaw).toLocaleString("en-AU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const cronFailures = failedCronRuns.count ?? 0;
  const incidents = openIncidents.count ?? 0;
  const newBugs = openBugReports.count ?? 0;

  return [
    {
      label: "Quiz completions today",
      value: quizCompletes.count ?? 0,
      intent: "ok",
    },
    {
      label: "Lead submissions today",
      value: leadSubmits.count ?? 0,
      intent: "ok",
    },
    {
      label: "Listing enquiries today",
      value: listingEnquiries.count ?? 0,
      intent: "ok",
    },
    {
      label: "Advisor enquiries today",
      value: advisorEnquiries.count ?? 0,
      intent: "ok",
    },
    {
      label: "Failed cron runs (last hour)",
      value: cronFailures,
      intent: cronFailures > 0 ? "fail" : "ok",
      href: "/admin/automation/cron-health",
    },
    {
      label: "Open SLO incidents",
      value: incidents,
      intent: incidents > 0 ? "fail" : "ok",
    },
    {
      label: "Latest deploy",
      value: sha,
      detail: deployedAt,
    },
    {
      label: "Open bug reports",
      value: newBugs,
      intent: newBugs > 5 ? "warn" : newBugs > 0 ? "warn" : "ok",
      href: "/admin/bug-reports",
    },
    {
      label: "Synthetic checks failing",
      value: failingFlows.length,
      intent: failingFlows.length > 0 ? "fail" : "ok",
      detail:
        failingFlows.length > 0
          ? failingFlows.map((f) => f.flow).join(", ")
          : "all green",
    },
  ];
}

export default async function LaunchDashboardPage() {
  const tiles = await loadTiles();

  return (
    <AdminShell
      title="Launch dashboard"
      subtitle="Today's signals at a glance — refresh every 30 seconds"
    >
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => {
            const intentClass = tile.intent
              ? TILE_INTENT_COLOR[tile.intent]
              : "border-slate-200 bg-white text-slate-700";
            const inner = (
              <div
                className={
                  "rounded-lg border p-4 shadow-sm transition-colors " +
                  intentClass +
                  (tile.href ? " hover:opacity-90" : "")
                }
              >
                <div className="text-xs font-medium uppercase tracking-wide opacity-70">
                  {tile.label}
                </div>
                <div className="mt-1 text-3xl font-bold">{tile.value}</div>
                {tile.detail && (
                  <div className="mt-1 text-xs opacity-80">{tile.detail}</div>
                )}
              </div>
            );
            return tile.href ? (
              <a key={tile.label} href={tile.href} className="block">
                {inner}
              </a>
            ) : (
              <div key={tile.label}>{inner}</div>
            );
          })}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <p>
            <strong>Cross-references:</strong>{" "}
            <a className="text-emerald-700 hover:underline" href="/admin/bug-reports">
              /admin/bug-reports
            </a>
            {" · "}
            <a className="text-emerald-700 hover:underline" href="/admin/automation/flags">
              /admin/automation/flags
            </a>
            {" · "}
            <a className="text-emerald-700 hover:underline" href="/admin/automation/kill-switch">
              /admin/automation/kill-switch
            </a>
            {" · "}
            <a
              className="text-emerald-700 hover:underline"
              href="https://github.com/Funs7575/invest-com-au/blob/main/docs/ops/launch-ops-plan.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              launch-ops-plan.md
            </a>
            {" · "}
            <a
              className="text-emerald-700 hover:underline"
              href="https://github.com/Funs7575/invest-com-au/blob/main/docs/ops/severity-matrix.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              severity-matrix.md
            </a>
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
