#!/usr/bin/env node
/**
 * FIN_NOTEBOOK item 2 — AFSL grant write-path dry-run.
 *
 * When ASIC grants the licence ~Nov 2026, Agent #13 will write the row
 *   agent_memory WHERE agent_name='licensing' AND key='afsl_granted_at'
 *     value = { granted_at, afsl_number, granted_by_asic_letter_id }
 *
 * Every consumer of `getAfslStatus()` (lib/server/afsl-status.ts) flips
 * from "pending" to "granted" on the next request. Components that
 * gate copy on the grant include:
 *
 *   - components/AfslBadge.tsx
 *   - app/pricing + app/pro/research (AfslBadge mounts)
 *   - lib/compliance.ts AFSL_STATUS_DISCLOSURE (string source)
 *   - footer (TBD location)
 *
 * This script is a STATIC audit, not a live Supabase flip. It:
 *   1. Asserts the gate reader still exists at the expected path.
 *   2. Greps for every consumer of getAfslStatus to confirm the call
 *      sites are still wired (no orphan flips after the grant).
 *   3. Reports which env-vars / migrations the grant pre-supposes.
 *
 * Run before any pre-grant pull request that touches compliance copy
 * to catch silent decoupling of the gate from the surfaces it should
 * still influence.
 *
 * Usage: node scripts/afsl-grant-dry-run.mjs
 * Exit:  0 — gate wiring intact;  1 — drift detected.
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const PROBLEMS = [];

function note(msg) {
  console.log(`  ${msg}`);
}

function fail(msg) {
  PROBLEMS.push(msg);
  console.log(`  ❌ ${msg}`);
}

function pass(msg) {
  console.log(`  ✅ ${msg}`);
}

// ── 1. Gate reader exists ──────────────────────────────────────────────
console.log("[1] Verifying lib/server/afsl-status.ts exists and exports getAfslStatus");
const gatePath = "lib/server/afsl-status.ts";
if (!existsSync(gatePath)) {
  fail(`Missing ${gatePath} — Agent #13's grant write target has no reader.`);
} else {
  const src = readFileSync(gatePath, "utf-8");
  if (!src.includes("export async function getAfslStatus")) {
    fail(`${gatePath} exists but doesn't export getAfslStatus.`);
  } else {
    pass(`getAfslStatus is exported.`);
  }
  if (!src.includes('eq("key", "afsl_granted_at")')) {
    fail(`${gatePath} no longer queries agent_memory.key='afsl_granted_at'.`);
  } else {
    pass(`Reader queries the canonical agent_memory key.`);
  }
}

// ── 2. Consumers ───────────────────────────────────────────────────────
console.log("\n[2] Listing every consumer of getAfslStatus");
let consumers = [];
try {
  const out = execSync(
    `grep -rln "from \\"@/lib/server/afsl-status\\"" --include="*.ts" --include="*.tsx" lib/ app/ components/`,
    { encoding: "utf-8" },
  );
  consumers = out.trim().split("\n").filter(Boolean);
} catch {
  consumers = [];
}

if (consumers.length === 0) {
  fail("Zero consumers found — the gate flip would be invisible.");
} else {
  for (const f of consumers) {
    note(`reader → ${f}`);
  }
  pass(`${consumers.length} consumer file(s) wired in.`);
}

// ── 3. Required env vars / runbook ────────────────────────────────────
console.log("\n[3] Env-var prerequisites for the grant flip");

// Per memory project_admin_mfa_env.md — three env vars must be set;
// rollout doc only mentions one. Flag any that aren't documented
// somewhere on disk.
const REQUIRED_FOR_GRANT_FLOW = [
  "ADMIN_EMAILS",
  // The Agent #13 grant write is gated by the ceo_approvals workflow,
  // which routes via SLACK_WEBHOOK_* or email — so at least one of
  // those channels must be live before the grant flow runs.
];

for (const v of REQUIRED_FOR_GRANT_FLOW) {
  try {
    const out = execSync(
      `grep -rln "${v}" --include="*.ts" --include="*.tsx" --include="*.md" .`,
      { encoding: "utf-8" },
    );
    const refs = out.trim().split("\n").filter(Boolean).length;
    if (refs === 0) {
      fail(`${v} has zero references — runbook is out of date.`);
    } else {
      pass(`${v} referenced in ${refs} file(s).`);
    }
  } catch {
    fail(`${v} grep failed.`);
  }
}

// ── 4. Migration trail ────────────────────────────────────────────────
console.log("\n[4] agent_memory migration exists");
try {
  const out = execSync(
    `grep -ln "agent_memory" supabase/migrations/*.sql migrations/*.sql 2>/dev/null || true`,
    { encoding: "utf-8" },
  );
  const found = out.trim().split("\n").filter(Boolean);
  if (found.length === 0) {
    fail("No agent_memory migration found — table may not exist in prod.");
  } else {
    pass(`agent_memory introduced in ${found.length} migration(s).`);
  }
} catch (e) {
  fail(`migration grep failed: ${e.message}`);
}

// ── Summary ────────────────────────────────────────────────────────────
console.log("");
if (PROBLEMS.length === 0) {
  console.log("✅ AFSL grant dry-run: wiring intact.");
  process.exit(0);
} else {
  console.log(`❌ AFSL grant dry-run: ${PROBLEMS.length} issue(s) — see above.`);
  process.exit(1);
}
