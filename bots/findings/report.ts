/**
 * Report rendering + shard aggregation.
 *
 * Pure render functions (string in, string out) — unit-tested. The filesystem
 * helpers (`writeReport`, `aggregateShards`) wrap them for the runner and the
 * Playwright globalTeardown that fans many parallel bot shards into one report.
 *
 * Two human-facing surfaces are produced for every run:
 *   - report.html   — a visual report (verdict + plain-English guidance).
 *   - summary.md     — a Markdown digest the automation posts as the rolling
 *                      "🤖 Bot fleet — latest results" GitHub issue.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type Finding,
  type FindingCategory,
  type Severity,
  SEVERITY_ORDER,
} from "./types";
import { FindingStore } from "./store";
import type { CostTotals } from "../ai/cost";
import type { PerfSample } from "../checks/perf";

export type { PerfSample };

export interface RunMeta {
  runId: string;
  baseUrl: string;
  targetClass: string;
  startedAt: string;
  finishedAt: string;
  sessions: number;
  personas: string[];
  cost?: CostTotals;
}

/** One bot session's persisted output. */
export interface Shard {
  persona: string;
  findings: Finding[];
  cost?: CostTotals;
  perf?: PerfSample[];
}

function emptyCost(): CostTotals {
  return { inputTokens: 0, outputTokens: 0, usd: 0, calls: 0 };
}

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#b00020",
  high: "#d9534f",
  medium: "#e0a800",
  low: "#6c757d",
  info: "#0d6efd",
};

const SEVERITY_EMOJI: Record<Severity, string> = {
  critical: "🛑",
  high: "⚠️",
  medium: "👀",
  low: "·",
  info: "ℹ️",
};

/** Plain-English meaning of each severity, for the legend. */
const SEVERITY_MEANING: Record<Severity, string> = {
  critical: "Serious — likely broken for users or a crash. Fix first.",
  high: "Important — a real problem worth fixing soon.",
  medium: "Worth a look — may affect some users.",
  low: "Minor — polish when convenient.",
  info: "Just so you know — not a problem.",
};

