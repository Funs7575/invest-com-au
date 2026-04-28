#!/usr/bin/env node
/**
 * Stripe webhook idempotency load test.
 *
 * Fires N concurrent test-mode webhook events at the local dev server (or a
 * preview URL via --base) and asserts that the `stripe_webhook_events` table
 * converges to exactly one processed entry per event_id, even under
 * contention.
 *
 * This is the runtime cousin of V-NEW-03 (the static idempotency replay
 * harness in CI). The static harness checks the code is correct in
 * isolation; this checks it stays correct under realistic concurrent load.
 *
 * Usage:
 *   # Against local dev (default)
 *   npm run dev   # in another shell
 *   node scripts/stripe-load-test.mjs
 *
 *   # Against a preview URL
 *   node scripts/stripe-load-test.mjs --base https://invest-com-au-git-foo.vercel.app
 *
 *   # Tune concurrency
 *   node scripts/stripe-load-test.mjs --concurrent 50 --total 200
 *
 * Required env (read from .env.local):
 *   STRIPE_WEBHOOK_SECRET    — to construct valid signatures
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const args = parseArgs(process.argv.slice(2));
const BASE = args.base ?? "http://localhost:3000";
const CONCURRENT = parseInt(args.concurrent ?? "20", 10);
const TOTAL = parseInt(args.total ?? "100", 10);
const REPLAY_FACTOR = parseInt(args.replay ?? "3", 10);

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_WEBHOOK_SECRET) {
  console.error("STRIPE_WEBHOOK_SECRET not set. Source .env.local first.");
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

console.log(`Stripe webhook idempotency load test`);
console.log(`  Base URL:    ${BASE}`);
console.log(`  Total events: ${TOTAL} unique × ${REPLAY_FACTOR} replays = ${TOTAL * REPLAY_FACTOR} requests`);
console.log(`  Concurrency:  ${CONCURRENT}`);
console.log("");

const eventIds = Array.from({ length: TOTAL }, () => `evt_test_${crypto.randomBytes(12).toString("hex")}`);

const queue = [];
for (const id of eventIds) {
  for (let i = 0; i < REPLAY_FACTOR; i++) queue.push(id);
}
shuffle(queue);

const t0 = Date.now();
const results = {
  ok: 0,
  duplicate: 0,
  error: 0,
  errors: [],
};

await runWithConcurrency(queue, CONCURRENT, async (eventId) => {
  const event = makeStripeEvent(eventId);
  const body = JSON.stringify(event);
  const signature = signStripePayload(body, STRIPE_WEBHOOK_SECRET);

  try {
    const r = await fetch(`${BASE}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      body,
    });
    if (r.status === 200) results.ok++;
    else if (r.status === 409) results.duplicate++;
    else {
      results.error++;
      if (results.errors.length < 5) {
        results.errors.push(`${r.status}: ${(await r.text()).slice(0, 200)}`);
      }
    }
  } catch (err) {
    results.error++;
    if (results.errors.length < 5) {
      results.errors.push(err instanceof Error ? err.message : String(err));
    }
  }
});

const elapsed = Date.now() - t0;
console.log("\nRequests:");
console.log(`  ok:        ${results.ok}`);
console.log(`  duplicate: ${results.duplicate}`);
console.log(`  error:     ${results.error}`);
if (results.errors.length) {
  console.log("\nFirst errors:");
  for (const e of results.errors) console.log(`  ${e}`);
}
console.log(`  total time: ${elapsed}ms (${Math.round((TOTAL * REPLAY_FACTOR * 1000) / elapsed)} req/s)`);

console.log("\nVerifying convergence in stripe_webhook_events…");
const { data: rows, error: qErr } = await supabase
  .from("stripe_webhook_events")
  .select("event_id, status")
  .in("event_id", eventIds);

if (qErr) {
  console.error(`Supabase query failed: ${qErr.message}`);
  process.exit(1);
}

const seen = new Map();
for (const row of rows ?? []) {
  seen.set(row.event_id, (seen.get(row.event_id) ?? 0) + 1);
}

let missing = 0;
let duplicateRows = 0;
for (const id of eventIds) {
  const count = seen.get(id) ?? 0;
  if (count === 0) missing++;
  else if (count > 1) duplicateRows++;
}

console.log(`  unique events submitted:  ${eventIds.length}`);
console.log(`  rows in stripe_webhook_events: ${rows?.length ?? 0}`);
console.log(`  events with 0 rows (missing):    ${missing}`);
console.log(`  events with >1 row (duplicates): ${duplicateRows}`);

const isClean = missing === 0 && duplicateRows === 0 && results.error === 0;
console.log(`\n${isClean ? "✓ PASS" : "✗ FAIL"} idempotency under load`);

if (!isClean) {
  console.error("Idempotency invariant violated. Investigate before shipping.");
  process.exit(1);
}

console.log("\nCleanup: deleting test events from stripe_webhook_events…");
await supabase.from("stripe_webhook_events").delete().in("event_id", eventIds);
console.log("Done.");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      out[key] = next && !next.startsWith("--") ? next : "true";
      if (next && !next.startsWith("--")) i++;
    }
  }
  return out;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

async function runWithConcurrency(items, concurrency, fn) {
  const inFlight = new Set();
  for (const item of items) {
    const p = fn(item).finally(() => inFlight.delete(p));
    inFlight.add(p);
    if (inFlight.size >= concurrency) await Promise.race(inFlight);
  }
  await Promise.all(inFlight);
}

function makeStripeEvent(id) {
  return {
    id,
    object: "event",
    api_version: "2024-10-28",
    created: Math.floor(Date.now() / 1000),
    type: "invoice.paid",
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: {
        id: `in_test_${crypto.randomBytes(8).toString("hex")}`,
        object: "invoice",
        status: "paid",
        amount_paid: 1000,
        customer: `cus_test_${crypto.randomBytes(8).toString("hex")}`,
      },
    },
  };
}

function signStripePayload(body, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}
