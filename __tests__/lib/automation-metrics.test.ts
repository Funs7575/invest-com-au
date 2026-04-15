import { describe, it, expect } from "vitest";
import {
  computeHealth,
  FEATURE_CONFIG,
  AUTOMATION_FEATURES,
  type LatestCronRun,
} from "@/lib/admin/automation-metrics";

function mockRun(overrides: Partial<LatestCronRun> = {}): LatestCronRun {
  return {
    name: "test",
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationMs: 1000,
    status: "ok",
    stats: {},
    errorMessage: null,
    triggeredBy: "cron",
    ...overrides,
  };
}

describe("computeHealth", () => {
  it("returns green when recent run ok and queue empty", () => {
    expect(computeHealth(mockRun(), 0, 1, 20, 50)).toBe("green");
  });

  it("returns amber when run status is partial", () => {
    expect(computeHealth(mockRun({ status: "partial" }), 0, 1, 20, 50)).toBe("amber");
  });

  it("returns red when run status is error", () => {
    expect(computeHealth(mockRun({ status: "error" }), 0, 1, 20, 50)).toBe("red");
  });

  it("returns red when pending queue exceeds critical threshold", () => {
    expect(computeHealth(mockRun(), 100, 1, 20, 50)).toBe("red");
  });

  it("returns amber when pending queue exceeds warn threshold", () => {
    expect(computeHealth(mockRun(), 25, 1, 20, 50)).toBe("amber");
  });

  it("returns red when cron is overdue by more than 2 cadence windows", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(computeHealth(mockRun({ startedAt: threeHoursAgo }), 0, 1, 20, 50)).toBe("red");
  });

  it("returns amber when cron is overdue by 1-2 cadence windows", () => {
    const ninetyMinsAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    expect(computeHealth(mockRun({ startedAt: ninetyMinsAgo }), 0, 1, 20, 50)).toBe("amber");
  });

  it("returns unknown when no run history and no pending", () => {
    expect(computeHealth(null, 0, 24, 20, 50)).toBe("unknown");
  });

  it("returns amber when no run history but queue is at warn level", () => {
    expect(computeHealth(null, 25, 24, 20, 50)).toBe("amber");
  });

  it("returns unknown when no run history and queue is well below warn", () => {
    expect(computeHealth(null, 5, 24, 20, 50)).toBe("unknown");
  });

  it("prioritises red over amber when both conditions hit", () => {
    expect(computeHealth(mockRun({ status: "error" }), 25, 1, 20, 50)).toBe("red");
  });
});

describe("FEATURE_CONFIG", () => {
  it("has an entry for every feature in AUTOMATION_FEATURES", () => {
    for (const key of AUTOMATION_FEATURES) {
      expect(FEATURE_CONFIG[key]).toBeDefined();
      expect(FEATURE_CONFIG[key].key).toBe(key);
      expect(FEATURE_CONFIG[key].title).toBeTruthy();
      expect(FEATURE_CONFIG[key].slug).toBeTruthy();
    }
  });

  it("uses unique slugs", () => {
    const slugs = AUTOMATION_FEATURES.map((k) => FEATURE_CONFIG[k].slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
