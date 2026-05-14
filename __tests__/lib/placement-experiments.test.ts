import { describe, it, expect } from "vitest";
import {
  applyPlacementVariant,
  conversionRate,
  ctr,
  fnv1a32,
  normaliseMetrics,
  normaliseVariants,
  pickVariant,
  VARIANT_LABEL_PATTERN,
  type PlacementVariant,
} from "@/lib/placement-experiments";
import type { Broker } from "@/lib/types";

function mkBroker(slug: string, name = slug, rating = 4): Broker {
  return {
    id: slug.length,
    slug,
    name,
    color: "slate",
    rating,
    chess_sponsored: false,
    smsf_support: false,
    is_crypto: false,
    platform_type: "share_broker",
    deal: false,
    editors_pick: false,
    status: "active",
  } as unknown as Broker;
}

describe("fnv1a32", () => {
  it("is deterministic", () => {
    expect(fnv1a32("hello")).toBe(fnv1a32("hello"));
  });

  it("differs for distinct strings", () => {
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
  });

  it("stays within 32-bit unsigned range", () => {
    const h = fnv1a32("placement-experiments-2026");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("VARIANT_LABEL_PATTERN", () => {
  it("accepts valid labels", () => {
    for (const label of ["control", "a", "v1", "challenger_2", "long-label-30char"]) {
      expect(VARIANT_LABEL_PATTERN.test(label)).toBe(true);
    }
  });

  it("rejects invalid labels", () => {
    for (const label of ["", "Control", "_x", "-x", "v 1", "a".repeat(32)]) {
      expect(VARIANT_LABEL_PATTERN.test(label)).toBe(false);
    }
  });
});

describe("pickVariant", () => {
  const variants: PlacementVariant[] = [
    { label: "a", broker_slug: null, weight: 50 },
    { label: "b", broker_slug: "challenger", weight: 50 },
  ];

  it("returns one of the configured variants", () => {
    const v = pickVariant({ id: 1, variants }, "fingerprint");
    expect(["a", "b"]).toContain(v.label);
  });

  it("is deterministic for the same fingerprint + experiment id", () => {
    const v1 = pickVariant({ id: 42, variants }, "203.0.113.4|Mozilla/5.0");
    const v2 = pickVariant({ id: 42, variants }, "203.0.113.4|Mozilla/5.0");
    expect(v1.label).toBe(v2.label);
  });

  it("differs across distinct experiment ids for the same fingerprint", () => {
    // With two equal-weight variants this is a property test — across
    // 50 different experiment ids we expect both to be represented.
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const v = pickVariant({ id: i, variants }, "fingerprint-x");
      seen.add(v.label);
    }
    expect(seen.size).toBe(2);
  });

  it("approximates the configured weight distribution", () => {
    const skewed: PlacementVariant[] = [
      { label: "a", broker_slug: null, weight: 90 },
      { label: "b", broker_slug: "ch", weight: 10 },
    ];
    let aCount = 0;
    const total = 2000;
    for (let i = 0; i < total; i++) {
      const v = pickVariant({ id: 1, variants: skewed }, `fp-${i}`);
      if (v.label === "a") aCount++;
    }
    const aRate = aCount / total;
    // Allow ±5pp around the 90% target. fnv1a32 + small ids is uniform
    // enough that this stays well-bounded; if it ever flakes, the bucket
    // boundaries in pickVariant are the place to look.
    expect(aRate).toBeGreaterThan(0.85);
    expect(aRate).toBeLessThan(0.95);
  });

  it("falls back to weighted random when fingerprint is empty", () => {
    // Just assert it doesn't throw and returns a valid variant.
    const v = pickVariant({ id: 1, variants }, "");
    expect(["a", "b"]).toContain(v.label);
  });

  it("returns the first variant when all weights are zero (misconfigured)", () => {
    const zeroed: PlacementVariant[] = [
      { label: "a", broker_slug: null, weight: 0 },
      { label: "b", broker_slug: "x", weight: 0 },
    ];
    const v = pickVariant({ id: 1, variants: zeroed }, "fp");
    expect(v.label).toBe("a");
  });

  it("ignores negative-weight variants", () => {
    const mixed: PlacementVariant[] = [
      { label: "a", broker_slug: null, weight: -5 },
      { label: "b", broker_slug: "x", weight: 100 },
    ];
    for (let i = 0; i < 20; i++) {
      const v = pickVariant({ id: 1, variants: mixed }, `fp-${i}`);
      expect(v.label).toBe("b");
    }
  });

  it("throws when variants array is empty", () => {
    expect(() => pickVariant({ id: 1, variants: [] }, "fp")).toThrow();
  });
});

describe("applyPlacementVariant", () => {
  const brokers = [
    mkBroker("alpha"),
    mkBroker("bravo"),
    mkBroker("charlie"),
    mkBroker("delta"),
  ];

  it("returns a clone when variant.broker_slug is null (control)", () => {
    const out = applyPlacementVariant(brokers, {
      label: "control",
      broker_slug: null,
      weight: 50,
    });
    expect(out).not.toBe(brokers);
    expect(out.map((b) => b.slug)).toEqual(["alpha", "bravo", "charlie", "delta"]);
  });

  it("promotes the named broker to position 0", () => {
    const out = applyPlacementVariant(brokers, {
      label: "a",
      broker_slug: "charlie",
      weight: 50,
    });
    expect(out.map((b) => b.slug)).toEqual(["charlie", "alpha", "bravo", "delta"]);
  });

  it("is a no-op when the named broker is already at position 0", () => {
    const out = applyPlacementVariant(brokers, {
      label: "a",
      broker_slug: "alpha",
      weight: 50,
    });
    expect(out.map((b) => b.slug)).toEqual(["alpha", "bravo", "charlie", "delta"]);
  });

  it("is a no-op when the named broker is not in the list", () => {
    const out = applyPlacementVariant(brokers, {
      label: "a",
      broker_slug: "missing-slug",
      weight: 50,
    });
    expect(out.map((b) => b.slug)).toEqual(["alpha", "bravo", "charlie", "delta"]);
  });

  it("does not mutate the input array", () => {
    const before = brokers.map((b) => b.slug).join(",");
    applyPlacementVariant(brokers, { label: "a", broker_slug: "delta", weight: 1 });
    expect(brokers.map((b) => b.slug).join(",")).toBe(before);
  });
});

describe("normaliseVariants", () => {
  it("filters out malformed entries", () => {
    const raw = [
      { label: "a", broker_slug: null, weight: 50 },
      { label: 123, broker_slug: null, weight: 50 }, // bad label
      { broker_slug: "x", weight: 10 }, // missing label
      { label: "b", broker_slug: "x", weight: 50 },
      null,
      "junk",
    ];
    const out = normaliseVariants(raw);
    expect(out.map((v) => v.label)).toEqual(["a", "b"]);
  });

  it("defaults weight to 0 when missing or non-numeric", () => {
    const out = normaliseVariants([
      { label: "x", broker_slug: null, weight: "abc" },
      { label: "y", broker_slug: null }, // no weight
    ]);
    expect(out).toEqual([
      { label: "x", broker_slug: null, weight: 0 },
      { label: "y", broker_slug: null, weight: 0 },
    ]);
  });

  it("returns [] when input is not an array", () => {
    expect(normaliseVariants(null)).toEqual([]);
    expect(normaliseVariants({})).toEqual([]);
    expect(normaliseVariants("abc")).toEqual([]);
  });
});

describe("normaliseMetrics", () => {
  it("keeps only known counter fields", () => {
    const raw = {
      a: { impressions: 100, clicks: 5, conversions: 1, junk: 999 },
      b: { impressions: "bad", clicks: 2 },
    };
    const out = normaliseMetrics(raw);
    expect(out.a).toEqual({ impressions: 100, clicks: 5, conversions: 1 });
    expect(out.b).toEqual({ clicks: 2 });
  });

  it("returns {} for non-object inputs", () => {
    expect(normaliseMetrics(null)).toEqual({});
    expect(normaliseMetrics([])).toEqual({});
    expect(normaliseMetrics("abc")).toEqual({});
  });
});

describe("ctr / conversionRate", () => {
  it("returns 0 for zero impressions", () => {
    expect(ctr({})).toBe(0);
    expect(ctr({ impressions: 0, clicks: 5 })).toBe(0);
    expect(conversionRate({ impressions: 0, conversions: 2 })).toBe(0);
  });

  it("computes the expected ratio", () => {
    expect(ctr({ impressions: 100, clicks: 5 })).toBeCloseTo(0.05);
    expect(conversionRate({ impressions: 200, conversions: 4 })).toBeCloseTo(0.02);
  });
});
