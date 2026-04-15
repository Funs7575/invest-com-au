import { describe, it, expect } from "vitest";
import {
  classifyVital,
  classifyDevice,
  isValidMetric,
  computePercentiles,
  computeRatingShare,
} from "@/lib/web-vitals";

describe("classifyVital — LCP", () => {
  it("classifies 2000ms as good", () => {
    expect(classifyVital("LCP", 2000)).toBe("good");
  });
  it("classifies 3000ms as needs-improvement", () => {
    expect(classifyVital("LCP", 3000)).toBe("needs-improvement");
  });
  it("classifies 5000ms as poor", () => {
    expect(classifyVital("LCP", 5000)).toBe("poor");
  });
  it("exact threshold 2500 is still good", () => {
    expect(classifyVital("LCP", 2500)).toBe("good");
  });
});

describe("classifyVital — CLS", () => {
  it("classifies 0.05 as good", () => {
    expect(classifyVital("CLS", 0.05)).toBe("good");
  });
  it("classifies 0.15 as needs-improvement", () => {
    expect(classifyVital("CLS", 0.15)).toBe("needs-improvement");
  });
  it("classifies 0.3 as poor", () => {
    expect(classifyVital("CLS", 0.3)).toBe("poor");
  });
});

describe("classifyVital — INP/FCP/TTFB", () => {
  it("INP 150ms is good", () => {
    expect(classifyVital("INP", 150)).toBe("good");
  });
  it("INP 600ms is poor", () => {
    expect(classifyVital("INP", 600)).toBe("poor");
  });
  it("FCP 1500ms is good", () => {
    expect(classifyVital("FCP", 1500)).toBe("good");
  });
  it("TTFB 500ms is good", () => {
    expect(classifyVital("TTFB", 500)).toBe("good");
  });
  it("TTFB 2000ms is poor", () => {
    expect(classifyVital("TTFB", 2000)).toBe("poor");
  });
});

describe("classifyDevice", () => {
  it("defaults to desktop for empty/null UA", () => {
    expect(classifyDevice(null)).toBe("desktop");
    expect(classifyDevice("")).toBe("desktop");
  });
  it("classifies an iPhone UA as mobile", () => {
    expect(
      classifyDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("mobile");
  });
  it("classifies an Android UA as mobile", () => {
    expect(
      classifyDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit"),
    ).toBe("mobile");
  });
  it("classifies iPad as tablet", () => {
    expect(classifyDevice("Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X)")).toBe(
      "tablet",
    );
  });
  it("classifies a macOS desktop UA as desktop", () => {
    expect(
      classifyDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit"),
    ).toBe("desktop");
  });
});

describe("isValidMetric", () => {
  it("accepts the 5 core metrics", () => {
    for (const m of ["LCP", "INP", "CLS", "FCP", "TTFB"]) {
      expect(isValidMetric(m)).toBe(true);
    }
  });
  it("rejects unknown metrics", () => {
    expect(isValidMetric("FPS")).toBe(false);
    expect(isValidMetric(null)).toBe(false);
    expect(isValidMetric(42)).toBe(false);
  });
});

describe("computePercentiles", () => {
  it("returns zeros for empty input", () => {
    expect(computePercentiles([])).toEqual({ p50: 0, p75: 0, p95: 0 });
  });

  it("a single value is its own percentiles", () => {
    expect(computePercentiles([100])).toEqual({ p50: 100, p75: 100, p95: 100 });
  });

  it("handles a small sorted array", () => {
    const r = computePercentiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // p50 of 10 sorted values: index 4 → 5
    expect(r.p50).toBe(5);
    // p75: index 6 → 7
    expect(r.p75).toBe(7);
    // p95: index 8 → 9
    expect(r.p95).toBe(9);
  });

  it("ignores unsorted input", () => {
    const sorted = computePercentiles([1, 2, 3, 4, 5]);
    const unsorted = computePercentiles([5, 3, 1, 4, 2]);
    expect(sorted).toEqual(unsorted);
  });

  it("p95 ≥ p75 ≥ p50 always", () => {
    const values = Array.from({ length: 100 }, (_, i) => Math.random() * 1000);
    const r = computePercentiles(values);
    expect(r.p75).toBeGreaterThanOrEqual(r.p50);
    expect(r.p95).toBeGreaterThanOrEqual(r.p75);
  });
});

describe("computeRatingShare", () => {
  it("empty → zeros", () => {
    expect(computeRatingShare([])).toEqual({ good_pct: 0, poor_pct: 0 });
  });

  it("all good → 100/0", () => {
    expect(computeRatingShare(["good", "good", "good"])).toEqual({
      good_pct: 100,
      poor_pct: 0,
    });
  });

  it("half good, half poor → 50/50", () => {
    expect(computeRatingShare(["good", "good", "poor", "poor"])).toEqual({
      good_pct: 50,
      poor_pct: 50,
    });
  });

  it("includes needs-improvement in the denominator only", () => {
    const r = computeRatingShare(["good", "needs-improvement", "poor"]);
    // 1/3 good ≈ 33.3, 1/3 poor ≈ 33.3
    expect(r.good_pct).toBeCloseTo(33.3, 1);
    expect(r.poor_pct).toBeCloseTo(33.3, 1);
  });
});
