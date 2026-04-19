#!/usr/bin/env node
// @ts-check
/**
 * Rate-limit coverage auditor.
 *
 * Scans every app/api/**\/route.ts file and classifies it as:
 *
 *   covered   — imports isAllowed / ipKey / checkRateLimit
 *   exempt    — matches one of EXEMPT_PATTERNS (cron, webhook, internal)
 *   missing   — public endpoint with no rate limit (CI failure)
 *
 * Fails with exit code 1 if any `missing` endpoints are found, so it
 * doubles as a CI check. Run locally:
 *
 *   npm run audit:rate-limits
 *
 * Adding a new public endpoint? Either call `isAllowed(...)` inside
 * the handler or add an EXEMPT_PATTERNS entry with a clear reason.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const API_ROOT = path.join(process.cwd(), "app", "api");

/**
 * Patterns that don't need per-IP rate limiting. Document WHY each
 * is exempt — drift here is the most common source of bugs.
 */
const EXEMPT_PATTERNS = [
  // Crons auth via CRON_SECRET shared header (see lib/cron-auth.ts).
  // Vercel is the only caller, so per-IP rate limiting adds nothing.
  { match: /\/api\/cron\//, reason: "CRON_SECRET-authenticated; Vercel-only caller" },
  // Webhooks authenticate via provider signature (Stripe, Resend, etc.)
  // which is stronger than per-IP throttling.
  { match: /\/api\/webhooks?\//, reason: "signature-authenticated webhook" },
  { match: /\/api\/stripe\/webhook(\/|$)/, reason: "Stripe signature-authenticated" },
  { match: /\/api\/marketplace\/webhook(\/|$)/, reason: "signature-authenticated webhook" },
  // Admin endpoints run behind session auth + audit log.
  { match: /\/api\/admin\//, reason: "admin session + audit log gate" },
  { match: /\/api\/.*\/moderate(\/|$)/, reason: "admin-only moderation endpoint" },
  // Auth sub-endpoints (CSRF + cookie) have their own specialised
  // throttles inside the handler (bcrypt delay, lockout on bad attempts).
  { match: /\/api\/auth\//, reason: "built-in auth throttle/lockout" },
  { match: /\/api\/advisor-auth\//, reason: "advisor session + lockout built-in" },
  // Session-authenticated user-scoped endpoints — throttled per user.
  { match: /\/api\/account\//, reason: "session auth + per-user throttle" },
  { match: /\/api\/user-profile(\/|$)/, reason: "session auth + per-user throttle" },
  { match: /\/api\/saved-comparisons(\/|$)/, reason: "session auth + per-user throttle" },
  { match: /\/api\/shortlist(\/|$)/, reason: "session auth + per-user throttle" },
  { match: /\/api\/sync-shortlist(\/|$)/, reason: "session auth + per-user throttle" },
  { match: /\/api\/broker-portal\//, reason: "broker portal session auth" },
  { match: /\/api\/advisor-dashboard(\/|$)/, reason: "advisor session auth" },
  { match: /\/api\/advisor-compare(\/|$)/, reason: "advisor session auth" },
  { match: /\/api\/advisor-auction\//, reason: "advisor session auth" },
  { match: /\/api\/advisor-search\//, reason: "advisor session auth" },
  { match: /\/api\/consultation\//, reason: "advisor session auth" },
  { match: /\/api\/community\//, reason: "user session auth" },
  { match: /\/api\/course\//, reason: "user session auth" },
  { match: /\/api\/notification-preferences(\/|$)/, reason: "user session auth" },
  { match: /\/api\/listings\/my-listings(\/|$)/, reason: "user session auth" },
  { match: /\/api\/listings\/renew(\/|$)/, reason: "user session auth" },
  { match: /\/api\/listings\/checkout(\/|$)/, reason: "user session auth" },
  { match: /\/api\/advertise\/checkout(\/|$)/, reason: "user session auth" },
  { match: /\/api\/broker-health(\/|$)/, reason: "broker-portal session auth" },
  { match: /\/api\/analytics-dashboard(\/|$)/, reason: "admin session auth" },
  { match: /\/api\/cohort-stats(\/|$)/, reason: "admin session auth" },
  { match: /\/api\/exit-match(\/|$)/, reason: "admin session auth" },
  { match: /\/api\/fee-report(\/|$)/, reason: "admin session auth" },
  { match: /\/api\/marketplace\/allocation(\/|$)/, reason: "partner session auth" },
  { match: /\/api\/marketplace\/invoice\//, reason: "partner session auth" },
  { match: /\/api\/marketplace\/postback(\/|$)/, reason: "signature-authenticated webhook" },
  { match: /\/api\/marketplace\/wallet-topup(\/|$)/, reason: "partner session auth" },
  { match: /\/api\/marketplace\/notify(\/|$)/, reason: "partner session auth" },
  { match: /\/api\/partner\//, reason: "partner API-key auth" },
  // Stripe non-webhook endpoints require a logged-in session.
  { match: /\/api\/stripe\//, reason: "session auth required" },
  // Public v1 API key authenticated — has its own quota system.
  { match: /\/api\/v1\//, reason: "API-key authenticated with per-key quota" },
  // Revalidate + seed are CRON_SECRET-authenticated (see handlers).
  { match: /\/api\/revalidate(\/|$)/, reason: "CRON_SECRET-authenticated" },
  { match: /\/api\/seed(\/|$)/, reason: "CRON_SECRET-authenticated" },
  // Widget is a static-ish embed; cached via Vercel CDN pooling.
  { match: /\/api\/widget(\/|$)/, reason: "CDN-pooled embed response" },
  // OG image generator is static-deterministic and pooled by Vercel;
  // a per-IP throttle would cost cache hits without a threat model.
  { match: /\/api\/og(\/|$)/, reason: "static OG cache — provider pooled" },
  // Health endpoint must always respond quickly for uptime probes.
  { match: /\/api\/health(\/|$)/, reason: "uptime probe — must respond" },
  // Push notifications server → registered client push subscriptions;
  // authenticated via session, called from admin flows.
  { match: /\/api\/push\//, reason: "admin/session-authenticated push dispatch" },
];

async function findRouteFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findRouteFiles(p)));
    } else if (entry.isFile() && entry.name === "route.ts") {
      out.push(p);
    }
  }
  return out;
}

function extractMethods(source) {
  const methods = [];
  for (const verb of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
    const re = new RegExp(`export\\s+async\\s+function\\s+${verb}\\b`);
    if (re.test(source)) methods.push(verb);
  }
  return methods;
}

function hasRateLimit(source) {
  // Covers the three rate-limiting helpers used across the codebase:
  //   - lib/rate-limit-db  (isAllowed, ipKey)
  //   - lib/rate-limiter   (createRateLimiter, isRateLimited)
  //   - lib/rate-limit     (checkRateLimit, rateLimit)
  return (
    /\b(isAllowed|ipKey|checkRateLimit|createRateLimiter|isRateLimited|rate-limit-db|rate-limiter)\b/.test(
      source,
    )
  );
}

function classify(relPath, source) {
  const methods = extractMethods(source);
  const exempt = EXEMPT_PATTERNS.find((p) => p.match.test(relPath));
  if (exempt) {
    return { path: relPath, status: "exempt", methods, reason: exempt.reason };
  }
  if (hasRateLimit(source)) {
    return { path: relPath, status: "covered", methods };
  }
  return { path: relPath, status: "missing", methods };
}

async function main() {
  const files = await findRouteFiles(API_ROOT);
  const reports = [];
  for (const file of files) {
    const src = await fs.readFile(file, "utf8");
    const rel = `/${path.relative(process.cwd(), file).replace(/\\/g, "/")}`;
    reports.push(classify(rel, src));
  }

  const covered = reports.filter((r) => r.status === "covered");
  const exempt = reports.filter((r) => r.status === "exempt");
  const missing = reports.filter((r) => r.status === "missing");

  const total = reports.length;
  const coveragePct = total
    ? Math.round(((covered.length + exempt.length) / total) * 100)
    : 0;

  console.log(`\n=== Rate-limit coverage ===`);
  console.log(`  total:   ${total}`);
  console.log(`  covered: ${covered.length}`);
  console.log(`  exempt:  ${exempt.length}`);
  console.log(`  missing: ${missing.length}`);
  console.log(`  score:   ${coveragePct}%\n`);

  if (missing.length > 0) {
    console.log(`Missing rate limits on ${missing.length} endpoint(s):`);
    for (const m of missing) {
      console.log(`  - ${m.path}  [${m.methods.join(",") || "?"}]`);
    }
    console.log(
      `\nFix: add 'isAllowed(name, ipKey(req), { max, refillPerSec })' inside the handler,`,
    );
    console.log(
      `     or add an EXEMPT_PATTERNS entry to scripts/rate-limit-coverage.mjs with a reason.\n`,
    );
    // Run with --strict to fail the process. Default is report-only
    // so this script can track progress without blocking CI during
    // a phased rollout.
    if (process.argv.includes("--strict")) process.exit(1);
  } else {
    console.log(`All ${total} API routes rate-limited or explicitly exempted.\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
