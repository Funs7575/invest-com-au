import { describe, it, expect } from "vitest";
import { isoDate, currentYearMonth } from "@/lib/firm-performance";

describe("isoDate", () => {
  it("returns today as YYYY-MM-DD when daysAgo=0", () => {
    const d = new Date("2026-05-26T15:00:00Z");
    expect(isoDate(0, d)).toBe("2026-05-26");
  });

  it("subtracts days correctly", () => {
    const d = new Date("2026-05-26T15:00:00Z");
    expect(isoDate(30, d)).toBe("2026-04-26");
  });

  it("handles month boundaries", () => {
    const d = new Date("2026-03-01T00:00:00Z");
    expect(isoDate(1, d)).toBe("2026-02-28");
  });

  it("handles year boundaries", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(isoDate(1, d)).toBe("2025-12-31");
  });
});

describe("currentYearMonth", () => {
  it("formats year-month correctly", () => {
    expect(currentYearMonth(new Date("2026-05-15T00:00:00Z"))).toBe("2026-05");
    expect(currentYearMonth(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
    expect(currentYearMonth(new Date("2026-01-31T00:00:00Z"))).toBe("2026-01");
  });

  it("zero-pads single-digit months", () => {
    expect(currentYearMonth(new Date("2026-09-01T00:00:00Z"))).toBe("2026-09");
  });
});
