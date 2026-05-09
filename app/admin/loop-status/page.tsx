import AdminShell from "@/components/AdminShell";
import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Audit-remediation loop status — operator view, plain-language friendly.
 *
 * Sources (read-only):
 *  - docs/audits/REMEDIATION_QUEUE.md            → streams (in-flight, blocked, pending)
 *  - docs/ops/loop-spend.md                      → daily history
 *  - docs/ops/loop-spend-streams-latest.json     → today's per-stream ROI
 *  - LOOP_PAUSE (root marker file)               → pause indicator
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

interface PendingStream {
  stream: string;
  description: string;
  totalItems: number;
  pendingItems: number;
  doneItems: number;
  estIters: number;
  entryCondition: string;
  hasHardDeps: boolean;
}

interface Suggestion {
  tone: "ok" | "warn" | "critical" | "info";
  title: string;
  body: string;
  action?: string;
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

// ─── Parsers ───────────────────────────────────────────────────────────────

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

    if (/resolved/i.test(heading)) continue;
    items.push({ id, title, status, unblockCondition: unblock, nextAction });
  }
  return items;
}

function parsePending(md: string): PendingStream[] {
  const start = md.indexOf("## Pending");
  if (start === -1) return [];
  const after = md.slice(start);

  const streams: PendingStream[] = [];
  // Each pending stream: ### Stream XX — <description>, then a table, then **Stream XX entry condition:** ...
  const streamRegex = /\n### Stream ([A-Z]+)\s*—\s*([^\n]+)\n([\s\S]*?)(?=\n### Stream |\n---\s*\n##|$)/g;
  let match;
  while ((match = streamRegex.exec(after)) !== null) {
    const stream = match[1] ?? "";
    const description = (match[2] ?? "").trim();
    const body = match[3] ?? "";

    let totalItems = 0;
    let pendingItems = 0;
    let doneItems = 0;
    let estIters = 0;

    for (const line of body.split("\n")) {
      if (!line.startsWith("|") || line.startsWith("|---") || line.startsWith("| Item") || line.startsWith("|--")) continue;
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length < 5) continue;
      const itemId = cells[1] ?? "";
      const itemStatus = (cells[2] ?? "").toLowerCase();
      const iters = cells[4] ?? "";
      if (!itemId || itemId.toLowerCase() === "item") continue;

      totalItems++;
      if (/false-positive|~~/.test(itemStatus)) {
        // Skip — already resolved as no-op
        continue;
      }
      if (/done/.test(itemStatus)) {
        doneItems++;
      } else if (/pending/.test(itemStatus)) {
        pendingItems++;
        const m = /~?(\d+)/.exec(iters);
        if (m && m[1]) estIters += Number(m[1]);
      }
    }

    const entryMatch = /\*\*Stream [A-Z]+ entry condition:\*\*\s*([^\n]+)/.exec(body);
    const entryCondition = entryMatch?.[1]?.trim() ?? "";
    const hasHardDeps = /Deps?:|deps on|hard dep/i.test(entryCondition) && !/no hard deps?|can start/i.test(entryCondition);

    if (pendingItems > 0) {
      streams.push({
        stream,
        description,
        totalItems,
        pendingItems,
        doneItems,
        estIters,
        entryCondition,
        hasHardDeps,
      });
    }
  }
  return streams;
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

// ─── Suggestions engine ────────────────────────────────────────────────────