/** Plain-English "what this means / what to do" per finding category. */
const CATEGORY_HELP: Record<FindingCategory, { what: string; fix: string }> = {
  "console-error": {
    what: "The page's code logged an error in the browser — often a sign something didn't load or work as intended.",
    fix: "Open the listed page, check the browser console, and fix the code path that errored.",
  },
  "page-error": {
    what: "The page hit an unhandled crash (a JavaScript exception). Users may see a broken or frozen section.",
    fix: "Reproduce on the listed page and add error handling or fix the root cause.",
  },
  "network-error": {
    what: "A request the page made never completed — it couldn't connect, timed out, or was refused.",
    fix: "Check that the endpoint or asset is reachable and returns a response.",
  },
  "http-error": {
    what: "A page or request came back with an error status (e.g. 404 not-found or 500 server-error).",
    fix: "404 = a missing page/link to restore; 500 = a server-side bug to investigate at the listed path.",
  },
  "broken-link": {
    what: "A link on the site points somewhere that errors or no longer exists.",
    fix: "Update or remove the link, or restore the missing page.",
  },
  a11y: {
    what: "An accessibility problem that can block people using screen readers, keyboards, or with low vision.",
    fix: "Follow the linked rule — e.g. add alt text, label the control, or fix colour contrast.",
  },
  "dead-end": {
    what: "A page loaded but showed almost nothing, or navigation failed — a likely dead end for the visitor.",
    fix: "Check the page renders real content and isn't silently failing to load data.",
  },
  ux: {
    what: "An AI reviewer judged the experience here confusing, broken, or misleading.",
    fix: "Read the detail and improve the flow, copy, or button/affordance.",
  },
  compliance: {
    what: "A required financial disclosure or disclaimer appears to be missing where it's expected.",
    fix: "Add the required disclosure (see lib/compliance.ts) — this matters for AFSL / ASIC.",
  },
  "flow-failure": {
    what: "A multi-step task (like the quiz or signup) couldn't be completed all the way through.",
    fix: "Reproduce the steps on the listed page and fix the blocking step.",
  },
  schema: {
    what: "A JSON-LD structured data block is missing a required field, which reduces AI/LLM citability and may fail Google rich-result eligibility.",
    fix: "Add the missing field to the appropriate lib/schema-markup.ts builder, then verify with Google's Rich Results Test.",
  },
  geo: {
    what: "A content page is missing a GEO/answer-engine citability signal (schema, Speakable, FAQ, or freshness), lowering its odds of being cited by AI answer engines.",
    fix: "Add the missing signal — see the detail and the helpers in lib/schema-markup.ts.",
  },
  "country-mode": {
    what: "The country-aware experience didn't reflect the visitor's country — a foreign investor saw the generic AU experience, or the wrong country's copy.",
    fix: "Check getIntentCountry() and the page-recommendations lookup on the listed surface (lib/country-mode/*, lib/page-recommendations.ts).",
  },
  i18n: {
    what: "A localisation defect on a translated page — wrong/missing lang tag, missing RTL direction, or an untranslated key leaking into the copy.",
    fix: "Fix the lang/dir attributes or the missing translation; see lib/i18n/* and the locale page under app/<locale>/.",
  },
  calculator: {
    what: "A calculator or tool produced a wrong result, was non-linear, or failed to render its inputs.",
    fix: "Reproduce on the listed tool and fix the compute logic or client hydration.",
  },
  "form-validation": {
    what: "A form mishandled bad input — accepted an empty/invalid submission, or crashed on oversized input instead of returning a clean error.",
    fix: "Add/verify client validation and read the body with safeParse so oversized input returns a 400, not a 500.",
  },
  directory: {
    what: "A directory primitive (search, sort, filter, compare bar, or empty state) didn't behave — e.g. search didn't filter or clearing didn't restore results.",
    fix: "Check the components/directory/* wiring on the listed surface.",
  },
  "rate-limit": {
    what: "A rate-limited endpoint either never returned a 429 under a burst (limiter not engaging) or returned a 5xx instead of degrading cleanly.",
    fix: "Verify lib/rate-limit.ts is applied to the route and returns a 429 (ideally with Retry-After), never a 500.",
  },
  mobile: {
    what: "A defect that only shows at phone width — horizontal overflow, a broken hamburger menu, or a filter drawer that won't open/close.",
    fix: "Reproduce at a 390px viewport and fix the responsive layout or mobile interaction.",
  },
  auth: {
    what: "An auth-boundary defect — a gated route exposed content to a logged-out visitor, or dropped the return path on its login redirect.",
    fix: "Check the route's auth gate and ensure it redirects to the login wall preserving the next=/redirect= return path.",
  },
  "dark-mode": {
    what: "A dark-palette defect — the dark theme didn't apply, or an a11y/contrast violation surfaced only in dark mode.",
    fix: "Check the theme is applied (<html class=\"dark\">) and fix the dark-mode colour tokens for the listed surface.",
  },
  safety: {
    what: "The safety net intercepted real-world actions (payments, emails, etc.) so nothing actually happened.",
    fix: "No action needed — this confirms the safety net is working.",
  },
};

