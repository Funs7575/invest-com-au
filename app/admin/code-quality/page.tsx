import AdminShell from "@/components/AdminShell";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Code-quality dashboard — read-only view of the latest snapshot
 * produced by `scripts/collect-quality-metrics.ts` (committed to
 * `docs/audits/metrics-latest.json` by the weekly CI job).
 *
 * Auth: route is mounted under `/admin/*`, gated by `proxy.ts` against
 * the ADMIN_EMAILS allowlist + Supabase session.
 *
 * Source: 2026-04-26 audit dashboard parallel workstream.
 */

interface MetricSnapshot {
  id: string;
  label: string;
  direction: "up" | "down";
  unit: "percent" | "count" | "score";
  baseline: number;
  target: number;
  total?: number;
  weight: number;
  current: number | null;
  score: number;
  delta_vs_baseline: number;
}

interface OverallSnapshot {
  collected_at: string;
  commit: string | null;
  branch: string | null;
  metrics: MetricSnapshot[];
  weighted_score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
}

async function loadLatest(): Promise<OverallSnapshot | null> {
  const tryPaths = [
    path.join(process.cwd(), "docs", "audits", "metrics-latest.json"),
    path.join(process.cwd(), "docs", "audits", "metrics-week-0.json"),
  ];
  for (const p of tryPaths) {
    try {
      const raw = await fs.readFile(p, "utf8");
      return JSON.parse(raw) as OverallSnapshot;
    } catch {
      /* try next */
    }
  }
  return null;
}

function gradeColor(grade: string) {
  if (grade === "A+" || grade === "A") return "bg-green-50 text-green-800 border-green-200";
  if (grade === "B") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (grade === "C") return "bg-amber-50 text-amber-800 border-amber-200";
  if (grade === "D") return "bg-orange-50 text-orange-800 border-orange-200";
  return "bg-red-50 text-red-800 border-red-200";
}

function fmt(n: number | null, unit: MetricSnapshot["unit"]) {
  if (n == null) return "—";
  if (unit === "percent") return `${n.toFixed(1)}%`;
  if (unit === "score") return n.toFixed(0);
  return String(Math.round(n));
}

function deltaArrow(delta: number, direction: "up" | "down") {
  if (delta === 0) return "➡️";
  const goodWay =
    direction === "up" ? delta > 0 : delta < 0;
  return goodWay ? "⬆️" : "⬇️";
}

function MetricCard({ m }: { m: MetricSnapshot }) {
  const pct = Math.floor(m.score * 100);
  const barWidth = `${Math.min(100, Math.max(0, pct))}%`;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
            {m.id}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {m.label}
          </p>
        </div>
        <span className="text-xs">{deltaArrow(m.delta_vs_baseline, m.direction)}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {fmt(m.current, m.unit)}
        </span>
        <span className="text-xs text-slate-500">
          / {fmt(m.target, m.unit)} target
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            pct >= 90
              ? "bg-green-500"
              : pct >= 70
                ? "bg-amber-500"
                : "bg-red-500"
          }`}
          style={{ width: barWidth }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.7rem] text-slate-500">
        <span>baseline {fmt(m.baseline, m.unit)}</span>
        <span>weight {m.weight} · {pct}%</span>
      </div>
    </div>
  );
}

export default async function CodeQualityPage() {
  const snap = await loadLatest();

  if (!snap) {
    return (
      <AdminShell>
        <div className="container-custom py-8">
          <h1 className="text-2xl font-bold text-slate-900">Code quality</h1>
          <p className="mt-3 text-sm text-slate-600">
            No metrics snapshot yet. The weekly CI job at
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">
              .github/workflows/code-quality.yml
            </code>
            (Sundays 23:00 UTC) writes
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">
              docs/audits/metrics-latest.json
            </code>
            on first run. You can also trigger it manually with
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">
              gh workflow run code-quality.yml
            </code>
            .
          </p>
        </div>
      </AdminShell>
    );
  }

  // Render an absolute timestamp string instead of "X min ago".
  // The linter (rules-of-react) flags `Date.now()` calls during render
  // as impure even in server components — and `force-dynamic` already
  // guarantees the page renders on every request, so the absolute
  // string is just as fresh as a relative one. Cleaner anyway: ops
  // can read the exact UTC stamp from the audit history.
  const collectedAt = new Date(snap.collected_at);
  const ageStr = collectedAt.toLocaleString("en-AU", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " UTC";

  return (
    <AdminShell>
      <div className="container-custom py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Code quality</h1>
            <p className="mt-1 text-sm text-slate-500">
              Snapshot at {ageStr}
              {snap.commit ? (
                <>
                  {" "}· commit{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {snap.commit.slice(0, 7)}
                  </code>
                </>
              ) : null}
            </p>
          </div>

          <div
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-2 ${gradeColor(snap.grade)}`}
          >
            <div className="text-3xl font-extrabold leading-none">
              {snap.grade}
            </div>
            <div className="text-xs leading-tight">
              <div className="font-semibold">Overall grade</div>
              <div className="opacity-75">
                weighted {snap.weighted_score.toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {snap.metrics.map((m) => (
            <MetricCard key={m.id} m={m} />
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">How this works</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Targets live in
              <code className="mx-1 rounded bg-white px-1 py-0.5">
                .quality-targets.yml
              </code>
              — edit there to ratchet.
            </li>
            <li>
              Weekly snapshot via{" "}
              <code className="mx-1 rounded bg-white px-1 py-0.5">
                .github/workflows/code-quality.yml
              </code>{" "}
              (Sundays 23:00 UTC) opens an auto-PR.
            </li>
            <li>
              Per-PR delta comment via{" "}
              <code className="mx-1 rounded bg-white px-1 py-0.5">
                code-quality-pr.yml
              </code>
              . Skip a PR with{" "}
              <code className="mx-1 rounded bg-white px-1 py-0.5">
                [skip-quality]
              </code>{" "}
              in the title.
            </li>
            <li>
              Grade scale: A+ ≥ 0.95 · A ≥ 0.90 · B ≥ 0.80 · C ≥ 0.70 · D ≥
              0.60 · F &lt; 0.60.
            </li>
            <li>
              Audit ref:{" "}
              <code className="mx-1 rounded bg-white px-1 py-0.5">
                docs/audits/2026-04-26-comprehensive-audit.md
              </code>
              .
            </li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
