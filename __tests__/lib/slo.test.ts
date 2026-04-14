import { describe, it, expect } from "vitest";
import { evaluateSlo } from "@/lib/slo";

function def(overrides: Partial<Parameters<typeof evaluateSlo>[0]> = {}) {
  return {
    name: "test",
    service: "cron",
    metric: "success_rate",
    target: 0.99,
    comparator: ">=" as const,
    window_minutes: 60,
    ...overrides,
  };
}

describe("evaluateSlo — success_rate >= 0.99", () => {
  it("within target → no breach", () => {
    const r = evaluateSlo(def(), { value: 0.995 });
    expect(r.breached).toBe(false);
    expect(r.reason).toBe("within_target");
  });

  it("slightly below target → warn", () => {
    const r = evaluateSlo(def(), { value: 0.96 });
    expect(r.breached).toBe(true);
    expect(r.severity).toBe("warn");
  });

  it("way below target → page", () => {
    const r = evaluateSlo(def(), { value: 0.4 });
    expect(r.breached).toBe(true);
    expect(r.severity).toBe("page");
  });
});

describe("evaluateSlo — other comparators", () => {
  it("< target for queue age", () => {
    const r = evaluateSlo(
      def({ metric: "queue_age", target: 15, comparator: "<" }),
      { value: 20 },
    );
    expect(r.breached).toBe(true);
  });

  it("<= passes when equal", () => {
    const r = evaluateSlo(
      def({ metric: "latency", target: 1000, comparator: "<=" }),
      { value: 1000 },
    );
    expect(r.breached).toBe(false);
  });

  it("> passes when strictly greater", () => {
    const r = evaluateSlo(
      def({ metric: "ok_count", target: 5, comparator: ">" }),
      { value: 6 },
    );
    expect(r.breached).toBe(false);
  });

  it("> fails when equal", () => {
    const r = evaluateSlo(
      def({ metric: "ok_count", target: 5, comparator: ">" }),
      { value: 5 },
    );
    expect(r.breached).toBe(true);
  });
});

describe("evaluateSlo — severity tier", () => {
  it("page when gap >= 50%", () => {
    const r = evaluateSlo(
      def({ target: 100, comparator: ">=" }),
      { value: 40 },
    );
    // (100 - 40) / 100 = 0.6 → page
    expect(r.severity).toBe("page");
  });

  it("warn when gap < 50%", () => {
    const r = evaluateSlo(
      def({ target: 100, comparator: ">=" }),
      { value: 70 },
    );
    // (100 - 70) / 100 = 0.3 → warn
    expect(r.severity).toBe("warn");
  });
});
