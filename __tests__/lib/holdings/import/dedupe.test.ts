import { describe, it, expect } from "vitest";
import {
  planImport,
  holdingKey,
  type ExistingHoldingForDedupe,
} from "@/lib/holdings/import/dedupe";
import type { ImportRowDraft } from "@/lib/holdings/import/types";

function draft(over: Partial<ImportRowDraft> & { sourceRow: number }): ImportRowDraft {
  return {
    raw: "",
    ticker: "BHP",
    exchange: "ASX",
    shares: 100,
    costBasisPerShareCents: 4500,
    acquiredAt: "2026-03-01",
    brokerSlug: null,
    notes: null,
    issues: [],
    ...over,
  };
}

function existing(over: Partial<ExistingHoldingForDedupe> & { id: number }): ExistingHoldingForDedupe {
  return {
    ticker: "BHP",
    exchange: "ASX",
    shares: 50,
    costBasisPerShareCents: 4000,
    acquiredAt: "2025-01-01",
    ...over,
  };
}

describe("holdingKey", () => {
  it("normalises codes so BHP.AX and ASX:BHP and BHP collapse", () => {
    expect(holdingKey("BHP.AX", "OTHER")).toBe("ASX:BHP");
    expect(holdingKey("ASX:BHP", "OTHER")).toBe("ASX:BHP");
    expect(holdingKey("BHP", "ASX")).toBe("ASX:BHP");
  });
});

describe("planImport", () => {
  it("classifies a brand-new instrument as 'new'", () => {
    const plan = planImport([draft({ sourceRow: 2 })], []);
    expect(plan.planned).toHaveLength(1);
    expect(plan.planned[0]?.status).toBe("new");
    expect(plan.planned[0]?.matches).toEqual([]);
  });

  it("classifies an already-tracked instrument as 'tracked' with the match attached", () => {
    const plan = planImport([draft({ sourceRow: 2 })], [existing({ id: 7 })]);
    expect(plan.planned[0]?.status).toBe("tracked");
    expect(plan.planned[0]?.matches.map((m) => m.id)).toEqual([7]);
  });

  it("matches across code formats (existing BHP.AX vs CSV ASX:BHP)", () => {
    const plan = planImport(
      [draft({ sourceRow: 2, ticker: "BHP", exchange: "ASX" })],
      [existing({ id: 9, ticker: "BHP.AX", exchange: "OTHER" })],
    );
    expect(plan.planned[0]?.status).toBe("tracked");
  });

  it("flags an identical repeated row as 'duplicate-in-file' pointing at the first", () => {
    const rows = [
      draft({ sourceRow: 2 }),
      draft({ sourceRow: 5 }), // identical instrument+units+price+date
    ];
    const plan = planImport(rows, []);
    expect(plan.planned[0]?.status).toBe("new");
    expect(plan.planned[1]?.status).toBe("duplicate-in-file");
    expect(plan.planned[1]?.duplicateOfSourceRow).toBe(2);
  });

  it("does NOT treat different lots of the same code as in-file duplicates", () => {
    const rows = [
      draft({ sourceRow: 2, shares: 100, acquiredAt: "2026-03-01" }),
      draft({ sourceRow: 3, shares: 200, acquiredAt: "2026-04-01" }),
    ];
    const plan = planImport(rows, []);
    expect(plan.planned.map((p) => p.status)).toEqual(["new", "new"]);
  });

  it("buckets invalid drafts out of the plan", () => {
    const plan = planImport(
      [draft({ sourceRow: 2 }), draft({ sourceRow: 3, ticker: null, issues: ["missing code"] })],
      [],
    );
    expect(plan.planned).toHaveLength(1);
    expect(plan.invalid).toHaveLength(1);
    expect(plan.invalid[0]?.sourceRow).toBe(3);
  });

  it("surfaces multiple existing lots for the same code", () => {
    const plan = planImport(
      [draft({ sourceRow: 2 })],
      [existing({ id: 1 }), existing({ id: 2, acquiredAt: "2025-06-01" })],
    );
    expect(plan.planned[0]?.matches).toHaveLength(2);
  });
});