function computeSuggestions(args: {
  paused: boolean;
  pauseAgeDays: number | null;
  latestSpend: SpendRow | null;
  spendAgeHours: number | null;
  flagged: string[];
  blockedCount: number;
  inFlightActive: number;
}): Suggestion[] {
  const out: Suggestion[] = [];

  if (args.paused) {
    out.push({
      tone: "warn",
      title: "Loop is paused",
      body:
        args.pauseAgeDays !== null
          ? `The robot has been stopped for ${args.pauseAgeDays} day${args.pauseAgeDays === 1 ? "" : "s"}. No new code is being shipped automatically.`
          : "The robot has been stopped. No new code is being shipped automatically.",
      action: "Resume by deleting LOOP_PAUSE and pushing.",
    });
  }

  if (args.spendAgeHours !== null && args.spendAgeHours > 30) {
    out.push({
      tone: "warn",
      title: "Daily check-in is overdue",
      body: `The daily activity snapshot hasn't run in ${Math.round(args.spendAgeHours)} hours. The dashboard's "today" numbers will be stale.`,
      action: "Trigger it manually: gh workflow run loop-spend-tracker.yml",
    });
  } else if (args.latestSpend === null) {
    out.push({
      tone: "info",
      title: "No activity history yet",
      body: "The daily check-in hasn't run for the first time. It runs automatically at 06:00 UTC.",
      action: "To populate now: gh workflow run loop-spend-tracker.yml",
    });
  }

  if (args.flagged.length > 0) {
    out.push({
      tone: "warn",
      title: `${args.flagged.length} stream${args.flagged.length === 1 ? "" : "s"} look stuck`,
      body: `Stream${args.flagged.length === 1 ? "" : "s"} ${args.flagged.join(", ")} shipped 5+ code changes but nothing actually merged. That usually means the robot is chasing items that turn out to be already-fixed.`,
      action: "Open the queue file and check the stream's notes column for context.",
    });
  }

  if (args.latestSpend?.alert === "critical") {
    out.push({
      tone: "critical",
      title: "Activity is unusually high",
      body: `${args.latestSpend.loopCommits} code changes in the last 24h — well above the warn threshold. Could be a productive day, could be a runaway spiral. Worth a glance.`,
      action: "Check the spend history below for trend.",
    });
  }

  if (args.blockedCount >= 5) {
    out.push({
      tone: "info",
      title: `${args.blockedCount} streams are blocked`,
      body: "Several streams are waiting on you, vendors, or maintenance windows. Most can sit indefinitely, but worth a periodic check.",
      action: "Scroll to the Blocked section.",
    });
  }

  if (
    !args.paused &&
    args.flagged.length === 0 &&
    args.latestSpend?.alert === "ok" &&
    args.inFlightActive > 0
  ) {
    out.push({
      tone: "ok",
      title: "Loop is healthy",
      body: `${args.inFlightActive} stream${args.inFlightActive === 1 ? "" : "s"} working, no flags raised, daily activity within normal range. No action needed.`,
    });
  }

  return out;
}

// ─── UI primitives ─────────────────────────────────────────────────────────

function alertColor(level: string) {
  if (level === "critical") return "bg-red-50 text-red-800 border-red-200";
  if (level === "warn") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-emerald-50 text-emerald-800 border-emerald-200";
}