/** Colour-code a timing value: green < 1s, amber 1–3s, red > 3s. */
function perfColor(ms: number | null): string {
  if (ms === null) return "#999";
  if (ms < 1000) return "#2e7d32";
  if (ms < 3000) return "#b45309";
  return "#b00020";
}

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function renderPerfTable(samples: PerfSample[]): string {
  if (samples.length === 0) return "";

  // Deduplicate by route, keeping the median FCP (or first sample if only one).
  const byRoute = new Map<string, PerfSample[]>();
  for (const s of samples) {
    const key = s.route;
    if (!byRoute.has(key)) byRoute.set(key, []);
    byRoute.get(key)!.push(s);
  }

  function median(values: Array<number | null>): number | null {
    const nums = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
    if (nums.length === 0) return null;
    return nums[Math.floor(nums.length / 2)] ?? null;
  }

  const rows = [...byRoute.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, ss]) => {
      const fcp = median(ss.map((s) => s.fcpMs));
      const dcl = median(ss.map((s) => s.domContentLoadedMs));
      const load = median(ss.map((s) => s.loadEventMs));
      const heap = median(ss.map((s) => s.jsHeapKb));
      return `
    <tr>
      <td><code>${escapeHtml(route)}</code></td>
      <td style="color:${perfColor(fcp)}">${fmtMs(fcp)}</td>
      <td style="color:${perfColor(dcl)}">${fmtMs(dcl)}</td>
      <td style="color:${perfColor(load)}">${fmtMs(load)}</td>
      <td>${heap !== null ? `${heap.toLocaleString()} KB` : "—"}</td>
    </tr>`;
    })
    .join("");

  return `
  <h2>⏱ Performance baseline</h2>
  <p style="font-size:.85rem;color:#555">Median timings across all bot sessions. Green &lt;1 s · amber 1–3 s · red &gt;3 s.</p>
  <table class="perf-table">
    <thead>
      <tr>
        <th>Route</th>
        <th>FCP</th>
        <th>DOMContentLoaded</th>
        <th>Load</th>
        <th>JS Heap</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtUsd(usd: number): string {
  return `$${usd.toFixed(usd < 1 ? 4 : 2)}`;
}

export type ReportSummary = Record<Severity, number> & {
  total: number;
  distinct: number;
};

export function summarize(findings: Finding[]): ReportSummary {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  let total = 0;
  for (const f of findings) {
    counts[f.severity] += f.occurrences;
    total += f.occurrences;
  }
  return { ...counts, total, distinct: findings.length };
}

export interface Verdict {
  emoji: string;
  text: string;
  color: string;
}

/** One-line, plain-English bottom line for the whole run. */
export function verdict(sum: ReportSummary): Verdict {
  if (sum.critical > 0) {
    return {
      emoji: "🛑",
      text: `${sum.critical} serious issue${sum.critical === 1 ? "" : "s"} need attention`,
      color: SEVERITY_COLOR.critical,
    };
  }
  if (sum.high > 0) {
    return {
      emoji: "⚠️",
      text: `${sum.high} important issue${sum.high === 1 ? "" : "s"} to look at`,
      color: SEVERITY_COLOR.high,
    };
  }
  if (sum.medium + sum.low > 0) {
    return {
      emoji: "👀",
      text: `${sum.medium + sum.low} minor thing${sum.medium + sum.low === 1 ? "" : "s"} to review when convenient`,
      color: SEVERITY_COLOR.medium,
    };
  }
  return { emoji: "✅", text: "All clear — nothing needs attention", color: "#2e7d32" };
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return s !== 0 ? s : b.occurrences - a.occurrences;
  });
}

function renderFinding(f: Finding): string {
  const color = SEVERITY_COLOR[f.severity];
  const help = CATEGORY_HELP[f.category];
  const samples = f.sampleUrls
    .slice(0, 8)
    .map((u) => `<li><code>${escapeHtml(u)}</code></li>`)
    .join("");
  const personas = f.personas.length
    ? `<div class="meta">seen by: ${escapeHtml(f.personas.join(", "))}</div>`
    : "";
  return `
    <details class="finding">
      <summary>
        <span class="badge" style="background:${color}">${escapeHtml(f.severity)}</span>
        <span class="cat">${escapeHtml(f.category)}</span>
        <span class="title">${escapeHtml(f.title)}</span>
        <span class="count">×${f.occurrences}</span>
      </summary>
      <div class="body">
        <p class="what"><b>What this means:</b> ${escapeHtml(help.what)}</p>
        <p class="fix"><b>What to do:</b> ${escapeHtml(help.fix)}</p>
        <p class="detail">${escapeHtml(f.detail)}</p>
        ${personas}
        <div class="meta">first seen: ${escapeHtml(f.firstSeenAt)}</div>
        ${samples ? `<div class="meta">where:</div><ul>${samples}</ul>` : ""}
      </div>
    </details>`;
}

export function renderHtmlReport(findings: Finding[], meta: RunMeta, perf: PerfSample[] = []): string {
  const sum = summarize(findings);
  const v = verdict(sum);
  const sorted = sortFindings(findings);

  const summaryChips = SEVERITIES.map(
    (sev) =>
      `<span class="chip" title="${escapeHtml(SEVERITY_MEANING[sev])}" style="border-color:${SEVERITY_COLOR[sev]};color:${SEVERITY_COLOR[sev]}">${SEVERITY_EMOJI[sev]} ${escapeHtml(sev)}: <b>${sum[sev]}</b></span>`,
  ).join("");

  const legend = SEVERITIES.map(
    (sev) =>
      `<li><b style="color:${SEVERITY_COLOR[sev]}">${SEVERITY_EMOJI[sev]} ${escapeHtml(sev)}</b> — ${escapeHtml(SEVERITY_MEANING[sev])}</li>`,
  ).join("");

  const grouped = SEVERITIES.map((sev) => {
    const group = sorted.filter((f) => f.severity === sev);
    if (group.length === 0) return "";
    return `<h2 style="color:${SEVERITY_COLOR[sev]}">${SEVERITY_EMOJI[sev]} ${escapeHtml(sev)} (${group.length})</h2>${group
      .map(renderFinding)
      .join("")}`;
  }).join("");

  const cost = meta.cost
    ? `<tr><th>AI cost</th><td>${fmtUsd(meta.cost.usd)} · ${meta.cost.calls} calls · ${meta.cost.inputTokens.toLocaleString()} in / ${meta.cost.outputTokens.toLocaleString()} out tokens</td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bot fleet report — ${escapeHtml(meta.runId)}</title>
