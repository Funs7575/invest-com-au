#!/usr/bin/env node
/**
 * Post-deploy production smoke test.
 *
 * Hits a curated set of critical URLs after a main-branch deploy lands, and
 * fails (non-zero exit) if any return non-2xx or are missing expected text.
 * The 12-day cron silence in 2026-04 happened in part because nothing tested
 * production after deploy; this is the backstop that catches that class of
 * bug in <2 minutes.
 *
 * Triggered by .github/workflows/post-deploy-smoke.yml on push to main.
 *
 * Optional env:
 *   SMOKE_BASE_URL   default https://invest.com.au
 *   SMOKE_TIMEOUT_MS default 15000
 *   CRON_SECRET      if set, cron heartbeat check uses it (otherwise skipped)
 *
 * Add a new check by appending to the CHECKS array. Each check is:
 *   { name, path, expect_status?, expect_substring?, headers?, method? }
 */

const BASE_URL = (process.env.SMOKE_BASE_URL ?? "https://invest.com.au").replace(/\/$/, "");
const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS ?? "15000", 10);
const CRON_SECRET = process.env.CRON_SECRET;

const CHECKS = [
  { name: "homepage", path: "/", expect_substring: "<html" },
  { name: "sitemap", path: "/sitemap.xml", expect_substring: "<urlset" },
  { name: "robots", path: "/robots.txt", expect_substring: "User-agent" },
  { name: "og-fallback", path: "/opengraph-image", expect_status: 200 },
  { name: "advisor-search", path: "/advisors/search", expect_substring: "<html" },
  { name: "health", path: "/api/health", expect_status: 200 },
  ...(CRON_SECRET
    ? [
        {
          name: "cron-heartbeat",
          path: "/api/cron/heartbeat",
          headers: { Authorization: `Bearer ${CRON_SECRET}` },
          expect_status: 200,
        },
      ]
    : []),
];

let failed = 0;
const startAll = Date.now();

for (const check of CHECKS) {
  const url = `${BASE_URL}${check.path}`;
  const t0 = Date.now();
  let status = 0;
  let body = "";
  let err = null;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: check.method ?? "GET",
      headers: check.headers,
      signal: ac.signal,
      redirect: "follow",
    });
    status = r.status;
    body = await r.text();
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }
  const ms = Date.now() - t0;

  const expectStatus = check.expect_status ?? 200;
  const statusOk = status === expectStatus;
  const substringOk =
    check.expect_substring == null || body.includes(check.expect_substring);
  const ok = statusOk && substringOk && !err;

  const icon = ok ? "✓" : "✗";
  const detail = err
    ? `error: ${err}`
    : !statusOk
      ? `status ${status} (expected ${expectStatus})`
      : !substringOk
        ? `missing substring "${check.expect_substring}"`
        : "ok";
  console.log(`${icon} ${check.name.padEnd(20)} ${ms}ms  ${url}  ${detail}`);

  if (!ok) failed++;
}

const totalMs = Date.now() - startAll;
console.log(
  `\n${CHECKS.length - failed}/${CHECKS.length} checks passed in ${totalMs}ms`,
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed — investigate before next deploy.`);
  process.exit(1);
}
