#!/usr/bin/env node
// @ts-check
/**
 * Nightly deterministic bot fleet — one command, no LLM, no API spend.
 *
 * Runs the two reliable, deterministic probes against a target site and writes
 * a single dated report. Designed to be turnkey: `npm run bots:nightly`.
 *
 *   1. Page sweep   (bots/journey/site-audit.cjs)  — every key route: HTTP
 *      status, console/SSR errors, h1/CTA heuristics, site-wide link crawl with
 *      retry-verified broken-link detection. Behind the side-effect firewall.
 *   2. API probe    (scripts/bots-probe-api.ts)    — every GET /api route:
 *      flags consistent 5xx (real bugs), ignores 401/403/404.
 *
 * Output: bots/reports/nightly-YYYY-MM-DD.md  (+ a concise console summary).
 *
 * Exit code:
 *   0  — clean (no broken links, no 5xx API routes)
 *   1  — real issues found (broken links and/or 5xx) — usable as a cron/CI gate
 *   2  — a probe failed to run (e.g. chromium not installed)
 *
 * Config:
 *   BOTS_BASE_URL   target (default: the Netlify production mirror)
 *   Run `npm run bots:install` once first so Chromium is present.
 *
 * Cost: $0 — pure Playwright + fetch, no Anthropic API calls.
 */
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BOTS_BASE_URL || "https://lambent-sawine-17c3dd.netlify.app";
const ROOT = process.cwd();
const TMP = "/tmp/bots-nightly";
const today = new Date().toISOString().slice(0, 10);
const reportPath = path.join(ROOT, "bots", "reports", `nightly-${today}.md`);

/** Run a child probe, capturing whether it completed. */
function run(label, cmd, args, env) {
  process.stdout.write(`\n[bots:nightly] ▶ ${label} …\n`);
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, ...env },
    timeout: 10 * 60 * 1000,
  });
  return res.status; // null on timeout/signal
}

async function readJson(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function main() {
  await fs.mkdir(TMP, { recursive: true });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });

  // ── 1. Page sweep ────────────────────────────────────────────────────────
  const sweepRan = run(
    "page sweep (site-audit)",
    "node",
    ["bots/journey/site-audit.cjs"],
    { NODE_PATH: "node_modules", AUDIT_BASE: BASE, AUDIT_OUT: TMP },
  ) === 0;
  const sweep = sweepRan ? await readJson(path.join(TMP, "site-audit.json")) : null;

  // ── 2. API probe ─────────────────────────────────────────────────────────
  const probeStatus = run(
    "API probe",
    "npx",
    ["tsx", "scripts/bots-probe-api.ts"],
    { BOTS_BASE_URL: BASE },
  );
  // probe exits 1 when 5xx found — that's data, not a run failure.
  const probeRan = probeStatus === 0 || probeStatus === 1;
  const probe = probeRan ? await readJson(path.join(ROOT, "bots", ".runs", "latest-api-probe.json")) : null;

  // ── Aggregate ──────────────────────────────────────────────────────────────
  const s = sweep?.summary;
  const brokenLinks = s?.brokenLinks ?? [];
  const flagged = s?.flagged ?? [];
  const serverErrors = probe?.serverErrors ?? [];
  const issues = brokenLinks.length + serverErrors.length;

  const lines = [];
  lines.push(`# Nightly bot fleet — ${today}`, "");
  lines.push(`Target: \`${BASE}\` · deterministic (no LLM, $0) · side-effect firewall on.`, "");
  lines.push(issues === 0
    ? `## ✅ Clean — no broken links, no 5xx API routes.`
    : `## ⚠️ ${issues} issue(s) — ${brokenLinks.length} broken link(s), ${serverErrors.length} 5xx API route(s).`, "");

  lines.push("## Page sweep", "");
  if (!sweep) {
    lines.push("- ⚠️ did not complete (is Chromium installed? `npm run bots:install`).", "");
  } else {
    lines.push(`- Routes audited: **${s.routesAudited}** · flagged: **${s.flaggedCount}**`);
    lines.push(`- Links discovered: ${s.linksDiscovered} · probed: ${s.linksProbed} · **broken: ${brokenLinks.length}**`, "");
    if (brokenLinks.length) {
      lines.push("Broken links (retry-verified):");
      for (const b of brokenLinks.slice(0, 30)) lines.push(`  - \`${typeof b === "string" ? b : JSON.stringify(b)}\``);
      lines.push("");
    }
    if (flagged.length) {
      lines.push("Flagged routes (verify — sandbox proxy can throw transient 4xx/5xx):");
      for (const f of flagged) lines.push(`  - ${f.status} \`${f.route}\` — ${(f.flags || []).join(", ")}`);
      lines.push("");
    }
  }

  lines.push("## API probe", "");
  if (!probe) {
    lines.push("- ⚠️ did not complete.", "");
  } else {
    const c = probe.counts || {};
    lines.push(`- Probed: **${c.probed}** · ok: ${c.ok} · auth-required: ${c.authRequired} · 404: ${c.notFound} · **5xx: ${serverErrors.length}** · net-err: ${c.networkError}`, "");
    if (serverErrors.length) {
      lines.push("5xx routes (real bugs):");
      for (const e of serverErrors) lines.push(`  - ${e.status} \`${e.apiPath}\` (${e.routeFile})`);
      lines.push("");
    }
  }

  lines.push("---", `_Generated by \`npm run bots:nightly\`._`);

  await fs.writeFile(reportPath, lines.join("\n") + "\n");
  console.log(`\n[bots:nightly] Report written: ${path.relative(ROOT, reportPath)}`);
  console.log(`[bots:nightly] ${issues === 0 ? "CLEAN" : issues + " issue(s)"} — broken links: ${brokenLinks.length}, 5xx: ${serverErrors.length}`);

  if (!sweep && !probe) process.exit(2);
  process.exit(issues > 0 ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error("[bots:nightly] fatal:", err); process.exit(2); });
}
