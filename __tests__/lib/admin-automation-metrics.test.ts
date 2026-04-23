import { describe, it, expect } from "vitest";
import {
  computeHealth,
  FEATURE_CONFIG,
  AUTOMATION_FEATURES,
} from "@/lib/admin/automation-metrics";

/**
 * automation-metrics has one crucial pure function (computeHealth)
 * and a static config (FEATURE_CONFIG). The 15+ getOverview funcs
 * all hit Supabase and are better covered as integration tests —
 * here we nail down the health state machine.
 */

describe("computeHealth state machine", () => {
  const cadence = 24; // 24-hour expected cadence
  const warn = 50;
  const critical = 100;

  it("returns 'unknown' when no lastRun and queue under warn threshold", () => {
    expect(computeHealth(null, 0, cadence, warn, critical)).toBe("unknown");
  });

  it("returns 'unknown' when lastRun is never_run and queue under warn", () => {
    expect(
      computeHealth(
        { name: "x", status: "never_run", startedAt: null, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: null },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("unknown");
  });

  it("returns 'red' when pending >= queueCritical (regardless of lastRun)", () => {
    expect(computeHealth(null, 100, cadence, warn, critical)).toBe("red");
    expect(computeHealth(null, 101, cadence, warn, critical)).toBe("red");
  });

  it("returns 'red' when lastRun errored", () => {
    expect(
      computeHealth(
        { name: "x", status: "error", startedAt: new Date().toISOString(), endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });

  it("returns 'red' when age > 2× cadence", () => {
    // 49 hours ago is > 48 (2 * 24)
    const staleTime = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: staleTime, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });

  it("returns 'amber' when queue between warn and critical", () => {
    expect(computeHealth(null, 75, cadence, warn, critical)).toBe("amber");
  });

  it("returns 'amber' when lastRun is 'partial'", () => {
    expect(
      computeHealth(
        { name: "x", status: "partial", startedAt: new Date().toISOString(), endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("amber");
  });

  it("returns 'amber' when age > 1.25× cadence but <= 2×", () => {
    // 31h = 1.29 × 24 — between 30h (1.25×) and 48h (2×)
    const warnTime = new Date(Date.now() - 31 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: warnTime, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("amber");
  });

  it("returns 'green' when everything is healthy and fresh", () => {
    const fresh = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: fresh, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        0,
        cadence,
        warn,
        critical,
      ),
    ).toBe("green");
  });

  it("prioritises red queue over amber run age", () => {
    const warnTime = new Date(Date.now() - 31 * 60 * 60 * 1000).toISOString();
    expect(
      computeHealth(
        { name: "x", status: "ok", startedAt: warnTime, endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        200,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });

  it("prioritises red status over amber queue", () => {
    expect(
      computeHealth(
        { name: "x", status: "error", startedAt: new Date().toISOString(), endedAt: null, durationMs: null, stats: null, errorMessage: null, triggeredBy: "cron" },
        75,
        cadence,
        warn,
        critical,
      ),
    ).toBe("red");
  });
});

describe("FEATURE_CONFIG + AUTOMATION_FEATURES", () => {
  it("exposes a non-empty list of features", () => {
    expect(AUTOMATION_FEATURES.length).toBeGreaterThan(5);
  });

  it("has a FEATURE_CONFIG entry for every feature in the list", () => {
    for (const f of AUTOMATION_FEATURES) {
      const cfg = FEATURE_CONFIG[f];
      expect(cfg, `missing config for ${f}`).toBeDefined();
      expect(cfg.title).toBeTruthy();
      expect(cfg.description).toBeTruthy();
      expect(cfg.slug).toBeTruthy();
      expect(cfg.key).toBe(f);
    }
  });

  it("slug values are all unique (routes under /admin/automation/<slug>)", () => {
    const slugs = AUTOMATION_FEATURES.map((f) => FEATURE_CONFIG[f].slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
