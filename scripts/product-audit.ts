#!/usr/bin/env npx tsx
/**
 * Product audit — the truth report.
 *
 * Crawls the live site for HTTP status codes and queries Supabase for
 * table row counts. Produces a markdown report that answers the only
 * question that matters: "can a real user use this feature right now?"
 *
 * Usage:
 *   SITE_URL=https://invest-com-au.vercel.app \
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npx tsx scripts/product-audit.ts
 *
 * The script outputs a markdown report to stdout. Pipe it to a file
 * if you want to keep it:
 *
 *   npx tsx scripts/product-audit.ts > PRODUCT_AUDIT.md
 */

import { createClient } from "@supabase/supabase-js";

const SITE_URL =
  process.env.SITE_URL || "https://invest-com-au.vercel.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ── Route → table mapping ────────────────────────────────────
// Each entry is a public route that a visitor lands on from Google.
// `tables` lists the primary Supabase tables it reads from.
// `critical` marks high-traffic routes where empty content is
// a real trust/SEO problem.
interface RouteCheck {
  route: string;
  tables: string[];
  critical?: boolean;
  note?: string;
}

const ROUTES: RouteCheck[] = [
  // Core comparison surfaces
  { route: "/", tables: ["brokers", "articles"], critical: true },
  { route: "/brokers", tables: ["brokers"], critical: true, note: "status=active filter" },
  { route: "/broker/stake", tables: ["brokers"], critical: true, note: "sample slug" },
  { route: "/compare", tables: [], critical: true },
  { route: "/best", tables: [], critical: true },
  { route: "/best-for/smsf-500k", tables: ["best_for_scenarios", "brokers"], critical: true },
  { route: "/best-for/etfs-under-1000", tables: ["best_for_scenarios", "brokers"], critical: true },
  { route: "/best-for/international-shares-beginner", tables: ["best_for_scenarios", "brokers"], critical: true },
  { route: "/versus", tables: ["brokers"], critical: true },
  { route: "/rates", tables: ["brokers"] },
  { route: "/deals", tables: ["brokers"] },
  { route: "/fee-alerts", tables: ["broker_data_changes", "brokers"] },
  { route: "/whats-new", tables: ["broker_data_changes"] },
  { route: "/health-scores", tables: ["broker_health_scores", "brokers"] },

  // Articles + content
  { route: "/articles", tables: ["articles"], critical: true },
  { route: "/authors", tables: ["team_members"] },
  { route: "/press", tables: [] },
  { route: "/topic/etfs", tables: ["articles"], note: "sample topic" },
  { route: "/glossary", tables: [] },

  // Advisor marketplace
  { route: "/advisors", tables: ["professionals"], critical: true },
  { route: "/advisors/search", tables: ["professionals"], critical: true },
  { route: "/find-advisor", tables: [] },
  { route: "/for-advisors", tables: ["professionals"] },

  // Investment verticals
  { route: "/invest", tables: ["investment_listings"] },
  { route: "/invest/farmland", tables: ["commodity_sectors", "commodity_stocks"], critical: true },
  { route: "/invest/oil-gas", tables: ["commodity_sectors", "commodity_stocks"], critical: true },
  { route: "/invest/mining", tables: [] },
  { route: "/invest/renewable-energy", tables: [] },
  { route: "/invest/gold", tables: [] },
  { route: "/invest/commodities", tables: ["brokers"] },
  { route: "/invest/smsf", tables: ["brokers"] },

  // Newsletter
  { route: "/newsletter", tables: ["newsletter_editions"], note: "TABLE MAY NOT EXIST" },
  { route: "/newsletter/subscribe", tables: ["newsletter_segments"], critical: true },

  // Community
  { route: "/community", tables: ["forum_categories"], note: "TABLE MAY NOT EXIST" },

  // Tools + calculators
  { route: "/quiz", tables: [], critical: true },
  { route: "/calculators", tables: ["brokers"] },
  { route: "/fee-impact", tables: ["brokers"] },
  { route: "/fee-simulator", tables: ["brokers"] },
  { route: "/cgt-calculator", tables: [] },
  { route: "/retirement-calculator", tables: [] },
  { route: "/franking-credits-calculator", tables: [] },

  // Property
  { route: "/property", tables: ["property_listings", "suburb_data"] },
  { route: "/property/suburbs", tables: [] },

  // Foreign investment
  { route: "/foreign-investment", tables: ["brokers"] },

  // Legal / trust pages
  { route: "/about", tables: [] },
  { route: "/how-we-earn", tables: [] },
  { route: "/methodology", tables: [] },
  { route: "/editorial-policy", tables: [] },
  { route: "/privacy", tables: [] },
  { route: "/terms", tables: [] },
  { route: "/fsg", tables: [] },
  { route: "/complaints", tables: [] },
  { route: "/contact", tables: [] },

  // Features with 0 rows (known-empty surfaces)
  { route: "/stories", tables: ["switch_stories"], note: "0 rows" },
  { route: "/consultations", tables: ["consultations"], note: "0 rows" },
  { route: "/reports", tables: ["quarterly_reports"], note: "0 rows" },
  { route: "/pro/deals", tables: ["pro_deals"], note: "0 rows" },
  { route: "/alerts", tables: ["regulatory_alerts"], note: "0 rows" },

  // Crypto / CFD / robo
  { route: "/crypto", tables: ["brokers"] },
  { route: "/cfd", tables: ["brokers"] },
  { route: "/robo-advisors", tables: ["brokers"] },
  { route: "/share-trading", tables: ["brokers"] },
  { route: "/savings", tables: ["brokers"] },
  { route: "/etfs", tables: [] },

  // Insurance
  { route: "/insurance", tables: [] },

  // Courses
  { route: "/courses", tables: [] },
];

