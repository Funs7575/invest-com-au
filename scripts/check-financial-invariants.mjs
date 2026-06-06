#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Financial-invariant sentinel — money-path reconciliation (read-only).
 *
 * Asserts a set of hard invariants over the live financial tables that should
 * NEVER be violated regardless of code path or race. These guard exactly the
 * bugs that have hit this codebase: credit over-spend (negative balances),
 * compare-and-set ledger races (running balance drifting from the cumulative
 * sum), and orphaned / malformed payment rows.
 *
 * Invariants:
 *   1. advisor_credit_ledger.balance_after_cents >= 0            (no over-spend)
 *   2. per-advisor running Σ(amount_cents) == balance_after_cents (CAS integrity)
 *   3. every ledger row's professional_id exists in professionals (no orphans)
 *   4. booking_payments: platform_fee_cents <= amount_cents, amount_cents >= 0
 *   5. booking_payments paid/captured ⇒ stripe_payment_intent_id present
 *   6. advisor_billing status=paid ⇒ paid_at AND stripe_payment_intent_id set
 *   7. advisor_billing.amount_cents >= 0
 *
 * Read-only: it only SELECTs (no writes, no Stripe calls, $0). Reads are
 * service-role because these tables are deny-all / service-role-only RLS.
 * Creds-gated: skips cleanly without SUPABASE_SERVICE_ROLE_KEY + URL.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=… NEXT_PUBLIC_SUPABASE_URL=… npm run audit:financial-invariants
 *
 * Exit: 0 all invariants hold / skipped · 1 a violation · 2 setup error.
 */

// ---------------------------------------------------------------------------
// Pure invariant evaluators — exported for unit tests (no I/O)
// ---------------------------------------------------------------------------

/** @typedef {{ id:number, professional_id:number|null, amount_cents:number, balance_after_cents:number }} LedgerRow */

/** 1. Balances must never go negative. @param {LedgerRow[]} rows */
export function negativeBalances(rows) {
  return rows.filter((r) => Number(r.balance_after_cents) < 0).map((r) => r.id);
}

/**
 * 2. For each advisor, the stored balance_after_cents on every row must equal
 * the cumulative sum of amount_cents up to and including that row (ordered by
 * id). A mismatch means a lost/duplicated update — the CAS race class.
 * @param {LedgerRow[]} rows
 */
export function runningBalanceMismatches(rows) {
  /** @type {Map<number, LedgerRow[]>} */
  const byAdvisor = new Map();
  for (const r of rows) {
    const k = Number(r.professional_id);
    (byAdvisor.get(k) ?? byAdvisor.set(k, []).get(k)).push(r);
  }
  /** @type {number[]} */
  const bad = [];
  for (const list of byAdvisor.values()) {
    list.sort((a, b) => a.id - b.id);
    let running = 0;
    for (const r of list) {
      running += Number(r.amount_cents);
      if (running !== Number(r.balance_after_cents)) bad.push(r.id);
    }
  }
  return bad;
}

/** 3. Ledger rows whose professional_id isn't a known professional. */
export function orphanLedgerRows(ledgerRows, professionalIds) {
  const known = professionalIds instanceof Set ? professionalIds : new Set(professionalIds);
  return ledgerRows.filter((r) => r.professional_id == null || !known.has(Number(r.professional_id))).map((r) => r.id);
}

/** 4. Booking payments where the platform fee exceeds the charge or amount < 0. */
export function malformedBookingAmounts(rows) {
  return rows
    .filter((r) => Number(r.amount_cents) < 0 || Number(r.platform_fee_cents ?? 0) > Number(r.amount_cents ?? 0))
    .map((r) => r.id);
}

const PAID_STATES = new Set(["paid", "captured", "succeeded"]);

/** 5. A settled booking payment must carry a Stripe payment-intent id. */
export function paidBookingsWithoutIntent(rows) {
  return rows.filter((r) => PAID_STATES.has(String(r.status)) && !r.stripe_payment_intent_id).map((r) => r.id);
}

/** 6. advisor_billing marked paid must have paid_at AND a Stripe reference. */
export function paidBillingWithoutRef(rows) {
  return rows.filter((r) => String(r.status) === "paid" && (!r.paid_at || !r.stripe_payment_intent_id)).map((r) => r.id);
}

/** 7. advisor_billing amounts must be non-negative. */
export function negativeBillingAmounts(rows) {
  return rows.filter((r) => Number(r.amount_cents) < 0).map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Live data fetch (PostgREST, service-role) + runner
// ---------------------------------------------------------------------------

/** Fetch all rows of a table (paginated) selecting only the given columns. */
async function fetchAll(base, key, table, select) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(`${base}/rest/v1/${table}?select=${select}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + pageSize - 1}`,
        "Range-Unit": "items",
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${res.statusText}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

async function main() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    console.log("[financial-invariants] no SUPABASE_SERVICE_ROLE_KEY — skipping (service-role needed for deny-all financial tables).");
    process.exit(0);
  }

  let ledger, billing, bookingPays, professionals;
  try {
    [ledger, billing, bookingPays, professionals] = await Promise.all([
      fetchAll(base, key, "advisor_credit_ledger", "id,professional_id,amount_cents,balance_after_cents"),
      fetchAll(base, key, "advisor_billing", "id,status,amount_cents,paid_at,stripe_payment_intent_id"),
      fetchAll(base, key, "booking_payments", "id,status,amount_cents,platform_fee_cents,stripe_payment_intent_id"),
      fetchAll(base, key, "professionals", "id"),
    ]);
  } catch (e) {
    console.error("[financial-invariants] fetch failed:", e instanceof Error ? e.message : e);
    process.exit(2);
  }

  const profIds = new Set(professionals.map((p) => Number(p.id)));
  const checks = [
    { name: "ledger balance never negative", ids: negativeBalances(ledger) },
    { name: "ledger running balance == Σ amount_cents (CAS integrity)", ids: runningBalanceMismatches(ledger) },
    { name: "ledger rows reference a real professional", ids: orphanLedgerRows(ledger, profIds) },
    { name: "booking_payments fee <= amount and amount >= 0", ids: malformedBookingAmounts(bookingPays) },
    { name: "settled booking_payments have a Stripe intent", ids: paidBookingsWithoutIntent(bookingPays) },
    { name: "paid advisor_billing has paid_at + Stripe ref", ids: paidBillingWithoutRef(billing) },
    { name: "advisor_billing amount never negative", ids: negativeBillingAmounts(billing) },
  ];

  const failed = checks.filter((c) => c.ids.length > 0);
  for (const c of checks) {
    console.log(`  ${c.ids.length === 0 ? "✅" : "🔴"} ${c.name}${c.ids.length ? ` — ${c.ids.length} violation(s): ids ${c.ids.slice(0, 20).join(", ")}` : ""}`);
  }
  console.log(`[financial-invariants] ${failed.length === 0 ? "ALL HOLD" : failed.length + " INVARIANT(S) VIOLATED"} (ledger ${ledger.length}, billing ${billing.length}, booking_payments ${bookingPays.length}).`);
  process.exit(failed.length > 0 ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { console.error("[financial-invariants] fatal:", err); process.exit(2); });
}
