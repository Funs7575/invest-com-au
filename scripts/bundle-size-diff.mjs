#!/usr/bin/env node
// @ts-check
/**
 * Diff two bundle-size summaries and emit Markdown suitable for a
 * sticky PR comment.
 *
 * Invocation:
 *   node scripts/bundle-size-diff.mjs \
 *     --base /tmp/base.json \
 *     --head /tmp/head.json \
 *     --out /tmp/comment.md
 *
 * Thresholds:
 *   ⚠️  flag a route when server bundle grows by >= 10% OR >= 5 KB
 *   ❌  flag a route when server bundle grows by >= 25% OR >= 20 KB
 *   ✅  shown for shrinks > 1 KB
 *
 * Advisory only. Not a blocking check — the PR comment is meant to
 * surface regressions for human review. Promote to a hard gate
 * once a stable baseline is established (~2 weeks of advisory data).
 */

import { promises as fs } from "node:fs";

const WARN_PCT = 10;
const WARN_KB = 5;
const FAIL_PCT = 25;
const FAIL_KB = 20;
const SHRINK_KB = 1;

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) throw new Error(`Missing --${name}`);
  return process.argv[i + 1];
}

function pct(base, head) {
  if (base === 0) return head === 0 ? 0 : 100;
  return ((head - base) / base) * 100;
}

function deltaBadge(baseKb, headKb) {
  const diffKb = headKb - baseKb;
  const diffPct = pct(baseKb, headKb);
  if (diffKb >= FAIL_KB || diffPct >= FAIL_PCT) return "❌";
  if (diffKb >= WARN_KB || diffPct >= WARN_PCT) return "⚠️";
  if (diffKb <= -SHRINK_KB) return "✅";
  return "·";
}

// Totals are measured in thousands of KB; an absolute-KB gate
// that makes sense per-route (20 KB) fires almost always on the
// aggregate. Use percent-only thresholds on totals. Calibrated
// so that a whole-site 5% regression is a real signal.
function totalBadge(baseKb, headKb) {
  const diffPct = pct(baseKb, headKb);
  if (diffPct >= 10) return "❌";
  if (diffPct >= 5) return "⚠️";
  if (diffPct <= -2) return "✅";
  return "·";
}

function fmtKb(n) {
  return `${n.toFixed(1)} KB`;
}

function fmtDiff(baseKb, headKb) {
  const diffKb = headKb - baseKb;
  const sign = diffKb > 0 ? "+" : "";
  const diffPct = pct(baseKb, headKb);
  return `${sign}${diffKb.toFixed(1)} KB (${sign}${diffPct.toFixed(1)}%)`;
}

async function main() {
  const baseFile = arg("base");
  const headFile = arg("head");
  const outFile = arg("out");

  const base = JSON.parse(await fs.readFile(baseFile, "utf8"));
  const head = JSON.parse(await fs.readFile(headFile, "utf8"));

  const allRoutes = new Set([
    ...Object.keys(base.routes || {}),
    ...Object.keys(head.routes || {}),
  ]);

  // Sort routes by the largest absolute size delta so the worst
  // regressions surface at the top of the comment.
  const sorted = [...allRoutes]
    .map((route) => {
      const bEntry = base.routes?.[route];
      const hEntry = head.routes?.[route];
      return {
        route,
        baseKb: bEntry?.serverKb ?? 0,
        headKb: hEntry?.serverKb ?? 0,
        isNew: !bEntry && !!hEntry,
        isRemoved: !!bEntry && !hEntry,
        delta: Math.abs((hEntry?.serverKb ?? 0) - (bEntry?.serverKb ?? 0)),
      };
    })
    .sort((a, b) => b.delta - a.delta);

  const lines = [];
  lines.push("## 📦 Bundle size diff");
  lines.push("");

  // Top-level totals first. The shared-chunks number is the
  // most important regression signal — it lands on every route.
  // Use totalBadge (percent-only) on the aggregates; deltaBadge's
  // absolute-KB thresholds are calibrated for per-route scale.
  const sharedBadge = totalBadge(
    base.sharedChunksKb ?? 0,
    head.sharedChunksKb ?? 0,
  );
  const serverBadge = totalBadge(
    base.totalServerKb ?? 0,
    head.totalServerKb ?? 0,
  );
  lines.push("| Metric | Before | After | Delta | |");
  lines.push("|---|---:|---:|---:|:---:|");
  lines.push(
    `| **Shared chunks** (all routes) | ${fmtKb(base.sharedChunksKb ?? 0)} | ${fmtKb(head.sharedChunksKb ?? 0)} | ${fmtDiff(base.sharedChunksKb ?? 0, head.sharedChunksKb ?? 0)} | ${sharedBadge} |`,
  );
  lines.push(
    `| **Server app bundle** (all routes) | ${fmtKb(base.totalServerKb ?? 0)} | ${fmtKb(head.totalServerKb ?? 0)} | ${fmtDiff(base.totalServerKb ?? 0, head.totalServerKb ?? 0)} | ${serverBadge} |`,
  );
  lines.push(
    `| **Total app build** | ${fmtKb(base.totalAppKb ?? 0)} | ${fmtKb(head.totalAppKb ?? 0)} | ${fmtDiff(base.totalAppKb ?? 0, head.totalAppKb ?? 0)} | |`,
  );
  lines.push("");

  // Route table — include:
  //   - routes whose server bundle changed by >= 0.3 KB
  //   - genuinely new routes (not in base)
  //   - genuinely removed routes (in base, not in head)
  // 0.3 KB minimum filter suppresses noise from unrelated builds.
  const changed = sorted.filter(
    (r) =>
      r.isNew ||
      r.isRemoved ||
      Math.abs(r.headKb - r.baseKb) >= 0.3,
  );

  if (changed.length === 0) {
    lines.push("_No per-route server-bundle changes ≥ 0.3 KB._");
  } else {
    lines.push("### Per-route server-bundle changes");
    lines.push("");
    lines.push("| Route | Before | After | Delta | |");
    lines.push("|---|---:|---:|---:|:---:|");
    // Cap at 25 rows — the comment can get long on big refactors.
    for (const r of changed.slice(0, 25)) {
      const status = r.isNew
        ? "🆕"
        : r.isRemoved
          ? "🗑️"
          : deltaBadge(r.baseKb, r.headKb);
      lines.push(
        `| \`${r.route}\` | ${fmtKb(r.baseKb)} | ${fmtKb(r.headKb)} | ${fmtDiff(r.baseKb, r.headKb)} | ${status} |`,
      );
    }
    if (changed.length > 25) {
      lines.push("");
      lines.push(`_…and ${changed.length - 25} more._`);
    }
  }

  lines.push("");
  lines.push(
    `<sub>Per-route thresholds: ⚠️ ≥ ${WARN_PCT}% or ${WARN_KB} KB · ❌ ≥ ${FAIL_PCT}% or ${FAIL_KB} KB · ✅ shrinks ≥ ${SHRINK_KB} KB. Totals-row thresholds (percent only): ⚠️ ≥ 5% · ❌ ≥ 10%. Advisory only — see scripts/bundle-size-diff.mjs to tune.</sub>`,
  );

  const out = lines.join("\n");
  await fs.writeFile(outFile, out);
  process.stdout.write(out);
}

main().catch((err) => {
  console.error("[bundle-size-diff] failed:", err);
  process.exit(1);
});
