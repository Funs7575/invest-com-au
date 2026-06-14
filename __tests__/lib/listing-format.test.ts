import { describe, it, expect } from "vitest";
import {
  humanizeTitle,
  formatMetricValue,
  listingDisplayMetrics,
  listingHeadlineStat,
} from "@/lib/listing-format";
import type { InvestmentListing } from "@/lib/types";

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
      { key: "bedrooms", label: "bedrooms", value: "3", bool: false },
      { key: "build_year", label: "build year", value: "2025", bool: false },
      { key: "sil_provider", label: "SIL provider", value: "Confidential", bool: false },
    ]);
  });

  it("renders a true boolean as a label-only presence chip and drops false ones", () => {
    expect(
      listingDisplayMetrics({ smsf_eligible: true, lrba_compatible: false, bedrooms: 3 }),
    ).toEqual([
      { key: "smsf_eligible", label: "SMSF eligible", value: "", bool: true },
      // lrba_compatible: false is dropped entirely (no "No LRBA compatible").
      { key: "bedrooms", label: "bedrooms", value: "3", bool: false },
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

  it("skips sub_category (already shown in the card's category line) and target-yield", () => {
    const metrics = listingDisplayMetrics({
      sub_category: "subsea_cable",
      target_yield_pct: "7-9",
      route: "Perth Singapore Jakarta",
    });
    expect(metrics.map((m) => m.key)).toEqual(["route"]);
  });

  it("returns [] for nullish metrics", () => {
    expect(listingDisplayMetrics(null)).toEqual([]);
    expect(listingDisplayMetrics(undefined)).toEqual([]);
  });
});

describe("listingHeadlineStat", () => {
  type Row = Parameters<typeof listingHeadlineStat>[0];
  function row(over: Partial<Row>): Row {
    return {
      vertical: "commercial_property" as InvestmentListing["vertical"],
      listing_kind: null,
      asking_price_cents: null,
      key_metrics: {},
      sub_category: null,
      ...over,
    } as Row;
  }

  it("returns a fund's forward-looking target IRR", () => {
    expect(
      listingHeadlineStat(row({ listing_kind: "fund", key_metrics: { target_irr_pct: 22 } })),
    ).toEqual({ label: "Target IRR", value: "22%", tone: "positive" });
  });

  it("returns net yield for a yield-bearing asset, one decimal when meaningful", () => {
    expect(
      listingHeadlineStat(row({ listing_kind: "for_sale_asset", key_metrics: { net_yield_pct: 11.2 } })),
    ).toEqual({ label: "Net yield", value: "11.2%", tone: "positive" });
    expect(
      listingHeadlineStat(row({ listing_kind: "for_sale_asset", key_metrics: { net_yield_pct: 11 } }))?.value,
    ).toBe("11%");
  });

  it("uses an explicit spot price for per-unit environmental assets", () => {
    expect(
      listingHeadlineStat(
        row({ listing_kind: "for_sale_asset", key_metrics: { units: 100, spot_price_aud: 35, unit_type: "ACCU" } }),
      ),
    ).toEqual({ label: "Per unit", value: "$35", tone: "neutral" });
  });

  it("derives per-credit price from asking_price_cents / credits", () => {
    expect(
      listingHeadlineStat(
        row({
          listing_kind: "for_sale_asset",
          asking_price_cents: 5_000_000,
          key_metrics: { credits: 50, unit_type: "biodiversity_credit" },
        }),
      ),
    ).toEqual({ label: "Per credit", value: "$1k", tone: "neutral" });
  });

  it("shows a project's target IRR given as a string range (en-dashed)", () => {
    expect(
      listingHeadlineStat(row({ listing_kind: "project_equity", key_metrics: { target_irr: "12-15%" } })),
    ).toEqual({ label: "Target IRR", value: "12–15%", tone: "positive" });
  });

  it("shows a target yield range, appending % when the string omits it", () => {
    expect(
      listingHeadlineStat(row({ listing_kind: "project_equity", key_metrics: { target_yield_pct: "7-9" } })),
    ).toEqual({ label: "Target yield", value: "7–9%", tone: "positive" });
  });

  it("returns null when the listing has no headline metric", () => {
    expect(listingHeadlineStat(row({ listing_kind: "project_equity", key_metrics: {} }))).toBeNull();
  });
});
