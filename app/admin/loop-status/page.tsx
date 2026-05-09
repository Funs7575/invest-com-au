import AdminShell from "@/components/AdminShell";
import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Audit-remediation loop status — read-only operator view.
 *
 * Sources:
 *  - docs/audits/REMEDIATION_QUEUE.md  → in-flight streams + blocked items
 *  - docs/ops/loop-spend.md            → daily commits / est tokens / per-stream ROI
 *  - LOOP_PAUSE (root marker file)     → pause indicator
 *
 * No GitHub API calls — the queue file is the source of truth and already
 * names the open PR numbers per stream. Click-through to GitHub for live
 * PR state.
 */

type StreamStatus = "complete" | "in-progress" | "blocked" | "pending";

interface InFlightStream {
  stream: string;
  status: StreamStatus;
  branch: string;
  prs: string;
  notes: string;
  doneWhen: string;
}

interface BlockedItem {
  id: string;
  title: string;
  status: string;
  unblockCondition: string;
  nextAction: string;
}

interface SpendRow {
  date: string;
  loopCommits: number;
  allCommits: number;
  prsOpened: number;
  estTokensM: number;
  alert: "ok" | "warn" | "critical" | string;
}

interface StreamROI {
  stream: string;
  commits: number;
  mergedPrs: number;
  flagged: boolean;
}

const ROOT = process.cwd();
const QUEUE_PATH = path.join(ROOT, "docs", "audits", "REMEDIATION_QUEUE.md");
const SPEND_PATH = path.join(ROOT, "docs", "ops", "loop-spend.md");
const STREAMS_JSON_PATH = path.join(ROOT, "docs", "ops", "loop-spend-streams-latest.json");
const PAUSE_PATH = path.join(ROOT, "LOOP_PAUSE");

