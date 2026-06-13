import { describe, it, expect } from "vitest";
import {
  canonicalEnumValue,
  metricCents,
  metricNumber,
  metricsForCategory,
  filterableMetrics,
  formatMetricByDef,
  pricePerUnit,
  VERTICAL_METRICS,
} from "@/lib/listings/vertical-metrics";

describe("VERTICAL_METRICS registry", () => {
  it("defines at most one $/unit denominator per category", () => {
    for (const [slug, defs] of Object.entries(VERTICAL_METRICS)) {
      const denominators = defs.filter((d) => d.perUnitDenominator);
      expect(denominators.length, slug).toBeLessThanOrEqual(1);
    }
  });

  it("gives enum filters their options", () => {
    for (const defs of Object.values(VERTICAL_METRICS)) {
      for (const def of defs) {
        if (def.kind === "enum" && (def.filter === "select" || def.filter === "multi")) {
          expect(def.enumValues?.length ?? 0, def.key).toBeGreaterThan(0);
        }
      }
    }
  });

  it("returns [] for unknown categories", () => {
    expect(metricsForCategory("not-a-category")).toEqual([]);
    expect(filterableMetrics("not-a-category")).toEqual([]);
  });

  it("commercial property leads with yield / WALE / floor area filters", () => {
    const keys = filterableMetrics("commercial-property").map((m) => m.key);
    expect(keys).toEqual(
      expect.arrayContaining(["yield_percent", "wale_years", "sqm", "tenancy"]),
    );
  });
});

describe("tolerant value parsing (legacy display strings)", () => {
  it("metricNumber parses numbers, separators, % and currency prefixes", () => {
    expect(metricNumber(412)).toBe(412);
    expect(metricNumber("1,234.5")).toBe(1234.5);
    expect(metricNumber("9.2%")).toBe(9.2);
    expect(metricNumber("$680,000")).toBe(680000);
    expect(metricNumber("AUD 250")).toBe(250);
    expect(metricNumber("abc")).toBeNull();
    expect(metricNumber("")).toBeNull();
    expect(metricNumber(null)).toBeNull();
    expect(metricNumber(NaN)).toBeNull();
    expect(metricNumber("12-15%")).toBeNull(); // ranges are not a number
  });

  it("metricCents treats numbers as cents and $-strings as dollars", () => {
    expect(metricCents(68_000_000)).toBe(68_000_000);
    // Legacy business rows store annual_ebitda as "$680,000" — dollars.
    expect(metricCents("$680,000")).toBe(68_000_000);
    expect(metricCents("$1,180,000")).toBe(118_000_000);
    // A bare integer string mirrors numeric storage — already cents.
    expect(metricCents("68000000")).toBe(68_000_000);
    expect(metricCents("undisclosed")).toBeNull();
  });

  it("canonicalEnumValue resolves stored synonyms through aliases", () => {
    const stage = metricsForCategory("mining").find((m) => m.key === "stage")!;
    expect(canonicalEnumValue(stage, "producer")).toBe("producer");
    expect(canonicalEnumValue(stage, "Production")).toBe("producer");
    expect(canonicalEnumValue(stage, "exploration")).toBe("explorer");
    expect(canonicalEnumValue(stage, "care_and_maintenance")).toBeNull();

    const energyStage = metricsForCategory("renewable-energy").find((m) => m.key === "stage")!;
    expect(canonicalEnumValue(energyStage, "operational")).toBe("operational");
    expect(canonicalEnumValue(energyStage, "operating")).toBe("operational");
    expect(canonicalEnumValue(energyStage, "planning")).toBe("planning");
    expect(canonicalEnumValue(energyStage, "development")).toBe("planning");
  });

  it("stage facets use the stored vocabulary as canonical values", () => {
    // Census 2026-06-12: mining rows store explorer/developer/producer;
    // energy rows store operational/planning. The facet must offer what
    // the data contains or every option filters to zero.
    const mining = metricsForCategory("mining").find((m) => m.key === "stage")!;
    expect(mining.enumValues?.map((e) => e.value)).toEqual(["explorer", "developer", "producer"]);
    const energy = metricsForCategory("renewable-energy").find((m) => m.key === "stage")!;
    expect(energy.enumValues?.map((e) => e.value)).toContain("operational");
    expect(energy.enumValues?.map((e) => e.value)).toContain("planning");
  });
});

