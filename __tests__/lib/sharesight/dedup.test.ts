import { describe, expect, it } from "vitest";
import { dedupAgainstExisting } from "@/lib/sharesight/dedup";
import type { ParsedHoldingRow } from "@/lib/holdings/csv-import";

function row(over: Partial<ParsedHoldingRow>): ParsedHoldingRow {
  return {
    ticker: "BHP",
    exchange: "ASX",
    shares: 10,
    cost_basis_per_share_cents: 1000,
    acquired_at: "2024-01-01",
    broker_slug: "sharesight",
    notes: null,
    ...over,
  };
}

describe("dedupAgainstExisting", () => {
  it("inserts everything when nothing exists", () => {
    const parsed = [row({}), row({ ticker: "VAS" })];
    const { toInsert, skipped } = dedupAgainstExisting(parsed, []);
    expect(toInsert).toHaveLength(2);
    expect(skipped).toHaveLength(0);
  });

  it("skips rows that match existing (ticker, exchange, acquired_at)", () => {
    const parsed = [row({})];
    const existing = [{ ticker: "BHP", exchange: "ASX", acquired_at: "2024-01-01" }];
    const { toInsert, skipped } = dedupAgainstExisting(parsed, existing);
    expect(toInsert).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it("treats different exchanges as separate keys", () => {
    const parsed = [row({ exchange: "NASDAQ" })];
    const existing = [{ ticker: "BHP", exchange: "ASX", acquired_at: "2024-01-01" }];
    const { toInsert, skipped } = dedupAgainstExisting(parsed, existing);
    expect(toInsert).toHaveLength(1);
    expect(skipped).toHaveLength(0);
  });

  it("treats different acquired_at as separate keys", () => {
    const parsed = [row({ acquired_at: "2024-02-01" })];
    const existing = [{ ticker: "BHP", exchange: "ASX", acquired_at: "2024-01-01" }];
    const { toInsert } = dedupAgainstExisting(parsed, existing);
    expect(toInsert).toHaveLength(1);
  });

  it("is case-insensitive on the ticker", () => {
    const parsed = [row({ ticker: "bhp" })];
    const existing = [{ ticker: "BHP", exchange: "ASX", acquired_at: "2024-01-01" }];
    const { toInsert, skipped } = dedupAgainstExisting(parsed, existing);
    expect(toInsert).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it("dedups within the parsed batch (second appearance is a skip)", () => {
    const parsed = [row({}), row({})];
    const { toInsert, skipped } = dedupAgainstExisting(parsed, []);
    expect(toInsert).toHaveLength(1);
    expect(skipped).toHaveLength(1);
  });
});
