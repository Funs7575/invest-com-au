import { describe, it, expect } from "vitest";
import {
  compareScenarioBlobs,
  formatFieldDelta,
} from "@/lib/scenario-compare";

describe("compareScenarioBlobs", () => {
  it("computes neutral size + absolute + pct delta of B vs A (2-way)", () => {
    const rows = compareScenarioBlobs([
      { balance: 1000, rate: 5 },
      { balance: 1200, rate: 5 },
    ]);

    const balance = rows.find((r) => r.key === "balance")!;
    expect(balance.values).toEqual([1000, 1200]);
    expect(balance.absoluteDelta).toBe(200);
    expect(balance.pctDelta).toBeCloseTo(20, 5);
    expect(balance.size).toBe("larger"); // B > A
    expect(balance.numeric).toBe(true);

    const rate = rows.find((r) => r.key === "rate")!;
    expect(rate.absoluteDelta).toBe(0);
    expect(rate.size).toBe("equal");
  });

  it("reports 'smaller' when the last scenario is below the first", () => {
    const rows = compareScenarioBlobs([{ x: 100 }, { x: 60 }]);
    const x = rows.find((r) => r.key === "x")!;
    expect(x.absoluteDelta).toBe(-40);
    expect(x.size).toBe("smaller");
    expect(x.pctDelta).toBeCloseTo(-40, 5);
  });

  it("guards divide-by-zero: pctDelta is null when the baseline is 0", () => {
    const rows = compareScenarioBlobs([{ x: 0 }, { x: 50 }]);
    const x = rows.find((r) => r.key === "x")!;
    expect(x.absoluteDelta).toBe(50);
    expect(x.pctDelta).toBeNull();
    expect(x.size).toBe("larger");
  });

  it("computes the last-vs-first delta for a 3-way compare", () => {
    const rows = compareScenarioBlobs([{ x: 100 }, { x: 150 }, { x: 250 }]);
    const x = rows.find((r) => r.key === "x")!;
    expect(x.displays).toHaveLength(3);
    expect(x.values).toEqual([100, 150, 250]);
    expect(x.absoluteDelta).toBe(150); // 250 − 100
    expect(x.size).toBe("larger");
  });

  it("unions keys across blobs in first-seen order and skips nested objects", () => {
    const rows = compareScenarioBlobs([
      { a: 1, nested: { z: 9 } },
      { b: 2, a: 3 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("marks mixed/non-numeric fields as non-numeric", () => {
    const rows = compareScenarioBlobs([
      { label: "yes" },
      { label: "no" },
    ]);
    const label = rows.find((r) => r.key === "label")!;
    expect(label.numeric).toBe(false);
    expect(label.absoluteDelta).toBeNull();
  });

  it("treats numeric strings as numbers", () => {
    const rows = compareScenarioBlobs([{ x: "100" }, { x: "120" }]);
    const x = rows.find((r) => r.key === "x")!;
    expect(x.numeric).toBe(true);
    expect(x.absoluteDelta).toBe(20);
  });
});

describe("formatFieldDelta", () => {
  it("renders an em dash for an equal/absent delta", () => {
    const [row] = compareScenarioBlobs([{ rate: 5 }, { rate: 5 }]);
    expect(formatFieldDelta(row!)).toBe("—");
  });

  it("renders a signed currency delta with percentage", () => {
    const rows = compareScenarioBlobs([
      { balance: 1000 },
      { balance: 1200 },
    ]);
    const out = formatFieldDelta(rows[0]!);
    expect(out.startsWith("+")).toBe(true);
    expect(out).toContain("$200");
    expect(out).toContain("20.0%");
  });

  it("uses a minus sign for a decrease", () => {
    const rows = compareScenarioBlobs([{ amount: 500 }, { amount: 400 }]);
    const out = formatFieldDelta(rows[0]!);
    expect(out.startsWith("−")).toBe(true); // U+2212 minus
    expect(out).toContain("$100");
  });
});
