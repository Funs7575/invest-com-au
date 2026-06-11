/**
 * API-billing activation preflight — read-only.
 *
 * One command for the founder to verify the whole api-billing chain before
 * (and after) flipping it live. Checks schema, env vars, Stripe price
 * objects, and the kill switch. Mutates nothing.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/api-billing-preflight.ts
 *
 * Exit code 0 = ready to activate (or already active); 1 = gaps listed.
 */

import { createClient } from "@supabase/supabase-js";

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

async function checkEnv() {
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_API_BASIC_PRICE_ID",
    "STRIPE_API_PRO_PRICE_ID",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_SITE_URL",
  ];
  for (const key of required) {
    const value = process.env[key];
    record(`env:${key}`, Boolean(value), value ? "set" : "MISSING — set on the deploy host (and locally for this preflight)");
  }
}

async function checkSchema() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    record("db:connection", false, "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot verify schema");
    return;
  }
  const supabase = createClient(url, serviceKey);

  // Billing columns on api_keys (migration 20260610155736).
  const { error: colErr } = await supabase
    .from("api_keys")
    .select("id, stripe_subscription_id, stripe_customer_id, requests_this_month, billing_period_start")
    .limit(1);
  record(
    "db:api_keys billing columns",
    !colErr,
    colErr ? `query failed: ${colErr.message}` : "all four billing columns present",
  );

  for (const table of ["api_key_subscriptions", "api_consumer_webhooks", "consumer_webhook_deliveries"]) {
    const { error } = await supabase.from(table).select("id").limit(1);
    record(`db:${table}`, !error, error ? `missing or unreadable: ${error.message}` : "reachable");
  }

  // Kill switch state — informational, absent row = live.
  const { data: killRow } = await supabase
    .from("automation_kill_switches")
    .select("feature, disabled")
    .eq("feature", "api_billing")
    .maybeSingle();
  const paused = Boolean(killRow?.disabled);
  record("ops:kill switch (api_billing)", !paused, paused ? "DISABLED — checkout returns 503 until cleared" : "not engaged (billing live once envs set)");
}

async function checkStripePrices() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    record("stripe:prices", false, "skipped — STRIPE_SECRET_KEY not set");
    return;
  }
  for (const [envName, plan] of [
    ["STRIPE_API_BASIC_PRICE_ID", "basic"],
    ["STRIPE_API_PRO_PRICE_ID", "pro"],
  ] as const) {
    const priceId = process.env[envName];
    if (!priceId) {
      record(`stripe:${plan} price`, false, `skipped — ${envName} not set`);
      continue;
    }
    try {
      const res = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (!res.ok) {
        record(`stripe:${plan} price`, false, `Stripe returned ${res.status} for ${priceId}`);
        continue;
      }
      const price = (await res.json()) as {
        currency?: string;
        recurring?: { interval?: string } | null;
        active?: boolean;
      };
      const sane = price.active === true && price.currency === "aud" && price.recurring?.interval === "month";
      record(
        `stripe:${plan} price`,
        sane,
        sane
          ? `${priceId} active, AUD, monthly`
          : `${priceId} exists but unexpected shape (active=${price.active}, currency=${price.currency}, interval=${price.recurring?.interval})`,
      );
    } catch (err) {
      record(`stripe:${plan} price`, false, `lookup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function main() {
  await checkEnv();
  await checkSchema();
  await checkStripePrices();

  console.log("\nAPI-billing activation preflight\n────────────────────────────────");
  for (const check of checks) {
    console.log(`${check.ok ? "✅" : "❌"} ${check.name} — ${check.detail}`);
  }
  const failures = checks.filter((c) => !c.ok);
  console.log(
    failures.length === 0
      ? "\nAll checks green — the billing chain is ready. See docs/runbooks/api-billing-activation.md for the smoke test."
      : `\n${failures.length} gap(s) above. Runbook: docs/runbooks/api-billing-activation.md`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
}

void main();
