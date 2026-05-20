import { describe, it, expect } from "vitest";
import {
  formatResponseTimeLabel,
  type ResponseTimeStats,
} from "@/lib/advisor-response-time";

const stats = (median_hours: number | null, sample_size: number): ResponseTimeStats => ({
  median_hours,
  sample_size,
});

describe("formatResponseTimeLabel", () => {
  it("returns null when stats are missing", () => {
    expect(formatResponseTimeLabel(null)).toBeNull();
    expect(formatResponseTimeLabel(undefined)).toBeNull();
  });

  it("returns null when median_hours is null", () => {
    expect(formatResponseTimeLabel(stats(null, 10))).toBeNull();
  });

  it("returns null when the sample size is below 3 (too noisy)", () => {
    expect(formatResponseTimeLabel(stats(2, 2))).toBeNull();
    expect(formatResponseTimeLabel(stats(2, 0))).toBeNull();
  });

  it("buckets sub-hour medians into the 1h band", () => {
    expect(formatResponseTimeLabel(stats(0.5, 5))).toBe("Usually responds within 1h");
  });

  it("buckets by the < 4h / < 12h / < 24h thresholds", () => {
    expect(formatResponseTimeLabel(stats(1, 5))).toBe("Usually responds within 4h");
    expect(formatResponseTimeLabel(stats(3.9, 5))).toBe("Usually responds within 4h");
    expect(formatResponseTimeLabel(stats(4, 5))).toBe("Usually responds within 12h");
    expect(formatResponseTimeLabel(stats(11.9, 5))).toBe("Usually responds within 12h");
    expect(formatResponseTimeLabel(stats(12, 5))).toBe("Usually responds within 24h");
    expect(formatResponseTimeLabel(stats(23.9, 5))).toBe("Usually responds within 24h");
  });

  it("uses the 2-day label at and above 24h", () => {
    expect(formatResponseTimeLabel(stats(24, 5))).toBe("Usually responds within 2 days");
    expect(formatResponseTimeLabel(stats(72, 5))).toBe("Usually responds within 2 days");
  });

  it("treats sample_size of exactly 3 as enough to display", () => {
    expect(formatResponseTimeLabel(stats(2, 3))).toBe("Usually responds within 4h");
  });
});
