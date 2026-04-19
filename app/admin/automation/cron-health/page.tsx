import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRON_GROUPS } from "@/lib/cron-groups";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Cron observability dashboard.
 *
 * Per-endpoint summary: last-run, last-success, last 24h success rate,
 * avg duration, and a freshness status (green/amber/red) based on how
 * long since the last successful run.
 *
 * Every fan-out through /api/cron/_dispatch/[group] writes a row to
 * public.cron_run_log, so this page shows live data without any
 * additional instrumentation per handler.
 */

interface CronSummary {
  endpoint: string;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorMessage: string | null;
  last24hTotal: number;
  last24hSuccess: number;
  last24hErrors: number;
  avgDurationMs: number | null;
  currentlyRunning: number;
  status: "ok" | "stale" | "failing" | "running" | "never-run";
}

interface CronRunRow {
  name: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  status: string;
  error_message: string | null;
}

const STALE_HOURS_BY_CADENCE: Record<string, number> = {
  // Crons scheduled to run <=hourly: warn after 3h without a successful run.
  hourly: 3,
  // Daily-* schedules: warn after 30h.
  daily: 30,
  // Weekly: warn after 9 days.
  weekly: 24 * 9,
  // Monthly: warn after 35 days.
  monthly: 24 * 35,
};

/**
 * Map a cron group key (e.g. "daily-4") to a coarse cadence the
 * freshness threshold can key off.
 */
function cadenceFor(group: string): keyof typeof STALE_HOURS_BY_CADENCE {
  if (group.startsWith("every-")) return "hourly";
  if (group.startsWith("hourly")) return "hourly";
  if (group.startsWith("daily")) return "daily";
  if (group.startsWith("weekly")) return "weekly";
  if (group.startsWith("monthly")) return "monthly";
  return "daily";
}

/** Every cron endpoint paired with its coarse cadence. */
function enumerateEndpoints(): Array<{ endpoint: string; cadence: string }> {
  const seen = new Map<string, string>();
  for (const [group, endpoints] of Object.entries(CRON_GROUPS)) {
    const cadence = cadenceFor(group);
    for (const endpoint of endpoints) {
      // If an endpoint is in multiple groups, the fastest cadence wins
      // so the stricter threshold applies.
      const existing = seen.get(endpoint);
      if (!existing || cadenceRank(cadence) < cadenceRank(existing)) {
        seen.set(endpoint, cadence);
      }
    }
  }
  return Array.from(seen.entries()).map(([endpoint, cadence]) => ({
    endpoint,
    cadence,
  }));
}

function cadenceRank(c: string): number {
  return { hourly: 0, daily: 1, weekly: 2, monthly: 3 }[c] ?? 1;
}

