/**
 * Tests for scripts/check-financial-invariants.mjs.
 *
 * Exercises the pure invariant evaluators (no network). main() is the
 * creds-gated REST wrapper, covered by the CI job where the service-role key
 * is present.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-financial-invariants.mjs");

/* eslint-disable @typescript-eslint/no-explicit-any */
let negativeBalances: (rows: any[]) => number[];
let runningBalanceMismatches: (rows: any[]) => number[];
let orphanLedgerRows: (rows: any[], ids: number[] | Set<number>) => number[];
let malformedBookingAmounts: (rows: any[]) => number[];
let paidBookingsWithoutIntent: (rows: any[]) => number[];
let paidBillingWithoutRef: (rows: any[]) => number[];
let negativeBillingAmounts: (rows: any[]) => number[];
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeAll(async () => {
  const m = await import(gatePath);
  ({
    negativeBalances,
    runningBalanceMismatches,
    orphanLedgerRows,
    malformedBookingAmounts,
    paidBookingsWithoutIntent,
    paidBillingWithoutRef,
    negativeBillingAmounts,
  } = m);
});

describe("negativeBalances", () => {
  it("flags rows whose balance dropped below zero", () => {
    expect(
      negativeBalances([
        { id: 1, professional_id: 1, amount_cents: 100, balance_after_cents: 100 },
        { id: 2, professional_id: 1, amount_cents: -250, balance_after_cents: -150 },
      ]),
    ).toEqual([2]);
  });
});

describe("runningBalanceMismatches", () => {
  it("passes when each row's balance equals the cumulative sum (per advisor)", () => {
    const rows = [
      { id: 1, professional_id: 7, amount_cents: 500, balance_after_cents: 500 },
      { id: 2, professional_id: 7, amount_cents: -200, balance_after_cents: 300 },
      { id: 3, professional_id: 9, amount_cents: 1000, balance_after_cents: 1000 },
    ];
    expect(runningBalanceMismatches(rows)).toEqual([]);
  });

  it("flags a row where the stored balance drifted from the running sum (CAS race)", () => {
    const rows = [
      { id: 1, professional_id: 7, amount_cents: 500, balance_after_cents: 500 },
      // A lost update: second debit applied but balance not decremented.
      { id: 2, professional_id: 7, amount_cents: -200, balance_after_cents: 500 },
    ];
    expect(runningBalanceMismatches(rows)).toEqual([2]);
  });

  it("orders by id, not array order, before summing", () => {
    const rows = [
      { id: 2, professional_id: 1, amount_cents: -200, balance_after_cents: 300 },
      { id: 1, professional_id: 1, amount_cents: 500, balance_after_cents: 500 },
    ];
    expect(runningBalanceMismatches(rows)).toEqual([]);
  });
});

describe("orphanLedgerRows", () => {
  it("flags ledger rows pointing at a non-existent professional", () => {
    const rows = [
      { id: 1, professional_id: 7, amount_cents: 1, balance_after_cents: 1 },
      { id: 2, professional_id: 99, amount_cents: 1, balance_after_cents: 2 },
      { id: 3, professional_id: null, amount_cents: 1, balance_after_cents: 3 },
    ];
    expect(orphanLedgerRows(rows, new Set([7]))).toEqual([2, 3]);
  });
});

describe("malformedBookingAmounts", () => {
  it("flags negative amounts and fees exceeding the charge", () => {
    const rows = [
      { id: 1, amount_cents: 1000, platform_fee_cents: 200 },
      { id: 2, amount_cents: 1000, platform_fee_cents: 1200 },
      { id: 3, amount_cents: -5, platform_fee_cents: 0 },
    ];
    expect(malformedBookingAmounts(rows)).toEqual([2, 3]);
  });
});

describe("paidBookingsWithoutIntent", () => {
  it("flags settled payments missing a Stripe intent, ignores pending", () => {
    const rows = [
      { id: 1, status: "paid", stripe_payment_intent_id: "pi_1" },
      { id: 2, status: "captured", stripe_payment_intent_id: null },
      { id: 3, status: "pending", stripe_payment_intent_id: null },
    ];
    expect(paidBookingsWithoutIntent(rows)).toEqual([2]);
  });
});

describe("paidBillingWithoutRef", () => {
  it("flags paid billing rows missing paid_at or stripe ref", () => {
    const rows = [
      { id: 1, status: "paid", paid_at: "2026-01-01", stripe_payment_intent_id: "pi_1" },
      { id: 2, status: "paid", paid_at: null, stripe_payment_intent_id: "pi_2" },
      { id: 3, status: "paid", paid_at: "2026-01-01", stripe_payment_intent_id: null },
      { id: 4, status: "pending", paid_at: null, stripe_payment_intent_id: null },
    ];
    expect(paidBillingWithoutRef(rows)).toEqual([2, 3]);
  });
});

describe("negativeBillingAmounts", () => {
  it("flags negative billing amounts", () => {
    expect(negativeBillingAmounts([{ id: 1, amount_cents: -10 }, { id: 2, amount_cents: 0 }])).toEqual([1]);
  });
});
