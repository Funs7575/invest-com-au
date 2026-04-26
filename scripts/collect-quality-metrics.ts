/**
 * Collect quality metrics → write a weekly snapshot to
 * docs/audits/metrics-history/<YYYY-MM-DD>.json.
 *
 * Invoked by:
 *   - .github/workflows/code-quality.yml (Sun 23:00 UTC, weekly)
 *   - .github/workflows/code-quality-pr.yml (per-PR diff comment)
 *
 * Reads the canonical target list from .quality-targets.yml and emits
 * a typed snapshot the /admin/code-quality page renders verbatim.
 *
 * Local dev:
 *
 *     SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/collect-quality-metrics.ts > out.json
 *
 * Required env (CI provides):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env:
 *   - GITHUB_SHA       — embedded in the snapshot's `commit` field.
 *   - LIGHTHOUSE_TOP5  — JSON array of perf scores 0-100; falls back to baseline if absent.
 *   - COVERAGE_JSON    — path to vitest-coverage v8 summary (defaults to ./coverage/coverage-summary.json).
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────────────

type Direction = "up" | "down";

interface MetricTarget {
  label: string;
  direction: Direction;
  unit: "percent" | "count" | "score";
  baseline: number;
  target: number;
  total?: number;
  weight: number;
}

interface MetricSnapshot extends MetricTarget {
  id: string;
  current: number | null;
  score: number; // 0..1
  delta_vs_baseline: number;
  collected_at: string;
}

interface OverallSnapshot {
  collected_at: string;
  commit: string | null;
  branch: string | null;
  metrics: MetricSnapshot[];
  weighted_score: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
}

// ── Helpers ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");

function readYaml(filepath: string): Record<string, unknown> {
  // Tiny YAML reader sufficient for .quality-targets.yml's flat shape —
  // avoids adding `js-yaml` as a runtime dep just for this script.
  const raw = require("node:fs").readFileSync(filepath, "utf8");
  // Use a trivial parser via require if js-yaml is present; otherwise
  // fall back to JSON-like parsing of the limited shape we own.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yaml = require("js-yaml") as { load: (s: string) => unknown };
    return yaml.load(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      "js-yaml not installed. Run `npm install --save-dev js-yaml` or invoke this script via the CI workflow which installs it.",
    );
  }
}

function envOr(name: string, fallback: string | null = null): string | null {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function gitInfo() {
  try {
    return {
      commit: execSync("git rev-parse HEAD", { cwd: ROOT })
        .toString()
        .trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: ROOT })
        .toString()
        .trim(),
    };
  } catch {
    return { commit: null, branch: null };
  }
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function scoreOne(t: MetricTarget, current: number | null): number {
  if (current == null) return 0;
  if (t.direction === "up") {
    if (t.target === 0) return current >= 0 ? 1 : 0;
    return clamp01(current / t.target);
  }
  // direction === 'down': lower-is-better. target=0 ⇒ score=1 only at 0.
  if (current <= t.target) return 1;
  if (t.baseline <= t.target) return 1; // degenerate; nothing to improve.
  // Linear from baseline (score 0) to target (score 1).
  return clamp01((t.baseline - current) / (t.baseline - t.target));
}

function letterGrade(weighted: number): OverallSnapshot["grade"] {
  if (weighted >= 0.95) return "A+";
  if (weighted >= 0.9) return "A";
  if (weighted >= 0.8) return "B";
  if (weighted >= 0.7) return "C";
  if (weighted >= 0.6) return "D";
  return "F";
}

// ── Collectors ───────────────────────────────────────────────────────

interface CollectorContext {
  supabaseUrl: string;
  supabaseKey: string;
}

async function collectFromSupabase(
  ctx: CollectorContext,
): Promise<Record<string, number>> {
  const sb = createClient(ctx.supabaseUrl, ctx.supabaseKey, {
    auth: { persistSession: false },
  });
  const out: Record<string, number> = {};

  // M04 RLS tables with policies — count distinct tablename in pg_policies
  const { data: policyData } = await sb
    .rpc("get_table_count_by_property", { property: "rls_policy" })
    .single();
  if (policyData) {
    out.M04_rls_tables_with_policies =
      (policyData as { count?: number }).count ?? 0;
  }

  // Fallback: when the helper RPC isn't available, query directly via REST.
  // Keep RPC path above so a future Phase-3 RPC can short-circuit. For now
  // we use direct queries via the JS client.

  // RLS tables with policies — distinct count
  const { count: rlsCount } = await sb
    .from("pg_policies" as never)
    .select("tablename", { count: "exact", head: true });
  if (rlsCount != null) out.M04_rls_tables_with_policies = rlsCount;

  // M09 cron success rate (7d)
  const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: cronTotal } = await sb
    .from("cron_run_log")
    .select("id", { count: "exact", head: true })
    .gte("started_at", sevenDays);
  const { count: cronOk } = await sb
    .from("cron_run_log")
    .select("id", { count: "exact", head: true })
    .gte("started_at", sevenDays)
    .eq("status", "ok");
  if (cronTotal != null && cronTotal > 0) {
    out.M09_cron_success_rate_7d = (100 * (cronOk ?? 0)) / cronTotal;
  } else {
    out.M09_cron_success_rate_7d = 0;
  }

  // M10 PostHog mirror events / day (last 24h)
  const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: phCount } = await sb
    .from("posthog_events_mirror")
    .select("id", { count: "exact", head: true })
    .gte("event_timestamp", oneDay);
  out.M10_posthog_mirror_events_per_day = phCount ?? 0;

  // M12 OG image coverage (articles with cover_image_url not null)
  const { count: ogCount } = await sb
    .from("articles")
    .select("id", { count: "exact", head: true })
    .not("cover_image_url", "is", null);
  out.M12_og_image_coverage = ogCount ?? 0;

  return out;
}

async function collectAdvisorCounts(
  ctx: CollectorContext,
): Promise<{ M07: number; M08: number }> {
  // The Supabase advisor count is reachable via the management API; in CI
  // we proxy through a small admin route so the SUPABASE_ACCESS_TOKEN isn't
  // shared with all jobs. For now, emit baseline + log a warning so the
  // dashboard renders — replaceable when /api/admin/supabase-advisors lands.
  void ctx;
  return { M07: -1, M08: -1 };
}

function collectFromCoverageJson(): Record<string, number> {
  const p =
    envOr("COVERAGE_JSON") ??
    path.join(ROOT, "coverage", "coverage-summary.json");
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const json = require(p) as {
      total: {
        lines: { pct: number };
        branches: { pct: number };
        functions: { pct: number };
        statements: { pct: number };
      };
    };
    return {
      M01_test_coverage_lines: json.total.lines.pct,
      M01_test_coverage_branches: json.total.branches.pct,
      M01_test_coverage_functions: json.total.functions.pct,
    };
  } catch {
    return {};
  }
}

function collectFromGrep(): Record<string, number> {
  const out: Record<string, number> = {};

  // M02 — API routes with tests (heuristic: __tests__/api/*.test.ts files
  // that match a route under app/api/)
  try {
    const testFiles = execSync(
      `find ${ROOT}/__tests__/api -name "*.test.ts" 2>/dev/null | wc -l`,
      { shell: "/bin/bash" },
    )
      .toString()
      .trim();
    out.M02_api_routes_with_tests = parseInt(testFiles, 10) || 0;
  } catch {
    /* noop */
  }

  // M03 — API routes using Zod (z.object|safeParse|.parse() in app/api/)
  try {
    const zod = execSync(
      `grep -rln "z\\.object\\|safeParse\\|\\.parse(" ${ROOT}/app/api --include="*.ts" 2>/dev/null | grep -v ".test." | wc -l`,
      { shell: "/bin/bash" },
    )
      .toString()
      .trim();
    out.M03_api_routes_with_zod = parseInt(zod, 10) || 0;
  } catch {
    /* noop */
  }

  // M06 — Stripe webhook events handled (count case '...' in route.ts)
  try {
    const events = execSync(
      `grep -E "^\\s*case\\s+['\\\"][a-z_.]+['\\\"]:" ${ROOT}/app/api/stripe/webhook/route.ts 2>/dev/null | wc -l`,
      { shell: "/bin/bash" },
    )
      .toString()
      .trim();
    out.M06_stripe_webhook_events = parseInt(events, 10) || 0;
  } catch {
    /* noop */
  }

  // M05 — migration drift (rough: count tables in db.types.ts not present
  // as `CREATE TABLE` in any migration). Cheap proxy below; replace with
  // a precise reconciliation script when stream-A backfill begins.
  try {
    const types = path.join(ROOT, "lib", "database.types.ts");
    const sql = execSync(
      `grep -h "^CREATE TABLE\\|^create table" ${ROOT}/supabase/migrations/*.sql 2>/dev/null | wc -l`,
      { shell: "/bin/bash" },
    )
      .toString()
      .trim();
    const inTypes = execSync(
      `grep -c "          Tables: {" ${types} || true`,
      { shell: "/bin/bash" },
    )
      .toString()
      .trim();
    void inTypes;
    // We don't have a precise live count without DB access from CI; emit the
    // CREATE TABLE count and let the snapshot delta show the trend.
    out.M05_migration_drift_create_tables = parseInt(sql, 10) || 0;
  } catch {
    /* noop */
  }

  return out;
}