async function gather(): Promise<CronSummary[]> {
  const supabase = createAdminClient();
  const endpoints = enumerateEndpoints();
  const twentyFourH = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Pull the most recent ~2000 rows once (any single cron firing every
  // 5 min produces 288 rows/day — 2k covers the 24h window for ~6-7
  // crons; the filter below is the real boundary).
  const { data } = await supabase
    .from("cron_run_log")
    .select("name, started_at, ended_at, duration_ms, status, error_message")
    .gte("started_at", twentyFourH)
    .order("started_at", { ascending: false })
    .limit(5000);

  const rowsByEndpoint = new Map<string, CronRunRow[]>();
  for (const row of (data ?? []) as CronRunRow[]) {
    const bucket = rowsByEndpoint.get(row.name) ?? [];
    bucket.push(row);
    rowsByEndpoint.set(row.name, bucket);
  }

  // For crons that haven't run in the last 24h we still need their
  // last-ever run. One follow-up query gets those older rows.
  const silentEndpoints = endpoints
    .map((e) => e.endpoint)
    .filter((e) => !rowsByEndpoint.has(e));

  const silentSamples = new Map<string, CronRunRow>();
  if (silentEndpoints.length > 0) {
    const { data: older } = await supabase
      .from("cron_run_log")
      .select("name, started_at, ended_at, duration_ms, status, error_message")
      .in("name", silentEndpoints)
      .order("started_at", { ascending: false })
      .limit(silentEndpoints.length * 3);
    for (const row of (older ?? []) as CronRunRow[]) {
      if (!silentSamples.has(row.name)) silentSamples.set(row.name, row);
    }
  }

  const now = Date.now();
  return endpoints
    .map(({ endpoint, cadence }) => {
      const rows = rowsByEndpoint.get(endpoint) ?? [];
      const silentSample = silentSamples.get(endpoint);
      const mostRecent = rows[0] ?? silentSample ?? null;
      const mostRecentSuccess =
        rows.find((r) => r.status === "success") ??
        (silentSample?.status === "success" ? silentSample : null);
      const last24hSuccess = rows.filter((r) => r.status === "success").length;
      const last24hErrors = rows.filter((r) => r.status === "error").length;
      const last24hTotal = rows.length;
      const currentlyRunning = rows.filter((r) => r.status === "running").length;
      const durations = rows
        .filter((r) => typeof r.duration_ms === "number")
        .map((r) => r.duration_ms as number);
      const avgDurationMs = durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;

      const staleHours =
        STALE_HOURS_BY_CADENCE[cadence] ?? STALE_HOURS_BY_CADENCE.daily!;

      let status: CronSummary["status"];
      if (!mostRecent) status = "never-run";
      else if (currentlyRunning > 0 && !mostRecentSuccess) status = "running";
      else if (last24hErrors > 0 && last24hSuccess === 0) status = "failing";
      else {
        const lastSuccessMs = mostRecentSuccess
          ? now - new Date(mostRecentSuccess.started_at).getTime()
          : Infinity;
        status = lastSuccessMs > staleHours * 3600_000 ? "stale" : "ok";
      }

      return {
        endpoint,
        lastRunAt: mostRecent ? new Date(mostRecent.started_at) : null,
        lastSuccessAt: mostRecentSuccess
          ? new Date(mostRecentSuccess.started_at)
          : null,
        lastErrorMessage: mostRecent && mostRecent.status === "error"
          ? mostRecent.error_message ?? "Unknown error"
          : null,
        last24hTotal,
        last24hSuccess,
        last24hErrors,
        avgDurationMs,
        currentlyRunning,
        status,
      } satisfies CronSummary;
    })
    .sort((a, z) => {
      // Sort worst-status first, then most recently stale.
      const rank = { failing: 0, "never-run": 1, stale: 2, running: 3, ok: 4 };
      const d = rank[a.status] - rank[z.status];
      if (d !== 0) return d;
      const aMs = a.lastRunAt?.getTime() ?? 0;
      const zMs = z.lastRunAt?.getTime() ?? 0;
      return aMs - zMs;
    });
}

function formatRelative(d: Date | null): string {
  if (!d) return "never";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusBadge(status: CronSummary["status"]) {
  const map = {
    ok: { bg: "bg-emerald-50", text: "text-emerald-800", label: "OK" },
    stale: { bg: "bg-amber-50", text: "text-amber-800", label: "Stale" },
    failing: { bg: "bg-rose-50", text: "text-rose-800", label: "Failing" },
    running: { bg: "bg-sky-50", text: "text-sky-800", label: "Running" },
    "never-run": {
      bg: "bg-slate-100",
      text: "text-slate-700",
      label: "Never run",
    },
  } as const;
  return map[status];
}

export default async function CronHealthPage() {
  const rows = await gather();
  const failing = rows.filter((r) => r.status === "failing").length;
  const stale = rows.filter((r) => r.status === "stale").length;
  const neverRun = rows.filter((r) => r.status === "never-run").length;
  const ok = rows.filter((r) => r.status === "ok").length;
  const running = rows.filter((r) => r.status === "running").length;

  return (
    <AdminShell
      title="Cron health"
      subtitle="Live run-log for every scheduled job"
    >
      <div className="max-w-6xl space-y-6">
        {/* Headline verdict */}
        <div
          className={`rounded-xl border p-5 ${
            failing > 0
              ? "bg-rose-50 border-rose-200"
              : stale > 0 || neverRun > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <p
            className={`text-xs font-extrabold uppercase tracking-wide mb-1 ${
              failing > 0
                ? "text-rose-800"
                : stale > 0 || neverRun > 0
                  ? "text-amber-800"
                  : "text-emerald-800"
            }`}
          >
            Status
          </p>
          <p
            className={`text-lg font-extrabold ${
              failing > 0
                ? "text-rose-900"
                : stale > 0 || neverRun > 0
                  ? "text-amber-900"
                  : "text-emerald-900"
            }`}
          >
            {failing > 0
              ? `${failing} cron(s) failing`
              : stale > 0 || neverRun > 0
                ? `${stale + neverRun} cron(s) stale or never run`
                : `All ${ok} crons healthy`}
          </p>
          <p className="text-xs text-slate-600 mt-2">
            ok: {ok} · stale: {stale} · failing: {failing} · running: {running}{" "}
            · never-run: {neverRun}
          </p>
        </div>

        {/* Per-cron table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-600">
                <th className="px-4 py-2.5">Cron</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Last run</th>
                <th className="px-3 py-2.5">Last success</th>
                <th className="px-3 py-2.5 text-right">24h ok / err</th>
                <th className="px-3 py-2.5 text-right">Avg duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const badge = statusBadge(r.status);
                return (
                  <tr key={r.endpoint} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {r.endpoint.replace(/^\/api\/cron\//, "")}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {formatRelative(r.lastRunAt)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {formatRelative(r.lastSuccessAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className="text-emerald-700">{r.last24hSuccess}</span>
                      <span className="text-slate-400"> / </span>
                      <span
                        className={
                          r.last24hErrors > 0
                            ? "text-rose-700 font-bold"
                            : "text-slate-400"
                        }
                      >
                        {r.last24hErrors}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                      {r.avgDurationMs != null
                        ? `${r.avgDurationMs.toLocaleString("en-AU")} ms`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              No crons registered in <code>lib/cron-groups.ts</code>.
            </div>
          )}
        </div>

        {/* Recent errors */}
        {rows.some((r) => r.lastErrorMessage) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700 mb-3">
              Recent errors
            </h2>
            <ul className="text-xs text-slate-700 space-y-2">
              {rows
                .filter((r) => r.lastErrorMessage)
                .slice(0, 10)
                .map((r) => (
                  <li
                    key={r.endpoint}
                    className="flex flex-col gap-0.5 border-l-2 border-rose-300 pl-3"
                  >
                    <span className="font-mono text-[11px]">{r.endpoint}</span>
                    <span className="text-rose-700">{r.lastErrorMessage}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600">
          <strong className="text-slate-800">How it works:</strong> every cron
          fan-out through <code>/api/cron/_dispatch/[group]</code> writes a row
          to <code>public.cron_run_log</code> on start and updates it on
          finish. Thresholds: ok {"<"}{STALE_HOURS_BY_CADENCE.hourly}h (hourly),{" "}
          {STALE_HOURS_BY_CADENCE.daily}h (daily),{" "}
          {STALE_HOURS_BY_CADENCE.weekly / 24}d (weekly),{" "}
          {STALE_HOURS_BY_CADENCE.monthly / 24}d (monthly). Anything past those
          flips to stale. An admin alert cron (
          <code>/api/cron/cron-health-alert</code>) pages if any cron stays in
          stale or failing for a full schedule cycle.
        </div>
      </div>
    </AdminShell>
  );
}
