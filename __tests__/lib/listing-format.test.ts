import { describe, it, expect } from "vitest";
import {
  humanizeTitle,
  formatMetricValue,
  listingDisplayMetrics,
} from "@/lib/listing-format";

describe("humanizeTitle", () => {
  it("title-cases snake_case and preserves domain acronyms", () => {
    expect(humanizeTitle("venture_capital")).toBe("Venture Capital");
    expect(humanizeTitle("sda_housing")).toBe("SDA Housing");
    expect(humanizeTitle("esvclp")).toBe("ESVCLP");
    expect(humanizeTitle("nsw_bcs")).toBe("NSW BCS");
    expect(humanizeTitle("Property")).toBe("Property");
  });

  it("returns an empty string for nullish/empty input", () => {
    expect(humanizeTitle(null)).toBe("");
    expect(humanizeTitle(undefined)).toBe("");
    expect(humanizeTitle("")).toBe("");
  });
});

describe("formatMetricValue", () => {
  it("formats percentages, snake_case values and booleans", () => {
    expect(formatMetricValue("ebitda_margin_pct", 18.8)).toBe("18.8%");
    expect(formatMetricValue("unit_type", "biodiversity_credit")).toBe("Biodiversity Credit");
    expect(formatMetricValue("structure", "managed_fund")).toBe("Managed Fund");
    expect(formatMetricValue("siv_complying", true)).toBe("Yes");
  });

  it("does not add thousands separators to plain numbers (e.g. years)", () => {
    expect(formatMetricValue("build_year", 2025)).toBe("2025");
  });

  it("leaves already-presentable values untouched", () => {
    expect(formatMetricValue("scheme", "NSW BCS")).toBe("NSW BCS");
    expect(formatMetricValue("sil_provider", "Confidential")).toBe("Confidential");
  });
});

describe("listingDisplayMetrics", () => {
  it("humanises keys + values and applies label overrides", () => {
    expect(
      listingDisplayMetrics({ bedrooms: 3, build_year: 2025, sil_provider: "Confidential" }),
    ).toEqual([
      { key: "bedrooms", label: "bedrooms", value: "3" },
      { key: "build_year", label: "build year", value: "2025" },
      { key: "sil_provider", label: "SIL provider", value: "Confidential" },
    ]);
  });

  it("skips price/yield duplicates and noise keys, capping at the limit", () => {
    const metrics = listingDisplayMetrics({
      net_yield_pct: 12.5, // shown on the price line — skipped
      min_investment_aud: 100000, // shown as the price — skipped
      bedrooms: 4,
      build_year: 2026,
      scheme: "NSW BCS",
    });
    expect(metrics.map((m) => m.key)).toEqual(["bedrooms", "build_year", "scheme"]);
  });

  it("returns [] for nullish metrics", () => {
    expect(listingDisplayMetrics(null)).toEqual([]);
    expect(listingDisplayMetrics(undefined)).toEqual([]);
  });
});
