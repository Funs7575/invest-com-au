import { describe, it, expect } from "vitest";
import {
  normalizeSharesightHoldings,
  planSharesightDedup,
  type ExistingHoldingKey,
} from "@/lib/sharesight/import";
import type { SharesightHolding } from "@/lib/sharesight/client";

const SAMPLE: SharesightHolding[] = [
  {
    id: 101,
    instrument_code: "BHP",
    market_code: "ASX",
    quantity: 100,
    cost_basis: 45.25,
    first_purchase_date: "2025-03-01",
  },
  {
    id: 102,
    instrument_code: "VTS",
    market_code: "NASDAQ", // non-AUD → must skip
    quantity: 10,
    cost_basis: 200,
    first_purchase_date: "2025-04-01",
  },
  {
    id: 103,
    instrument_code: "  iaa  ", // trimmed + uppercased
    market_code: "asx",
    quantity: 25,
    cost_basis: 110,
    first_purchase_date: "2025-05-15",
  },
];

describe("normalizeSharesightHoldings", () => {
  it("maps ASX rows to investor_holdings shape (AUD only, cents)", () => {
    const { rows, errors } = normalizeSharesightHoldings([SAMPLE[0]!]);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.ticker).toBe("BHP");
    expect(row.exchange).toBe("ASX");
    expect(row.shares).toBe(100);
    expect(row.cost_basis_per_share_cents).toBe(4525);
    expect(row.acquired_at).toBe("2025-03-01");
    expect(row.broker_slug).toBe("sharesight");
  });

  it("surfaces non-AUD markets as skipped errors (FX disabled until per-currency lands)", () => {
    const { rows, errors } = normalizeSharesightHoldings([SAMPLE[1]!]);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.holdingId).toBe("102");
    expect(errors[0]!.reason).toMatch(/non-AUD/i);
  });

  it("normalizes ticker + market_code case (lowercase market still maps to ASX)", () => {
    const { rows, errors } = normalizeSharesightHoldings([SAMPLE[2]!]);
    expect(errors).toEqual([]);
    expect(rows[0]!.ticker).toBe("IAA");
    expect(rows[0]!.exchange).toBe("ASX");
  });

  it("falls back to today's date when first_purchase_date is missing", () => {
    const { rows } = normalizeSharesightHoldings(
      [{ id: 7, instrument_code: "CBA", market_code: "ASX", quantity: 5, cost_basis: 100 }],
      Date.UTC(2026, 4, 19),
    );
    expect(rows[0]!.acquired_at).toBe("2026-05-19");
  });

  it("rejects invalid quantities / cost basis", () => {
    const { rows, errors } = normalizeSharesightHoldings([
      { id: 200, instrument_code: "X", market_code: "ASX", quantity: 0, cost_basis: 1 },
      { id: 201, instrument_code: "Y", market_code: "ASX", quantity: 10, cost_basis: -1 },
    ]);
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(2);
  });
});

describe("planSharesightDedup", () => {
  const fresh = normalizeSharesightHoldings([SAMPLE[0]!, SAMPLE[2]!]).rows;

  it("inserts when no matching row exists", () => {
    const existing: ExistingHoldingKey[] = [];
    const plan = planSharesightDedup(fresh, existing);
    expect(plan.toInsert).toHaveLength(2);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.skippedNonSharesight).toHaveLength(0);
  });

  it("updates an existing sharesight-tagged row in place (no duplicates)", () => {
    const existing: ExistingHoldingKey[] = [
      { id: 42, ticker: "BHP", exchange: "ASX", broker_slug: "sharesight" },
    ];
    const plan = planSharesightDedup(fresh, existing);
    expect(plan.toInsert.map((r) => r.ticker)).toEqual(["IAA"]);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0]!.id).toBe(42);
    expect(plan.toUpdate[0]!.patch.ticker).toBe("BHP");
    expect(plan.skippedNonSharesight).toHaveLength(0);
  });

  it("never overwrites a manually-managed row (broker_slug != sharesight)", () => {
    const existing: ExistingHoldingKey[] = [
      { id: 99, ticker: "BHP", exchange: "ASX", broker_slug: "commsec" },
    ];
    const plan = planSharesightDedup(fresh, existing);
    expect(plan.toInsert.map((r) => r.ticker)).toEqual(["IAA"]);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.skippedNonSharesight).toHaveLength(1);
    expect(plan.skippedNonSharesight[0]!.ticker).toBe("BHP");
  });

  it("treats null broker_slug (manually-entered) as a do-not-touch row", () => {
    const existing: ExistingHoldingKey[] = [
      { id: 5, ticker: "IAA", exchange: "ASX", broker_slug: null },
    ];
    const plan = planSharesightDedup(fresh, existing);
    expect(plan.toInsert.map((r) => r.ticker)).toEqual(["BHP"]);
    expect(plan.skippedNonSharesight.map((r) => r.ticker)).toEqual(["IAA"]);
  });
});