<style>
  :root { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  body { margin: 0; padding: 1.5rem; color: #1a1a1a; background: #f7f7f8; max-width: 60rem; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  .verdict { font-size: 1.15rem; font-weight: 700; padding: .8rem 1rem; border-radius: 10px; background: #fff; border-left: 6px solid; margin: .8rem 0 1rem; }
  table.meta-table { border-collapse: collapse; margin: 1rem 0; font-size: .9rem; }
  table.meta-table th { text-align: left; padding: .2rem .8rem .2rem 0; color: #555; font-weight: 600; }
  .chips { margin: 1rem 0; display: flex; gap: .5rem; flex-wrap: wrap; }
  .chip { border: 2px solid; border-radius: 999px; padding: .15rem .7rem; font-size: .85rem; background: #fff; }
  details.legend { margin: .5rem 0 1.5rem; font-size: .85rem; color: #444; }
  details.legend ul { margin: .4rem 0; padding-left: 1.1rem; }
  .finding { background: #fff; border: 1px solid #e3e3e6; border-radius: 8px; margin: .4rem 0; padding: .2rem .6rem; }
  .finding summary { cursor: pointer; display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
  .badge { color: #fff; border-radius: 4px; padding: .05rem .45rem; font-size: .72rem; text-transform: uppercase; }
  .cat { font-size: .78rem; color: #666; background: #eee; border-radius: 4px; padding: .05rem .4rem; }
  .title { font-weight: 600; }
  .count { margin-left: auto; color: #888; font-variant-numeric: tabular-nums; }
  .body { padding: .4rem 0 .6rem; font-size: .9rem; }
  .body .what { margin: .2rem 0; }
  .body .fix { margin: .2rem 0; color: #1a5e34; }
  .body .detail { margin: .4rem 0; color: #333; background: #f6f6f8; padding: .4rem .6rem; border-radius: 6px; white-space: pre-wrap; }
  .meta { color: #777; font-size: .8rem; margin: .2rem 0; }
  code { background: #f0f0f2; padding: .05rem .3rem; border-radius: 3px; font-size: .82rem; word-break: break-all; }
  .empty { color: #2e7d32; font-weight: 600; }
  table.perf-table { border-collapse: collapse; width: 100%; font-size: .85rem; margin: .8rem 0 1.5rem; }
  table.perf-table th { text-align: left; padding: .35rem .7rem; background: #f0f0f2; border-bottom: 2px solid #ddd; font-weight: 600; }
  table.perf-table td { padding: .3rem .7rem; border-bottom: 1px solid #ebebed; }
  table.perf-table tr:nth-child(even) td { background: #fafafa; }
</style>
</head>
<body>
  <h1>🤖 Bot fleet report</h1>
  <div class="verdict" style="border-left-color:${v.color};color:${v.color}">${v.emoji} ${escapeHtml(v.text)}</div>
  <table class="meta-table">
    <tr><th>Target</th><td><code>${escapeHtml(meta.baseUrl)}</code> <span class="cat">${escapeHtml(meta.targetClass)}</span></td></tr>
    <tr><th>When</th><td>${escapeHtml(meta.finishedAt)}</td></tr>
    <tr><th>Bots</th><td>${meta.sessions} session${meta.sessions === 1 ? "" : "s"} (${escapeHtml(meta.personas.join(", ") || "—")})</td></tr>
    <tr><th>Findings</th><td>${sum.distinct} distinct · ${sum.total} total observations</td></tr>
    ${cost}
    <tr><th>Run id</th><td><code>${escapeHtml(meta.runId)}</code></td></tr>
  </table>
  <div class="chips">${summaryChips}</div>
  <details class="legend"><summary>What do these mean?</summary><ul>${legend}</ul></details>
  ${sorted.length === 0 ? '<p class="empty">✅ No findings — clean run.</p>' : grouped}
  ${renderPerfTable(perf)}
</body>
</html>`;
}

/**
 * Plain-English Markdown digest, posted as the rolling results issue. Caps the
 * detailed list so the issue stays readable; the full report.html has everything.
 */
export function renderMarkdownSummary(findings: Finding[], meta: RunMeta): string {
  const sum = summarize(findings);
  const v = verdict(sum);
  const sorted = sortFindings(findings).filter((f) => f.severity !== "info");
  const cap = 25;

  const lines: string[] = [];
  lines.push(`# 🤖 Bot fleet — latest results`);
  lines.push("");
  lines.push(`## ${v.emoji} ${v.text}`);
  lines.push("");
  lines.push(
    `**Target:** \`${meta.baseUrl}\` · **When:** ${meta.finishedAt} · **Bots:** ${meta.sessions}`,
  );
  if (meta.cost) {
    lines.push("");
    lines.push(`**AI cost this run:** ${fmtUsd(meta.cost.usd)} (${meta.cost.calls} calls)`);
  }
  lines.push("");
  lines.push(`| Severity | Count |`);
  lines.push(`|---|---|`);
  for (const sev of SEVERITIES) {
    lines.push(`| ${SEVERITY_EMOJI[sev]} ${sev} | ${sum[sev]} |`);
  }
  lines.push("");

  if (sorted.length === 0) {
    lines.push(`✅ Nothing to action — the bots found no problems this run.`);
  } else {
    lines.push(`## What needs attention`);
    lines.push("");
    for (const f of sorted.slice(0, cap)) {
      const where = f.sampleUrls[0] ?? "";
      const more = f.sampleUrls.length > 1 ? ` (+${f.sampleUrls.length - 1} more)` : "";
      const loc = where ? ` — \`${where}\`${more}` : "";
      lines.push(
        `- ${SEVERITY_EMOJI[f.severity]} **${f.title}** — ${CATEGORY_HELP[f.category].what}${loc}`,
      );
    }
    if (sorted.length > cap) {
      lines.push("");
      lines.push(`…and ${sorted.length - cap} more. See the full report attached to the run.`);
    }
  }
  lines.push("");
  lines.push(`<sub>Run \`${meta.runId}\` · generated by the bot fleet (bots/).</sub>`);
  return lines.join("\n");
}

export async function writeReport(
  outDir: string,
  findings: Finding[],
  meta: RunMeta,
  perf: PerfSample[] = [],
): Promise<{ htmlPath: string; jsonPath: string; summaryPath: string; perfPath: string }> {
  await fs.mkdir(outDir, { recursive: true });
  const htmlPath = path.join(outDir, "report.html");
  const jsonPath = path.join(outDir, "findings.json");
  const summaryPath = path.join(outDir, "summary.md");
  const perfPath = path.join(outDir, "perf-baseline.json");
  await fs.writeFile(htmlPath, renderHtmlReport(findings, meta, perf), "utf8");
  await fs.writeFile(summaryPath, renderMarkdownSummary(findings, meta), "utf8");
  await fs.writeFile(
    jsonPath,
    JSON.stringify({ meta, summary: summarize(findings), findings }, null, 2),
    "utf8",
  );
  if (perf.length > 0) {
    await fs.writeFile(perfPath, JSON.stringify({ meta, samples: perf }, null, 2), "utf8");
  }
  return { htmlPath, jsonPath, summaryPath, perfPath };
}

/** Read all `${runDir}/shards/*.json` and merge into one finding set + perf samples. */
export async function aggregateShards(
  runDir: string,
): Promise<{ findings: Finding[]; sessions: number; personas: string[]; cost: CostTotals; perf: PerfSample[] }> {
  const shardsDir = path.join(runDir, "shards");
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(shardsDir)).filter((f) => f.endsWith(".json"));
  } catch {
    return { findings: [], sessions: 0, personas: [], cost: emptyCost(), perf: [] };
  }
  const store = new FindingStore();
  const personas = new Set<string>();
  const cost = emptyCost();
  const perf: PerfSample[] = [];
  let sessions = 0;
  for (const entry of entries) {
    try {
      const raw = await fs.readFile(path.join(shardsDir, entry), "utf8");
      const shard = JSON.parse(raw) as Shard;
      store.merge(shard.findings ?? []);
      if (shard.persona) personas.add(shard.persona);
      if (shard.cost) {
        cost.inputTokens += shard.cost.inputTokens;
        cost.outputTokens += shard.cost.outputTokens;
        cost.usd += shard.cost.usd;
        cost.calls += shard.cost.calls;
      }
      if (shard.perf) perf.push(...shard.perf);
      sessions += 1;
    } catch {
      // Skip unreadable/partial shards rather than failing the whole report.
    }
  }
  return { findings: store.all(), sessions, personas: [...personas], cost, perf };
}