function statusPill(status: StreamStatus) {
  const map: Record<StreamStatus, { class: string; label: string; emoji: string }> = {
    complete: { class: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "done", emoji: "✓" },
    "in-progress": { class: "bg-blue-50 text-blue-700 border-blue-200", label: "active", emoji: "●" },
    blocked: { class: "bg-amber-50 text-amber-700 border-amber-200", label: "blocked", emoji: "⏸" },
    pending: { class: "bg-slate-50 text-slate-600 border-slate-200", label: "queued", emoji: "○" },
  };
  const cfg = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ${cfg.class}`}>
      <span aria-hidden>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}

function ProgressRing({ percent, label, sublabel }: { percent: number; label: string; sublabel: string }) {
  const radius = 52;
  const stroke = 10;
  const norm = 2 * Math.PI * radius;
  const offset = norm - (percent / 100) * norm;
  const colour = percent >= 80 ? "stroke-emerald-500" : percent >= 50 ? "stroke-blue-500" : percent >= 25 ? "stroke-amber-500" : "stroke-red-500";
  return (
    <div className="flex flex-col items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-slate-100" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={norm}
          strokeDashoffset={offset}
          className={colour}
        />
      </svg>
      <div className="mt-[-90px] text-center pointer-events-none">
        <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{Math.round(percent)}%</div>
        <div className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      </div>
      <div className="mt-12 text-xs text-slate-600">{sublabel}</div>
    </div>
  );
}

function Sparkline({ rows }: { rows: SpendRow[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.loopCommits), 1);
  const width = 360;
  const height = 60;
  const barWidth = width / rows.length;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {rows.map((r, i) => {
          const h = Math.max(2, (r.loopCommits / max) * (height - 4));
          const colour =
            r.alert === "critical" ? "fill-red-500" : r.alert === "warn" ? "fill-amber-500" : "fill-emerald-500";
          return (
            <rect
              key={r.date}
              x={i * barWidth + 1}
              y={height - h - 2}
              width={Math.max(1, barWidth - 2)}
              height={h}
              className={colour}
              rx={1}
            >
              <title>
                {r.date}: {r.loopCommits} loop commits ({r.alert})
              </title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[0.6rem] text-slate-500">
        <span>{rows[0]?.date}</span>
        <span>{rows.at(-1)?.date}</span>
      </div>
    </div>
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

function SuggestionCard({ s }: { s: Suggestion }) {
  const tone = {
    ok: { border: "border-emerald-200", bg: "bg-emerald-50", icon: "✓", iconClass: "text-emerald-600" },
    warn: { border: "border-amber-200", bg: "bg-amber-50", icon: "⚠", iconClass: "text-amber-600" },
    critical: { border: "border-red-200", bg: "bg-red-50", icon: "⚠", iconClass: "text-red-600" },
    info: { border: "border-blue-200", bg: "bg-blue-50", icon: "ℹ", iconClass: "text-blue-600" },
  }[s.tone];
  return (
    <div className={`rounded-xl border p-3 ${tone.border} ${tone.bg}`}>
      <div className="flex items-start gap-2">
        <span className={`text-lg leading-none ${tone.iconClass}`} aria-hidden>{tone.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{s.title}</p>
          <p className="mt-0.5 text-xs text-slate-700">{s.body}</p>
          {s.action ? (
            <p className="mt-1.5 text-[0.7rem] text-slate-600">
              <span className="font-semibold">Suggested: </span>
              {s.action}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function LoopStatusPage() {
  const [queueMd, spendMd, streamsJson, pauseMtime, queueMtime, spendMtime] = await Promise.all([
    readOrNull(QUEUE_PATH),
    readOrNull(SPEND_PATH),
    readOrNull(STREAMS_JSON_PATH),
    fileMtime(PAUSE_PATH),
    fileMtime(QUEUE_PATH),
    fileMtime(SPEND_PATH),
  ]);

  const paused = pauseMtime !== null;
  const inFlight = queueMd ? parseInFlight(queueMd) : [];
  const blocked = queueMd ? parseBlocked(queueMd) : [];
  const pending = queueMd ? parsePending(queueMd) : [];
  const spendRows = spendMd ? parseSpendHistory(spendMd) : [];
  const streams = streamsJson ? parseStreamsJson(streamsJson) : { perStream: [], flagged: [], date: null };

  const latestSpend = spendRows.at(-1) ?? null;

  // Counts + progress
  const counts = {
    total: inFlight.length,
    complete: inFlight.filter((s) => s.status === "complete").length,
    active: inFlight.filter((s) => s.status === "in-progress").length,
    blocked: inFlight.filter((s) => s.status === "blocked").length,
  };
  const progressPct = counts.total > 0 ? (counts.complete / counts.total) * 100 : 0;

  // Time-since helpers. force-dynamic + revalidate=0 above guarantees this
  // server component renders on every request, so Date.now() is effectively
  // request-time and not a memoization hazard.
  // eslint-disable-next-line react-hooks/purity -- request-scoped server render
  const now = Date.now();
  const pauseAgeDays = pauseMtime ? Math.floor((now - pauseMtime.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const spendAgeHours = spendMtime ? (now - spendMtime.getTime()) / (1000 * 60 * 60) : null;

  const suggestions = computeSuggestions({
    paused,
    pauseAgeDays,
    latestSpend,
    spendAgeHours,
    flagged: streams.flagged,
    blockedCount: blocked.length,
    inFlightActive: counts.active,
  });

  // Hero status
  let heroStatus: { tone: "ok" | "warn" | "critical"; line: string; sub: string };
  if (paused) {
    heroStatus = {
      tone: "warn",
      line: "Loop is paused",
      sub: "The robot has stopped. No new code is shipping automatically until you remove LOOP_PAUSE.",
    };
  } else if (latestSpend?.alert === "critical" || streams.flagged.length >= 2) {
    heroStatus = {
      tone: "critical",
      line: "Loop needs attention",
      sub: "Activity or stuck-stream signals are above normal. Check suggestions below.",
    };
  } else if (latestSpend?.alert === "warn" || streams.flagged.length === 1) {
    heroStatus = {
      tone: "warn",
      line: "Loop is running, with one thing to check",
      sub: "Mostly healthy, but one signal is yellow. Look at the suggestions below.",
    };
  } else {
    heroStatus = {
      tone: "ok",
      line: "Loop is running normally",
      sub:
        latestSpend !== null
          ? `${latestSpend.loopCommits} code changes shipped in the last 24h. ${counts.active} stream${counts.active === 1 ? "" : "s"} active right now.`
          : `${counts.active} stream${counts.active === 1 ? "" : "s"} active right now.`,
    };
  }

  // What's next — top 5 pending streams that aren't waiting on a hard dep, sorted by total work
  const whatsNext = [...pending]
    .filter((p) => !p.hasHardDeps)
    .sort((a, b) => b.pendingItems - a.pendingItems)
    .slice(0, 5);
  const blockedPending = pending.filter((p) => p.hasHardDeps).slice(0, 3);

  const queueAge = queueMtime
    ? queueMtime.toLocaleString("en-AU", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC"
    : "—";
  const spendAge = spendMtime
    ? spendMtime.toLocaleString("en-AU", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC"
    : "never (daily job hasn't run yet)";

  return (
    <AdminShell title="Loop status" subtitle={`What the audit-remediation robot is doing right now · queue updated ${queueAge}`}>
      <div className="container-custom space-y-6">
        {/* ─── Hero status ─── */}
        <div
          className={`rounded-2xl border-2 p-5 shadow-sm ${
            heroStatus.tone === "critical"
              ? "border-red-300 bg-red-50"
              : heroStatus.tone === "warn"
                ? "border-amber-300 bg-amber-50"
                : "border-emerald-300 bg-emerald-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none" aria-hidden>
              {heroStatus.tone === "critical" ? "🔴" : heroStatus.tone === "warn" ? "🟡" : "🟢"}
            </span>
            <div>
              <p className="text-lg font-bold text-slate-900">{heroStatus.line}</p>
              <p className="mt-0.5 text-sm text-slate-700">{heroStatus.sub}</p>
            </div>
          </div>
        </div>

        {/* ─── Pause banner (extra detail when paused) ─── */}
        {paused ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="text-xs text-amber-900">
              <span className="font-bold">⏸ Pause marker is present.</span>
              {pauseAgeDays !== null
                ? ` It was added ${pauseAgeDays} day${pauseAgeDays === 1 ? "" : "s"} ago.`
                : ""}
              {" Resume command: "}
              <code className="rounded bg-white px-1 py-0.5">
                {`git rm LOOP_PAUSE && git commit -m "chore(loop): resume" && git push`}
              </code>
            </p>
          </div>
        ) : null}

        {/* ─── Progress overview ─── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <ProgressRing
              percent={progressPct}
              label="streams done"
              sublabel={`${counts.complete} of ${counts.total} complete`}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 self-center">
              <StatCard
                label="Active right now"
                value={String(counts.active)}
                hint="streams the robot is currently working on"
                tone={counts.active > 0 ? "ok" : "neutral"}
              />
              <StatCard
                label="Blocked"
                value={String(counts.blocked)}
                hint="waiting on you, a vendor, or a maintenance window"
                tone={counts.blocked > 5 ? "warn" : "neutral"}
              />
              <StatCard
                label="Queued (not yet started)"
                value={String(pending.reduce((sum, p) => sum + p.pendingItems, 0))}
                hint={`${pending.length} streams of pending work`}
              />
              {latestSpend ? (
                <>
                  <StatCard
                    label={`Code changes (${latestSpend.date})`}
                    value={String(latestSpend.loopCommits)}
                    hint={`${latestSpend.prsOpened} pull requests opened`}
                    tone={
                      latestSpend.alert === "critical"
                        ? "critical"
                        : latestSpend.alert === "warn"
                          ? "warn"
                          : "ok"
                    }
                  />
                  <StatCard
                    label="Estimated tokens"
                    value={`${latestSpend.estTokensM.toFixed(1)}M`}
                    hint="rough cost order-of-magnitude"
                  />
                  <StatCard
                    label="Daily check-in"
                    value={latestSpend.alert.toUpperCase()}
                    hint={`Last ran ${spendAge}`}
                    tone={
                      latestSpend.alert === "critical"
                        ? "critical"
                        : latestSpend.alert === "warn"
                          ? "warn"
                          : "ok"
                    }
                  />
                </>
              ) : null}
            </div>
          </div>
        </section>

        {/* ─── Suggestions ─── */}
        {suggestions.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Things to know</h2>
            <p className="mt-1 text-xs text-slate-500">
              Auto-derived from the data above. Green = healthy, yellow = check, red = act.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {suggestions.map((s, i) => (
                <SuggestionCard key={i} s={s} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ─── Daily activity sparkline ─── */}
        {spendRows.length > 1 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-bold text-slate-900">Daily activity</h2>
              <span className="text-[0.65rem] uppercase tracking-wider text-slate-500">
                last {Math.min(14, spendRows.length)} days
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Each bar = one day. Bar height = how many loop code changes landed. Green = healthy, yellow = elevated, red = critical.
            </p>
            <div className="mt-3">
              <Sparkline rows={spendRows.slice(-14)} />
            </div>
          </section>
        ) : null}

        {/* ─── Per-stream activity (today) ─── */}
        {streams.perStream.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Yesterday&apos;s activity by stream{streams.date ? ` (${streams.date})` : ""}
              </h2>
              {streams.flagged.length > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-800">
                  ⚠ {streams.flagged.length} flagged
                </span>
              ) : (
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-700">
                  ✓ no flags
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Yellow rows = code was committed but nothing actually merged (the &quot;stuck&quot; signature).
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-1.5 text-left">Stream</th>
                    <th className="py-1.5 text-right">Code changes</th>
                    <th className="py-1.5 text-right">Merged PRs</th>
                    <th className="py-1.5 text-right">Hit rate</th>
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
          </section>
        ) : null}

        {/* ─── What's next ─── */}
        {whatsNext.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">What the robot will tackle next</h2>
            <p className="mt-1 text-xs text-slate-500">
              Top streams from the queue that have items ready to go. Sorted by amount of remaining work.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {whatsNext.map((p) => (
                <div key={p.stream} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">Stream {p.stream}</span>
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">
                      ~{p.estIters} iters
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">{p.description}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-slate-600">
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">
                      {p.pendingItems} pending
                    </span>
                    {p.doneItems > 0 ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                        {p.doneItems} done
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {blockedPending.length > 0 ? (
              <details className="mt-4 text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700">
                  Plus {blockedPending.length} more stream{blockedPending.length === 1 ? "" : "s"} waiting on a dependency
                </summary>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  {blockedPending.map((p) => (
                    <li key={p.stream}>
                      <span className="font-mono font-semibold">Stream {p.stream}</span> — {p.description}{" "}
                      <span className="text-slate-500">({p.pendingItems} items)</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {/* ─── In-flight streams ─── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">All streams currently in flight</h2>
          <p className="mt-1 text-xs text-slate-500">
            Each stream is one alphabetical bucket of audit-remediation work (e.g. Stream A is auth-related, Stream W is hub pages). Status comes from the queue file.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-1.5 text-left">Stream</th>
                  <th className="py-1.5 text-left">Status</th>
                  <th className="py-1.5 text-left">Branch</th>
                  <th className="py-1.5 text-left">Done when</th>
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

        {/* ─── Blocked items ─── */}
        {blocked.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Stuck on something — {blocked.length} item{blocked.length === 1 ? "" : "s"}</h2>
            <p className="mt-1 text-xs text-slate-500">
              These items can&apos;t move forward until something happens (vendor change, maintenance window, your decision). Most can sit indefinitely.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {blocked.map((b, idx) => (
                <div key={`${b.id}-${idx}`} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                  <p className="text-xs font-bold text-slate-900">{b.id}</p>
                  <p className="text-xs text-slate-600">{b.title}</p>
                  {b.unblockCondition ? (
                    <p className="mt-2 text-[0.7rem] text-slate-700">
                      <span className="font-semibold">Unblock when: </span>
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

        {/* ─── Spend history ─── */}
        {spendRows.length > 1 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Spend history</h2>
            <p className="mt-1 text-xs text-slate-500">
              One row per day. Loop commits = code changes from the robot, all commits = total to main, est tokens = rough cost.
            </p>
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

        {/* ─── Glossary ─── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <details>
            <summary className="cursor-pointer text-base font-bold text-slate-900">
              Glossary — what these words mean
            </summary>
            <dl className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">Stream</dt>
                <dd className="mt-0.5">
                  One alphabetical bucket of related audit work — e.g. Stream A is auth, Stream W is hub pages. Each
                  stream has 5–15 sub-items (A-01, A-02, …) that get worked through in order.
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">Iteration</dt>
                <dd className="mt-0.5">
                  One run of the robot. Takes ~5–10 minutes, picks the top non-blocked item from the queue, ships at
                  most 1 PR. The loop fires ~2× per hour during normal operation.
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">PR (pull request)</dt>
                <dd className="mt-0.5">
                  A code change waiting to merge into main. Most loop PRs auto-merge once CI is green; some get the
                  &quot;needs human review&quot; label and wait for you.
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">FP-sweep / false-positive</dt>
                <dd className="mt-0.5">
                  When the robot investigates a queue item and discovers it&apos;s already done (or never was a real
                  problem). It marks the item resolved without shipping code. Many in a row signals queue-quality
                  issues.
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">Loop commits</dt>
                <dd className="mt-0.5">
                  Code changes attributed to the audit-remediation loop in the last 24h. Distinguished from your own
                  commits by conventional-commit prefix patterns.
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">LOOP_PAUSE</dt>
                <dd className="mt-0.5">
                  A marker file at repo root. When present, all loop iterations exit immediately at Phase 0 with
                  STATUS: PAUSED. Used during infrastructure changes or to stop a runaway. Resume by deleting it.
                </dd>
              </div>
            </dl>
          </details>
        </section>

        {/* ─── Footer source links ─── */}
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">Source files (for digging deeper)</p>
          <ul className="mt-2 space-y-1">
            <li>
              Queue (live source of truth):{" "}
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
              Priority rules:{" "}
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
              Daily activity log:{" "}
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
                GitHub pull requests
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
