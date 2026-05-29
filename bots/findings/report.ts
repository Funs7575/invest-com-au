/**
 * Report rendering + shard aggregation.
 *
 * `renderHtmlReport` is pure (string in, string out) and unit-tested. The
 * filesystem helpers (`writeReport`, `aggregateShards`) wrap it for the runner
 * and the Playwright globalTeardown that fans many parallel bot shards into one
 * report.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { type Finding, type Severity, SEVERITY_ORDER } from "./types";
import { FindingStore } from "./store";
import type { CostTotals } from "../ai/cost";

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
}

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#b00020",
  high: "#d9534f",
  medium: "#e0a800",
  low: "#6c757d",
  info: "#0d6efd",
};

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

export function summarize(findings: Finding[]): Record<Severity, number> & {
  total: number;
  distinct: number;
} {
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

function renderFinding(f: Finding): string {
  const color = SEVERITY_COLOR[f.severity];
  const samples = f.sampleUrls
    .slice(0, 8)
    .map((u) => `<li><code>${escapeHtml(u)}</code></li>`)
    .join("");
  const personas = f.personas.length
    ? `<div class="meta">personas: ${escapeHtml(f.personas.join(", "))}</div>`
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
        <p>${escapeHtml(f.detail)}</p>
        ${personas}
        <div class="meta">first seen: ${escapeHtml(f.firstSeenAt)}</div>
        ${samples ? `<div class="meta">sample URLs:</div><ul>${samples}</ul>` : ""}
      </div>
    </details>`;
}

export function renderHtmlReport(findings: Finding[], meta: RunMeta): string {
  const sum = summarize(findings);
  const sorted = [...findings].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return s !== 0 ? s : b.occurrences - a.occurrences;
  });

  const summaryChips = SEVERITIES.map(
    (sev) =>
      `<span class="chip" style="border-color:${SEVERITY_COLOR[sev]};color:${SEVERITY_COLOR[sev]}">${escapeHtml(sev)}: <b>${sum[sev]}</b></span>`,
  ).join("");

  const grouped = SEVERITIES.map((sev) => {
    const group = sorted.filter((f) => f.severity === sev);
    if (group.length === 0) return "";
    return `<h2 style="color:${SEVERITY_COLOR[sev]}">${escapeHtml(sev)} (${group.length})</h2>${group
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
  body { margin: 0; padding: 1.5rem; color: #1a1a1a; background: #f7f7f8; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  table.meta-table { border-collapse: collapse; margin: 1rem 0; font-size: .9rem; }
  table.meta-table th { text-align: left; padding: .2rem .8rem .2rem 0; color: #555; font-weight: 600; }
  .chips { margin: 1rem 0; display: flex; gap: .5rem; flex-wrap: wrap; }
  .chip { border: 2px solid; border-radius: 999px; padding: .15rem .7rem; font-size: .85rem; background: #fff; }
  .finding { background: #fff; border: 1px solid #e3e3e6; border-radius: 8px; margin: .4rem 0; padding: .2rem .6rem; }
  .finding summary { cursor: pointer; display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
  .badge { color: #fff; border-radius: 4px; padding: .05rem .45rem; font-size: .72rem; text-transform: uppercase; }
  .cat { font-size: .78rem; color: #666; background: #eee; border-radius: 4px; padding: .05rem .4rem; }
  .title { font-weight: 600; }
  .count { margin-left: auto; color: #888; font-variant-numeric: tabular-nums; }
  .body { padding: .4rem 0 .6rem; font-size: .9rem; }
  .meta { color: #777; font-size: .8rem; margin: .2rem 0; }
  code { background: #f0f0f2; padding: .05rem .3rem; border-radius: 3px; font-size: .82rem; word-break: break-all; }
  .empty { color: #2e7d32; font-weight: 600; }
</style>
</head>
<body>
  <h1>🤖 Bot fleet report</h1>
  <table class="meta-table">
    <tr><th>Run</th><td><code>${escapeHtml(meta.runId)}</code></td></tr>
    <tr><th>Target</th><td><code>${escapeHtml(meta.baseUrl)}</code> <span class="cat">${escapeHtml(meta.targetClass)}</span></td></tr>
    <tr><th>Window</th><td>${escapeHtml(meta.startedAt)} → ${escapeHtml(meta.finishedAt)}</td></tr>
    <tr><th>Sessions</th><td>${meta.sessions} (${escapeHtml(meta.personas.join(", ") || "—")})</td></tr>
    <tr><th>Findings</th><td>${sum.distinct} distinct · ${sum.total} total observations</td></tr>
    ${cost}
  </table>
  <div class="chips">${summaryChips}</div>
  ${sorted.length === 0 ? '<p class="empty">✅ No findings — clean run.</p>' : grouped}
</body>
</html>`;
}

export async function writeReport(
  outDir: string,
  findings: Finding[],
  meta: RunMeta,
): Promise<{ htmlPath: string; jsonPath: string }> {
  await fs.mkdir(outDir, { recursive: true });
  const htmlPath = path.join(outDir, "report.html");
  const jsonPath = path.join(outDir, "findings.json");
  await fs.writeFile(htmlPath, renderHtmlReport(findings, meta), "utf8");
  await fs.writeFile(
    jsonPath,
    JSON.stringify({ meta, summary: summarize(findings), findings }, null, 2),
    "utf8",
  );
  return { htmlPath, jsonPath };
}

/** Read all `${runDir}/shards/*.json` and merge into one finding set. */
export async function aggregateShards(
  runDir: string,
): Promise<{ findings: Finding[]; sessions: number; personas: string[] }> {
  const shardsDir = path.join(runDir, "shards");
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(shardsDir)).filter((f) => f.endsWith(".json"));
  } catch {
    return { findings: [], sessions: 0, personas: [] };
  }
  const store = new FindingStore();
  const personas = new Set<string>();
  let sessions = 0;
  for (const entry of entries) {
    try {
      const raw = await fs.readFile(path.join(shardsDir, entry), "utf8");
      const shard = JSON.parse(raw) as Shard;
      store.merge(shard.findings ?? []);
      if (shard.persona) personas.add(shard.persona);
      sessions += 1;
    } catch {
      // Skip unreadable/partial shards rather than failing the whole report.
    }
  }
  return { findings: store.all(), sessions, personas: [...personas] };
}