// ── HTTP crawler ─────────────────────────────────────────────
async function checkHttp(
  route: string,
): Promise<{ status: number; ok: boolean; redirect?: string; error?: string }> {
  const url = `${SITE_URL}${route}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "invest-product-audit/1.0" },
    });
    return {
      status: res.status,
      ok: res.ok,
      redirect: res.redirected ? res.url : undefined,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── DB row counter ───────────────────────────────────────────
async function getTableCounts(
  tables: string[],
): Promise<Map<string, number | "MISSING">> {
  const counts = new Map<string, number | "MISSING">();
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    for (const t of tables) counts.set(t, "MISSING");
    return counts;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // First check which tables actually exist
  const { data: existingTables } = await supabase
    .from("information_schema.tables" as never)
    .select("table_name")
    .eq("table_schema", "public");

  // Fallback: just try each table
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) {
        counts.set(table, "MISSING");
      } else {
        counts.set(table, count ?? 0);
      }
    } catch {
      counts.set(table, "MISSING");
    }
  }
  return counts;
}

// ── Report generator ─────────────────────────────────────────
interface RouteResult {
  route: string;
  httpStatus: number;
  httpOk: boolean;
  tables: Array<{ name: string; count: number | "MISSING" }>;
  critical: boolean;
  verdict: "OK" | "EMPTY" | "BROKEN" | "MISSING_TABLE" | "HTTP_ERROR";
  note: string;
}

function computeVerdict(r: RouteResult): RouteResult["verdict"] {
  if (!r.httpOk) return "HTTP_ERROR";
  if (r.tables.some((t) => t.count === "MISSING")) return "MISSING_TABLE";
  if (r.tables.length > 0 && r.tables.every((t) => t.count === 0)) return "EMPTY";
  return "OK";
}

async function main() {
  console.error(`Product audit starting — ${ROUTES.length} routes`);
  console.error(`Site: ${SITE_URL}`);
  console.error(`DB: ${SUPABASE_URL ? "configured" : "NOT configured (skip DB checks)"}`);
  console.error("");

  // Collect unique tables
  const allTables = [...new Set(ROUTES.flatMap((r) => r.tables))];
  console.error(`Checking ${allTables.length} unique tables...`);
  const tableCounts = await getTableCounts(allTables);

  // Check HTTP status for all routes (parallel, batched)
  console.error(`Crawling ${ROUTES.length} routes...`);
  const BATCH_SIZE = 10;
  const results: RouteResult[] = [];

  for (let i = 0; i < ROUTES.length; i += BATCH_SIZE) {
    const batch = ROUTES.slice(i, i + BATCH_SIZE);
    const httpResults = await Promise.all(
      batch.map((r) => checkHttp(r.route)),
    );

    for (let j = 0; j < batch.length; j++) {
      const rc = batch[j];
      const http = httpResults[j];
      const tableResults = rc.tables.map((t) => ({
        name: t,
        count: tableCounts.get(t) ?? "MISSING" as const,
      }));

      const result: RouteResult = {
        route: rc.route,
        httpStatus: http.status,
        httpOk: http.ok,
        tables: tableResults,
        critical: rc.critical ?? false,
        verdict: "OK",
        note: rc.note || "",
      };
      result.verdict = computeVerdict(result);
      if (http.error) result.note = http.error;
      results.push(result);
    }

    process.stderr.write(`  ${Math.min(i + BATCH_SIZE, ROUTES.length)}/${ROUTES.length}\r`);
  }
  console.error("");

  // ── Produce report ───────────────────────────────────────
  const broken = results.filter((r) => r.verdict !== "OK");
  const criticalBroken = broken.filter((r) => r.critical);
  const ok = results.filter((r) => r.verdict === "OK");

  const lines: string[] = [];
  lines.push(`# Product Audit Report`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Site:** ${SITE_URL}`);
  lines.push(`**Routes checked:** ${results.length}`);
  lines.push(`**OK:** ${ok.length} | **Broken/Empty:** ${broken.length} | **Critical issues:** ${criticalBroken.length}`);
  lines.push(``);

  // Table counts summary
  lines.push(`## Table Row Counts`);
  lines.push(``);
  lines.push(`| Table | Rows | Status |`);
  lines.push(`|-------|------|--------|`);
  for (const [table, count] of [...tableCounts.entries()].sort((a, b) => {
    if (a[1] === "MISSING") return 1;
    if (b[1] === "MISSING") return -1;
    return (b[1] as number) - (a[1] as number);
  })) {
    const status =
      count === "MISSING" ? "TABLE MISSING" : count === 0 ? "EMPTY" : "OK";
    const emoji =
      count === "MISSING" ? "!!" : count === 0 ? "--" : "OK";
    lines.push(
      `| ${table} | ${count === "MISSING" ? "N/A" : count} | ${emoji} ${status} |`,
    );
  }
  lines.push(``);

  // Critical issues
  if (criticalBroken.length > 0) {
    lines.push(`## CRITICAL Issues (high-traffic routes)`);
    lines.push(``);
    for (const r of criticalBroken) {
      const tableInfo = r.tables
        .map((t) => `${t.name}=${t.count}`)
        .join(", ");
      lines.push(
        `- **${r.route}** — ${r.verdict} (HTTP ${r.httpStatus}) [${tableInfo}] ${r.note}`,
      );
    }
    lines.push(``);
  }

  // All broken
  if (broken.length > 0) {
    lines.push(`## All Issues`);
    lines.push(``);
    lines.push(`| Route | HTTP | Verdict | Tables | Note |`);
    lines.push(`|-------|------|---------|--------|------|`);
    for (const r of broken) {
      const tableInfo = r.tables
        .map((t) => `${t.name}=${t.count}`)
        .join(", ");
      lines.push(
        `| ${r.route} | ${r.httpStatus} | ${r.verdict} | ${tableInfo} | ${r.note} |`,
      );
    }
    lines.push(``);
  }

  // OK routes
  lines.push(`## Working Routes (${ok.length})`);
  lines.push(``);
  lines.push(`| Route | HTTP | Tables |`);
  lines.push(`|-------|------|--------|`);
  for (const r of ok) {
    const tableInfo = r.tables
      .map((t) => `${t.name}=${t.count}`)
      .join(", ");
    lines.push(`| ${r.route} | ${r.httpStatus} | ${tableInfo} |`);
  }
  lines.push(``);

  // Summary recommendations
  lines.push(`## Recommended Actions`);
  lines.push(``);

  const missingTableRoutes = results.filter(
    (r) => r.verdict === "MISSING_TABLE",
  );
  if (missingTableRoutes.length > 0) {
    lines.push(`### Missing Tables`);
    lines.push(`These routes query tables that do not exist in the database:`);
    for (const r of missingTableRoutes) {
      const missing = r.tables.filter((t) => t.count === "MISSING");
      lines.push(`- \`${r.route}\` → needs \`${missing.map((t) => t.name).join("`, `")}\``);
    }
    lines.push(``);
  }

  const emptyRoutes = results.filter((r) => r.verdict === "EMPTY");
  if (emptyRoutes.length > 0) {
    lines.push(`### Empty Content`);
    lines.push(`These routes load but show empty/placeholder content:`);
    for (const r of emptyRoutes) {
      const empty = r.tables.filter((t) => t.count === 0);
      lines.push(`- \`${r.route}\` → \`${empty.map((t) => t.name).join("`, `")}\` have 0 rows`);
    }
    lines.push(``);
  }

  const httpErrors = results.filter((r) => r.verdict === "HTTP_ERROR");
  if (httpErrors.length > 0) {
    lines.push(`### HTTP Errors`);
    for (const r of httpErrors) {
      lines.push(`- \`${r.route}\` → HTTP ${r.httpStatus} ${r.note}`);
    }
    lines.push(``);
  }

  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