describe("formatMetricByDef", () => {
  const def = (over: Record<string, unknown>) =>
    ({ key: "k", label: "K", kind: "number", ...over }) as Parameters<typeof formatMetricByDef>[0];

  it("formats each kind", () => {
    expect(formatMetricByDef(def({ kind: "percent" }), 6.25)).toBe("6.3%");
    expect(formatMetricByDef(def({ kind: "percent" }), 12)).toBe("12%");
    expect(formatMetricByDef(def({ kind: "currency_cents" }), 4_500_000)).toBe("$45k");
    expect(formatMetricByDef(def({ kind: "number", unit: "ha" }), 412)).toBe("412 ha");
    expect(formatMetricByDef(def({ kind: "boolean" }), true)).toBe("Yes");
    expect(
      formatMetricByDef(
        def({ kind: "enum", enumValues: [{ value: "leased", label: "Leased" }] }),
        "leased",
      ),
    ).toBe("Leased");
  });

  it("is null-safe on garbage", () => {
    expect(formatMetricByDef(def({}), null)).toBeNull();
    expect(formatMetricByDef(def({}), "")).toBeNull();
    expect(formatMetricByDef(def({ kind: "percent" }), "abc")).toBeNull();
    expect(formatMetricByDef(def({ kind: "currency_cents" }), -5)).toBeNull();
  });

  it("formats legacy display-string values instead of dropping them", () => {
    // "$680,000" is dollars → $680k, not NaN and not $6.8k.
    expect(formatMetricByDef(def({ kind: "currency_cents" }), "$680,000")).toBe("$680k");
    expect(formatMetricByDef(def({ kind: "percent" }), "9.2%")).toBe("9.2%");
    expect(formatMetricByDef(def({ kind: "number", unit: "ha" }), "1,250")).toBe("1,250 ha");
  });

  it("labels enum values through their aliases", () => {
    const stage = def({
      kind: "enum",
      enumValues: [{ value: "operational", label: "Operating", aliases: ["operating"] }],
    });
    expect(formatMetricByDef(stage, "operational")).toBe("Operating");
    expect(formatMetricByDef(stage, "operating")).toBe("Operating");
    expect(formatMetricByDef(stage, "unknown-stage")).toBe("unknown-stage");
  });
});

describe("pricePerUnit (#8 normalisation)", () => {
  it("computes $/ha for farmland", () => {
    const result = pricePerUnit({
      vertical: "farmland",
      asking_price_cents: 420_000_000, // $4.2M
      key_metrics: { hectares: 412 },
    });
    expect(result).not.toBeNull();
    expect(result?.label).toBe("$/ha");
    expect(result?.value).toBe("$10k/ha");
    expect(Math.round(result!.centsPerUnit)).toBe(Math.round(420_000_000 / 412));
  });

  it("computes $/m² for commercial property", () => {
    const result = pricePerUnit({
      vertical: "commercial_property",
      asking_price_cents: 9_720_000_00,
      key_metrics: { sqm: 2000 },
    });
    expect(result?.label).toBe("$/m²");
  });

  it("computes $/ML for water rights", () => {
    const result = pricePerUnit({
      vertical: "water-rights",
      asking_price_cents: 50_000_000,
      key_metrics: { water_entitlements_ml: 250 },
    });
    expect(result?.value).toBe("$2k/ML");
  });

  it("parses a legacy string denominator ('1,250' ha)", () => {
    const result = pricePerUnit({
      vertical: "farmland",
      asking_price_cents: 1_250_000_00,
      key_metrics: { hectares: "1,250" },
    });
    expect(result?.label).toBe("$/ha");
    expect(Math.round(result!.centsPerUnit)).toBe(Math.round(1_250_000_00 / 1250));
  });

  it("never guesses: POA, missing/zero denominator, undefined category", () => {
    expect(
      pricePerUnit({ vertical: "farmland", asking_price_cents: null, key_metrics: { hectares: 10 } }),
    ).toBeNull();
    expect(
      pricePerUnit({ vertical: "farmland", asking_price_cents: 100, key_metrics: {} }),
    ).toBeNull();
    expect(
      pricePerUnit({ vertical: "farmland", asking_price_cents: 100, key_metrics: { hectares: 0 } }),
    ).toBeNull();
    expect(
      pricePerUnit({ vertical: "royalties", asking_price_cents: 100, key_metrics: {} }),
    ).toBeNull();
    // Franchise defines metrics but no denominator — spec-only.
    expect(
      pricePerUnit({ vertical: "franchise", asking_price_cents: 100, key_metrics: { royalty_percent: 6 } }),
    ).toBeNull();
  });
});
