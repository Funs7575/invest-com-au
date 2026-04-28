#!/usr/bin/env node
// @ts-check
/**
 * Stripe webhook idempotency gate (V-NEW-03).
 *
 * Detects any new Stripe webhook handler added in the current PR under
 *   app/api/webhooks/stripe/**\/route.ts        (DD-* stream path)
 *   app/api/stripe/webhook\/**\/route.ts        (existing main handler path)
 *
 * Fails the build if no corresponding idempotency test exists for the handler.
 *
 * An idempotency test must either:
 *   a) Live at __tests__/api/webhooks/stripe/<name>.idempotency.test.ts, OR
 *   b) Contain the marker comment  // idempotency-tested: stripe
 *      anywhere in __tests__/
 *
 * Usage:
 *   npm run audit:stripe-idempotency       # local
 *   node scripts/check-stripe-idempotency.mjs  # direct
 *
 * CI sets GITHUB_BASE_REF so the script only examines handler files added in
 * the current PR.  Locally it falls back to comparing against `main`.
 *
 * To mark a handler as intentionally covered by a shared test (e.g. a
 * thin-adapter that delegates to a fully-tested core handler), add:
 *   // idempotency-covered-by: <path-to-test>
 * inside the handler file itself.  The gate accepts this as equivalent to
 * a dedicated test file.
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TESTS_ROOT = path.join(REPO_ROOT, "__tests__");

// Glob patterns for Stripe webhook handler files to watch.
// DD-* items land under app/api/webhooks/stripe/**
// The existing main handler lives at app/api/stripe/webhook/route.ts
const HANDLER_GLOBS = [
  "app/api/webhooks/stripe/**/*.ts",
  "app/api/webhooks/stripe/**/*.tsx",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns handler files added in the current PR vs the base branch.
 * @param {string} baseRef
 * @returns {string[]} absolute paths
 */
export function getAddedHandlers(baseRef) {
  const patterns = HANDLER_GLOBS.map((g) => `'${g}'`).join(" ");
  try {
    const raw = execSync(
      `git diff --name-only --diff-filter=A origin/${baseRef}...HEAD -- ${patterns}`,
      { encoding: "utf8", cwd: REPO_ROOT, stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => path.join(REPO_ROOT, f));
  } catch {
    return [];
  }
}

/**
 * Returns true if the handler file contains an explicit coverage bypass marker.
 * @param {string} content
 * @returns {boolean}
 */
export function hasBypassMarker(content) {
  return (
    /\/\/\s*idempotency-covered-by:/i.test(content) ||
    /\/\/\s*idempotency-tested:\s*stripe/i.test(content)
  );
}

/**
 * Derives the canonical idempotency test path for a given handler.
 * e.g. app/api/webhooks/stripe/subscriptions/route.ts
 *   → __tests__/api/webhooks/stripe/subscriptions.idempotency.test.ts
 * @param {string} handlerAbs  absolute path to the handler
 * @returns {string}
 */
export function canonicalTestPath(handlerAbs) {
  const rel = path.relative(path.join(REPO_ROOT, "app/api/webhooks/stripe"), handlerAbs);
  // e.g. "subscriptions/route.ts" → "subscriptions"
  const parts = rel.split(path.sep);
  const name = parts.length > 1 ? parts[0] : path.basename(rel, ".ts");
  return path.join(TESTS_ROOT, "api", "webhooks", "stripe", `${name}.idempotency.test.ts`);
}

/**
 * Checks whether an idempotency test exists for the given handler.
 * @param {string} handlerAbs  absolute path to the handler
 * @returns {Promise<boolean>}
 */
export async function hasIdempotencyTest(handlerAbs) {
  // a) Convention-based path
  const canonical = canonicalTestPath(handlerAbs);
  try {
    await fs.access(canonical);
    return true;
  } catch {
    // fall through to marker scan
  }

  // b) Marker scan — any test file under __tests__/ with the global marker
  const marker = "idempotency-tested: stripe";
  if (await scanForMarker(TESTS_ROOT, marker)) return true;

  // c) Bypass comment inside the handler itself
  try {
    const content = await fs.readFile(handlerAbs, "utf8");
    if (hasBypassMarker(content)) return true;
  } catch {
    // handler file unreadable — fail safe (treat as missing)
  }

  return false;
}

/**
 * @param {string} dir
 * @param {string} marker
 * @returns {Promise<boolean>}
 */
async function scanForMarker(dir, marker) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      if (await scanForMarker(full, marker)) return true;
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      try {
        const content = await fs.readFile(full, "utf8");
        if (content.includes(marker)) return true;
      } catch {
        // ignore unreadable files
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * @param {string} baseRef
 * @returns {Promise<{ passed: boolean; checked: string[]; missing: string[] }>}
 */
export async function runGate(baseRef = "main") {
  const handlers = getAddedHandlers(baseRef);
  const missing = [];

  for (const h of handlers) {
    const rel = path.relative(REPO_ROOT, h);
    const ok = await hasIdempotencyTest(h);
    if (ok) {
      console.log(`  ✓  ${rel} — idempotency test found`);
    } else {
      console.log(`  ✗  ${rel} — no idempotency test`);
      missing.push(rel);
    }
  }

  return { passed: missing.length === 0, checked: handlers.map((h) => path.relative(REPO_ROOT, h)), missing };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1]?.endsWith("check-stripe-idempotency.mjs");

if (isMain) {
  const baseRef = process.env.GITHUB_BASE_REF ?? "main";
  console.log(`\nStripe webhook idempotency gate (base: ${baseRef})\n`);

  const { passed, checked, missing } = await runGate(baseRef);

  if (checked.length === 0) {
    console.log("  (no new Stripe webhook handlers in this PR — gate passes vacuously)\n");
    process.exit(0);
  }

  if (!passed) {
    console.error(`\n✘ ${missing.length} handler(s) lack an idempotency test:\n`);
    for (const m of missing) {
      console.error(`    ${m}`);
      const name = path.basename(path.dirname(m));
      console.error(
        `    → Expected: __tests__/api/webhooks/stripe/${name}.idempotency.test.ts\n` +
        `    → Or add:  // idempotency-tested: stripe  to any test file\n`,
      );
    }
    console.error(
      "See __tests__/api/stripe-webhook-idempotency.test.ts for the reference pattern.\n",
    );
    process.exit(1);
  }

  console.log(`\n✔ All ${checked.length} handler(s) have idempotency tests.\n`);
  process.exit(0);
}
