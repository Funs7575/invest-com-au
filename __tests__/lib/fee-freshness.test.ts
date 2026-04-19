import { describe, it, expect } from "vitest";
import { computeFeeFreshness, FEE_STALE_DAYS } from "@/lib/fee-freshness";

describe("computeFeeFreshness", () => {
  const NOW = new Date("2026-04-19T12:00:00Z");

  it("returns 'unknown' for null / undefined / empty input", () => {
    expect(computeFeeFreshness(null, NOW).tier).toBe("unknown");
    expect(computeFeeFreshness(undefined, NOW).tier).toBe("unknown");
    expect(computeFeeFreshness("", NOW).tier).toBe("unknown");
  });

  it("returns 'unknown' for unparseable dates", () => {
    expect(computeFeeFreshness("not-a-date", NOW).tier).toBe("unknown");
  });

  it("returns 'fresh' within the 30-day window", () => {
    const r = computeFeeFreshness("2026-04-01T12:00:00Z", NOW);
    expect(r.tier).toBe("fresh");
    expect(r.ageDays).toBe(18);
  });

  it("returns 'fresh' exactly at 30 days", () => {
    const r = computeFeeFreshness("2026-03-20T12:00:00Z", NOW);
    expect(r.tier).toBe("fresh");
    expect(r.ageDays).toBe(30);
  });

  it("returns 'current' between 30 and 90 days", () => {
    const r = computeFeeFreshness("2026-03-01T12:00:00Z", NOW);
    expect(r.tier).toBe("current");
    expect(r.ageDays).toBe(49);
  });

  it("returns 'stale' past 90 days", () => {
    const r = computeFeeFreshness("2026-01-01T12:00:00Z", NOW);
    expect(r.tier).toBe("stale");
    expect(r.ageDays).toBe(108);
  });

  it("uses 'Fees verified today' for the same-day case", () => {
    expect(computeFeeFreshness(NOW.toISOString(), NOW).label).toBe(
      "Fees verified today",
    );
  });

  it("uses 'yesterday' for 1 day ago", () => {
    expect(
      computeFeeFreshness("2026-04-18T12:00:00Z", NOW).label,
    ).toBe("Fees verified yesterday");
  });

  it("uses 'N days ago' label under 30 days", () => {
    expect(
      computeFeeFreshness("2026-04-10T12:00:00Z", NOW).label,
    ).toBe("Fees verified 9 days ago");
  });

  it("switches to months after 30 days", () => {
    expect(
      computeFeeFreshness("2026-02-19T12:00:00Z", NOW).label,
    ).toMatch(/^Fees verified \d+ months? ago$/);
  });

  it("never returns a negative ageDays (future dates)", () => {
    const r = computeFeeFreshness("2027-01-01T12:00:00Z", NOW);
    expect(r.ageDays).toBe(0);
    expect(r.tier).toBe("fresh");
  });

  it("exposes a constant matching the stale threshold", () => {
    expect(FEE_STALE_DAYS).toBe(90);
  });

  it("colour classes are deterministic per tier", () => {
    expect(
      computeFeeFreshness("2026-04-10T12:00:00Z", NOW).classes.dot,
    ).toBe("bg-emerald-500");
    expect(
      computeFeeFreshness("2026-02-01T12:00:00Z", NOW).classes.dot,
    ).toBe("bg-amber-500");
    expect(
      computeFeeFreshness("2025-11-01T12:00:00Z", NOW).classes.dot,
    ).toBe("bg-rose-500");
    expect(computeFeeFreshness(null, NOW).classes.dot).toBe("bg-rose-500");
  });
});