async function readOrNull(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

async function fileMtime(p: string): Promise<Date | null> {
  try {
    const s = await fs.stat(p);
    return s.mtime;
  } catch {
    return null;
  }
}

function parseInFlight(md: string): InFlightStream[] {
  const start = md.indexOf("## In-flight");
  if (start === -1) return [];
  const after = md.slice(start);
  const end = after.indexOf("\n## ", 1);
  const section = end === -1 ? after : after.slice(0, end);

  const rows: InFlightStream[] = [];
  for (const line of section.split("\n")) {
    if (!line.startsWith("|")) continue;
    if (line.startsWith("|---") || line.startsWith("| Stream") || line.startsWith("|--")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // cells[0] is empty (leading |), cells[6] is empty (trailing |)
    if (cells.length < 6) continue;
    const stream = cells[1] ?? "";
    const branch = cells[2] ?? "";
    const prs = cells[3] ?? "";
    const notes = cells[4] ?? "";
    const doneWhen = cells[5] ?? "";
    if (!stream || stream.startsWith("-")) continue;

    let status: StreamStatus = "in-progress";
    if (branch.toLowerCase().includes("_complete_") || /stream complete/i.test(notes)) {
      status = "complete";
    } else if (/\bblocked\b/i.test(notes) || /\bblocked\b/i.test(doneWhen)) {
      status = "blocked";
    }

    rows.push({ stream, branch, prs, notes, doneWhen, status });
  }
  return rows;
}

function parseBlocked(md: string): BlockedItem[] {
  const start = md.indexOf("## Blocked");
  if (start === -1) return [];
  const after = md.slice(start);
  const end = after.indexOf("\n## ", 1);
  const section = end === -1 ? after : after.slice(0, end);

  const items: BlockedItem[] = [];
  // Each blocked item starts with "### <id> — <title>"
  const blockRegex = /\n### ([^\n]+)\n([\s\S]*?)(?=\n### |\n---\s*\n|$)/g;
  let match;
  while ((match = blockRegex.exec(section)) !== null) {
    const heading = (match[1] ?? "").trim();
    const body = match[2] ?? "";
    const [idPart, ...titleParts] = heading.split("—").map((s) => s.trim());
    const id = idPart ?? heading;
    const title = titleParts.join(" — ") || heading;

    const status = /\*\*Status:\*\*\s*([^\n]+)/.exec(body)?.[1]?.trim() ?? "";
    const unblock = /\*\*Unblock condition:\*\*\s*([^\n]+(?:\n[^\n*]+)*)/.exec(body)?.[1]?.trim() ?? "";
    const nextAction = /\*\*Next action:\*\*\s*([^\n]+(?:\n[^\n*]+)*)/.exec(body)?.[1]?.trim() ?? "";

    // Skip resolved sections (e.g. "SMOKE-TEST SYSTEMIC FAILURE — RESOLVED")
    if (/resolved/i.test(heading)) continue;

    items.push({ id, title, status, unblockCondition: unblock, nextAction });
  }
  return items;
}

function parseSpendHistory(md: string): SpendRow[] {
  const rows: SpendRow[] = [];
  for (const line of md.split("\n")) {
    const m = /^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*(\w+)\s*\|/.exec(line);
    if (!m) continue;
    rows.push({
      date: m[1] ?? "",
      loopCommits: Number(m[2]),
      allCommits: Number(m[3]),
      prsOpened: Number(m[4]),
      estTokensM: Number(m[5]),
      alert: m[6] ?? "ok",
    });
  }
  return rows;
}

interface StreamsSnapshot {
  date: string;
  alert: string;
  streams: { stream: string; commits: number; mergedPrs: number }[];
  flagged: string[];
}

function parseStreamsJson(raw: string): { perStream: StreamROI[]; flagged: string[]; date: string | null } {
  try {
    const data = JSON.parse(raw) as StreamsSnapshot;
    const flaggedSet = new Set(data.flagged ?? []);
    const perStream: StreamROI[] = (data.streams ?? []).map((s) => ({
      stream: s.stream,
      commits: s.commits,
      mergedPrs: s.mergedPrs,
      flagged: flaggedSet.has(s.stream) || (s.commits >= 5 && s.mergedPrs === 0),
    }));
    return { perStream, flagged: data.flagged ?? [], date: data.date ?? null };
  } catch {
    return { perStream: [], flagged: [], date: null };
  }
}

function alertColor(level: string) {
  if (level === "critical") return "bg-red-50 text-red-800 border-red-200";
  if (level === "warn") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-emerald-50 text-emerald-800 border-emerald-200";
}

function statusPill(status: StreamStatus) {
  const map: Record<StreamStatus, string> = {
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
    blocked: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${map[status]}`}>
      {status === "in-progress" ? "active" : status}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "critical";
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-200 bg-red-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : tone === "ok"
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default async function LoopStatusPage() {
  const [queueMd, spendMd, streamsJson, paused, queueMtime, spendMtime] = await Promise.all([
    readOrNull(QUEUE_PATH),
    readOrNull(SPEND_PATH),
    readOrNull(STREAMS_JSON_PATH),
    fileMtime(PAUSE_PATH).then((m) => m !== null),
    fileMtime(QUEUE_PATH),
    fileMtime(SPEND_PATH),
  ]);

  const inFlight = queueMd ? parseInFlight(queueMd) : [];
  const blocked = queueMd ? parseBlocked(queueMd) : [];
  const spendRows = spendMd ? parseSpendHistory(spendMd) : [];
  const streams = streamsJson ? parseStreamsJson(streamsJson) : { perStream: [], flagged: [], date: null };

  const latestSpend = spendRows.at(-1) ?? null;
  const counts = {
    total: inFlight.length,
    complete: inFlight.filter((s) => s.status === "complete").length,
    active: inFlight.filter((s) => s.status === "in-progress").length,
    blocked: inFlight.filter((s) => s.status === "blocked").length,
  };

  const queueAge = queueMtime
    ? queueMtime.toLocaleString("en-AU", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC"
    : "—";
  const spendAge = spendMtime
    ? spendMtime.toLocaleString("en-AU", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC"
    : "never (daily job hasn't run yet)";

  return (
    <AdminShell title="Loop status" subtitle={`Queue updated ${queueAge}`}>
      <div className="container-custom space-y-6">
        {/* Pause banner */}
        {paused ? (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
            <p className="text-sm font-bold text-amber-900">⏸ Loop paused</p>
            <p className="mt-1 text-xs text-amber-800">
              <code className="rounded bg-white px-1 py-0.5">LOOP_PAUSE</code>
              {" marker is present at repo root. Cloud agents will skip iterations until it is removed. Resume: "}
              <code className="ml-1 rounded bg-white px-1 py-0.5">
                {`git rm LOOP_PAUSE && git commit -m "chore(loop): resume" && git push`}
              </code>
              .
            </p>
          </div>
        ) : null}

        {/* Top stat row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Streams in flight"
            value={String(counts.total)}
            hint={`${counts.active} active · ${counts.blocked} blocked · ${counts.complete} done`}
          />
          {latestSpend ? (
            <>
              <StatCard
                label={`Loop commits (${latestSpend.date})`}
                value={String(latestSpend.loopCommits)}
                hint={`vs ${latestSpend.allCommits} total commits`}
                tone={
                  latestSpend.alert === "critical"
                    ? "critical"
                    : latestSpend.alert === "warn"
                      ? "warn"
                      : "ok"
                }
              />
              <StatCard
                label="Est tokens"
                value={`${latestSpend.estTokensM.toFixed(1)}M`}
                hint={`${latestSpend.prsOpened} PRs opened`}
              />
              <StatCard
                label="Alert level"
                value={latestSpend.alert.toUpperCase()}
                hint={`Snapshot ${spendAge}`}
                tone={
                  latestSpend.alert === "critical"
                    ? "critical"
                    : latestSpend.alert === "warn"
                      ? "warn"
                      : "ok"
                }
              />
            </>
          ) : (
            <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
              No spend snapshot yet. The daily job at{" "}
              <code className="mx-0.5 rounded bg-slate-100 px-1">
                .github/workflows/loop-spend-tracker.yml
              </code>{" "}
              writes{" "}
              <code className="mx-0.5 rounded bg-slate-100 px-1">docs/ops/loop-spend.md</code>{" "}
              at 06:00 UTC. Trigger it manually with{" "}
              <code className="mx-0.5 rounded bg-slate-100 px-1">
                gh workflow run loop-spend-tracker.yml
              </code>
              .
            </div>
          )}
        </div>

        {/* Per-stream activity (today) */}
        {streams.perStream.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Per-stream activity{streams.date ? ` (${streams.date})` : ""}
              </h2>
              {streams.flagged.length > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-800">
                  FP-sweep flagged: {streams.flagged.join(", ")}
                </span>
              ) : (
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-700">
                  No FP-sweep flags
                </span>
              )}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-1.5 text-left">Stream</th>
                    <th className="py-1.5 text-right">Commits</th>
                    <th className="py-1.5 text-right">Merged PRs</th>
                    <th className="py-1.5 text-right">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {streams.perStream.map((s) => (
                    <tr key={s.stream} className={s.flagged ? "bg-amber-50/50" : ""}>
                      <td className="py-1.5 font-mono text-xs font-bold text-slate-900">{s.stream}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.commits}</td>
                      <td className="py-1.5 text-right tabular-nums">{s.mergedPrs}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-500">
                        {s.commits > 0 ? `${Math.round((s.mergedPrs / s.commits) * 100)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              FP-sweep signature: ≥5 commits + 0 merged PRs in 24h. Indicates an iteration loop chasing
              items that are getting swept as false-positive.
            </p>
          </section>
        ) : null}

        {/* In-flight streams */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">In-flight streams</h2>
          <p className="mt-1 text-xs text-slate-500">
            One row per audit-remediation stream. Status derived from queue file branch + notes columns.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-1.5 text-left">Stream</th>
                  <th className="py-1.5 text-left">Status</th>
                  <th className="py-1.5 text-left">Branch</th>
                  <th className="py-1.5 text-left">Done-when</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inFlight.map((row) => (
                  <tr key={row.stream}>
                    <td className="py-2 align-top font-mono text-xs font-bold text-slate-900">{row.stream}</td>
                    <td className="py-2 align-top">{statusPill(row.status)}</td>
                    <td className="py-2 align-top">
                      <code className="break-all text-[0.7rem] text-slate-700">{row.branch}</code>
                    </td>
                    <td className="py-2 align-top text-xs text-slate-600">{row.doneWhen}</td>
                  </tr>
                ))}
                {inFlight.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                      Queue file not found at{" "}
                      <code className="rounded bg-slate-100 px-1">docs/audits/REMEDIATION_QUEUE.md</code>.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* Blocked items */}
        {blocked.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Blocked ({blocked.length})</h2>
            <p className="mt-1 text-xs text-slate-500">
              Items waiting on external deps, vendor changes, or human review. Each shows the unblock condition + next action.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {blocked.map((b, idx) => (
                <div key={`${b.id}-${idx}`} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                  <p className="text-xs font-bold text-slate-900">{b.id}</p>
                  <p className="text-xs text-slate-600">{b.title}</p>
                  {b.unblockCondition ? (
                    <p className="mt-2 text-[0.7rem] text-slate-700">
                      <span className="font-semibold">Unblock: </span>
                      {b.unblockCondition}
                    </p>
                  ) : null}
                  {b.nextAction ? (
                    <p className="mt-1 text-[0.7rem] text-slate-700">
                      <span className="font-semibold">Next: </span>
                      {b.nextAction}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Spend history sparkline */}
        {spendRows.length > 1 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Spend history</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-1.5 text-left">Date</th>
                    <th className="py-1.5 text-right">Loop commits</th>
                    <th className="py-1.5 text-right">All commits</th>
                    <th className="py-1.5 text-right">PRs opened</th>
                    <th className="py-1.5 text-right">Est tokens (M)</th>
                    <th className="py-1.5 text-left">Alert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {spendRows.slice(-14).reverse().map((r) => (
                    <tr key={r.date}>
                      <td className="py-1.5 font-mono text-xs">{r.date}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.loopCommits}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-500">{r.allCommits}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.prsOpened}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.estTokensM.toFixed(1)}</td>
                      <td className="py-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider ${alertColor(r.alert)}`}>
                          {r.alert}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* Footer links */}
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Source files</p>
          <ul className="mt-2 space-y-1">
            <li>
              Queue:{" "}
              <Link
                href="https://github.com/Funs7575/invest-com-au/blob/main/docs/audits/REMEDIATION_QUEUE.md"
                className="text-blue-700 hover:underline"
                target="_blank"
                rel="noopener"
              >
                docs/audits/REMEDIATION_QUEUE.md
              </Link>
            </li>
            <li>
              Defaults / priority:{" "}
              <Link
                href="https://github.com/Funs7575/invest-com-au/blob/main/docs/audits/REMEDIATION_DEFAULTS.md"
                className="text-blue-700 hover:underline"
                target="_blank"
                rel="noopener"
              >
                docs/audits/REMEDIATION_DEFAULTS.md
              </Link>
            </li>
            <li>
              Spend tracker:{" "}
              <Link
                href="https://github.com/Funs7575/invest-com-au/blob/main/docs/ops/loop-spend.md"
                className="text-blue-700 hover:underline"
                target="_blank"
                rel="noopener"
              >
                docs/ops/loop-spend.md
              </Link>
            </li>
            <li>
              Open audit-remediation PRs:{" "}
              <Link
                href="https://github.com/Funs7575/invest-com-au/pulls?q=is%3Aopen+head%3Aclaude%2Faudit-remediation"
                className="text-blue-700 hover:underline"
                target="_blank"
                rel="noopener"
              >
                GitHub
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