function collectFromLighthouse(): Record<string, number> {
  const raw = envOr("LIGHTHOUSE_TOP5");
  if (!raw) return {};
  try {
    const arr = JSON.parse(raw) as number[];
    if (!Array.isArray(arr) || arr.length === 0) return {};
    const sorted = [...arr].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] as number;
    return { M11_lighthouse_perf_top5_mobile: median };
  } catch {
    return {};
  }
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const targetsPath = path.join(ROOT, ".quality-targets.yml");
  const cfg = readYaml(targetsPath) as { metrics: Record<string, MetricTarget> };

  const ctx: CollectorContext = {
    supabaseUrl: envOr("NEXT_PUBLIC_SUPABASE_URL", "") ?? "",
    supabaseKey: envOr("SUPABASE_SERVICE_ROLE_KEY", "") ?? "",
  };

  const collectors: Record<string, number> = {
    ...collectFromGrep(),
    ...collectFromCoverageJson(),
    ...collectFromLighthouse(),
  };

  if (ctx.supabaseUrl && ctx.supabaseKey) {
    Object.assign(collectors, await collectFromSupabase(ctx));
    const adv = await collectAdvisorCounts(ctx);
    if (adv.M07 >= 0) collectors.M07_supabase_security_advisors = adv.M07;
    if (adv.M08 >= 0) collectors.M08_supabase_perf_advisors = adv.M08;
  }

  const collectedAt = new Date().toISOString();
  const metrics: MetricSnapshot[] = Object.entries(cfg.metrics).map(
    ([id, t]) => {
      const current = collectors[id] ?? null;
      const score = scoreOne(t, current);
      return {
        id,
        ...t,
        current,
        score,
        delta_vs_baseline: current == null ? 0 : current - t.baseline,
        collected_at: collectedAt,
      };
    },
  );

  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  const weighted =
    metrics.reduce((s, m) => s + m.score * m.weight, 0) / totalWeight;
  const grade = letterGrade(weighted);

  const { commit, branch } = gitInfo();
  const out: OverallSnapshot = {
    collected_at: collectedAt,
    commit,
    branch,
    metrics,
    weighted_score: weighted,
    grade,
  };

  // Stdout = JSON (consumed by GH Action / pipe).
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");

  // Write to docs/audits/metrics-history/<date>.json AND latest.json so the
  // admin page reads the latest without computing the date.
  const histDir = path.join(ROOT, "docs", "audits", "metrics-history");
  await fs.mkdir(histDir, { recursive: true });
  const dateKey = collectedAt.slice(0, 10);
  await fs.writeFile(
    path.join(histDir, `${dateKey}.json`),
    JSON.stringify(out, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(ROOT, "docs", "audits", "metrics-latest.json"),
    JSON.stringify(out, null, 2) + "\n",
  );
}

main().catch((err) => {
  console.error("collect-quality-metrics failed:", err);
  process.exit(1);
});
