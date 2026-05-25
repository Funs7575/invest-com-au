/**
 * Tests for lib/expat-plan.ts
 *
 * Coverage:
 *   - buildExpatPlan: structural invariants, country-specific features,
 *     fxSummary / pensionSummary enrichment, data integrity
 *   - computeCompletion: zero, partial, full, edge cases
 *   - getPlanItem: hit and miss
 *   - planProgressKey: stable key format
 *   - parseProgress: valid, malformed, null, type-coercion attacks
 *   - toggleItemDone: add, remove, idempotent
 */

import { describe, it, expect } from "vitest";
import {
  buildExpatPlan,
  computeCompletion,
  getPlanItem,
  planProgressKey,
  parseProgress,
  toggleItemDone,
  type ExpatPlan,
  type ExpatPlanProgress,
} from "@/lib/expat-plan";
import {
  UK_CONFIG,
  US_CONFIG,
  NZ_CONFIG,
  CN_CONFIG,
  SA_CONFIG,
} from "@/lib/foreign-investment-country-data";

// ─── buildExpatPlan — invariants ─────────────────────────────────────────────

describe("buildExpatPlan — structural invariants", () => {
  it("returns at least 2 items (eligibility + handoff) for every country", () => {
    for (const config of [UK_CONFIG, US_CONFIG, NZ_CONFIG, CN_CONFIG, SA_CONFIG]) {
      const plan = buildExpatPlan(config);
      expect(plan.items.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("first item is always eligibility", () => {
    const plan = buildExpatPlan(UK_CONFIG);
    expect(plan.items[0]).toBeDefined();
    expect(plan.items[0]!.id).toBe("eligibility");
    expect(plan.items[0]!.stepNumber).toBe(1);
  });

  it("last item is always handoff", () => {
    const plan = buildExpatPlan(UK_CONFIG);
    const last = plan.items[plan.items.length - 1];
    expect(last).toBeDefined();
    expect(last!.id).toBe("handoff");
  });

  it("step numbers are sequential from 1 with no gaps", () => {
    const plan = buildExpatPlan(UK_CONFIG);
    plan.items.forEach((item, idx) => {
      expect(item.stepNumber).toBe(idx + 1);
    });
  });

  it("item ids are unique within a plan", () => {
    const plan = buildExpatPlan(UK_CONFIG);
    const ids = plan.items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every item has a non-empty heading, summary, and railLabel", () => {
    const plan = buildExpatPlan(UK_CONFIG);
    for (const item of plan.items) {
      expect(item.heading.length).toBeGreaterThan(0);
      expect(item.summary.length).toBeGreaterThan(0);
      expect(item.railLabel.length).toBeGreaterThan(0);
    }
  });

  it("every item has a category from the known set", () => {
    const VALID_CATEGORIES = new Set(["setup", "compliance", "financial", "action"]);
    const plan = buildExpatPlan(UK_CONFIG);
    for (const item of plan.items) {
      expect(VALID_CATEGORIES.has(item.category)).toBe(true);
    }
  });

  it("builtAt is a valid ISO 8601 timestamp", () => {
    const plan = buildExpatPlan(UK_CONFIG);
    expect(() => new Date(plan.builtAt)).not.toThrow();
    expect(new Date(plan.builtAt).getTime()).toBeGreaterThan(0);
  });

  it("sets code, countryName, countryShort, flag, currency from config", () => {
    const plan = buildExpatPlan(UK_CONFIG);
    expect(plan.code).toBe("uk");
    expect(plan.countryName).toBe("United Kingdom");
    expect(plan.countryShort).toBe("UK");
    expect(plan.flag).toBe("🇬🇧");
    expect(plan.currency).toBe("GBP");
  });
});

// ─── buildExpatPlan — UK full-featured ──────────────────────────────────────

describe("buildExpatPlan — UK (full-featured config)", () => {
  let plan: ExpatPlan;

  // Build once for the suite — avoids re-running the full build per test
  plan = buildExpatPlan(UK_CONFIG);

  it("includes a firb item", () => {
    const item = plan.items.find((i) => i.id === "firb");
    expect(item).toBeDefined();
    expect(item!.category).toBe("compliance");
  });

  it("includes a tax item", () => {
    const item = plan.items.find((i) => i.id === "tax");
    expect(item).toBeDefined();
    expect(item!.category).toBe("compliance");
  });

  it("includes a pension item for UK (QROPS)", () => {
    const item = plan.items.find((i) => i.id === "pension");
    expect(item).toBeDefined();
    expect(item!.category).toBe("financial");
    // Pension item should have a critical callout
    expect(item!.calloutVariant).toBe("critical");
  });

  it("includes an fx item for UK (GBP corridor)", () => {
    const item = plan.items.find((i) => i.id === "fx");
    expect(item).toBeDefined();
    expect(item!.category).toBe("financial");
  });

  it("includes a migration item", () => {
    const item = plan.items.find((i) => i.id === "migration");
    expect(item).toBeDefined();
    expect(item!.category).toBe("setup");
  });

  it("fxSummary is populated with UK GBP→AUD corridor data", () => {
    expect(plan.fxSummary).toBeDefined();
    expect(plan.fxSummary!.eyebrow).toContain("GBP");
    expect(plan.fxSummary!.bestOptionLabel.length).toBeGreaterThan(0);
    expect(plan.fxSummary!.bestOptionCost.length).toBeGreaterThan(0);
    expect(plan.fxSummary!.ctaHref.length).toBeGreaterThan(0);
  });

  it("pensionSummary is populated with QROPS data", () => {
    expect(plan.pensionSummary).toBeDefined();
    expect(plan.pensionSummary!.title).toContain("QROPS");
    expect(plan.pensionSummary!.keyRules.length).toBeGreaterThan(0);
    // callout should mention risk
    expect(plan.pensionSummary!.callout).toBeDefined();
  });

  it("fx item detail bullets include corridor options and key insight", () => {
    const item = plan.items.find((i) => i.id === "fx");
    expect(item).toBeDefined();
    const allDetail = item!.detail.join(" ");
    // Should have corridor label
    expect(allDetail).toContain("GBP");
    // Should mention at least one option
    expect(allDetail.toLowerCase()).toMatch(/cost|margin/i);
  });

  it("pension item detail bullets include key QROPS rules", () => {
    const item = plan.items.find((i) => i.id === "pension");
    expect(item).toBeDefined();
    const allDetail = item!.detail.join(" ");
    // Should reference the pension transfer overview
    expect(allDetail.length).toBeGreaterThan(50);
  });

  it("handoff item category is 'action'", () => {
    const item = plan.items.find((i) => i.id === "handoff");
    expect(item).toBeDefined();
    expect(item!.category).toBe("action");
  });
});

// ─── buildExpatPlan — US (FBAR/FATCA, no pension) ───────────────────────────

describe("buildExpatPlan — US config", () => {
  const plan = buildExpatPlan(US_CONFIG);

  it("includes a reporting item for FBAR/FATCA", () => {
    const item = plan.items.find((i) => i.id === "reporting");
    expect(item).toBeDefined();
    expect(item!.category).toBe("compliance");
  });

  it("reporting item detail mentions FBAR", () => {
    const item = plan.items.find((i) => i.id === "reporting");
    expect(item).toBeDefined();
    const text = item!.detail.join(" ");
    expect(text).toContain("FBAR");
  });

  it("does NOT have a pensionSummary (US has no retirementTransfer config)", () => {
    expect(plan.pensionSummary).toBeUndefined();
  });

  it("eligibility item has a critical callout for US worldwide tax", () => {
    const item = plan.items.find((i) => i.id === "eligibility");
    expect(item).toBeDefined();
    expect(item!.calloutVariant).toBe("critical");
  });

  it("has an fxSummary for USD→AUD", () => {
    expect(plan.fxSummary).toBeDefined();
  });
});

// ─── buildExpatPlan — NZ (no FIRB) ──────────────────────────────────────────

describe("buildExpatPlan — NZ config (Trans-Tasman)", () => {
  const plan = buildExpatPlan(NZ_CONFIG);

  it("FIRB item has warn callout (not critical) for NZ", () => {
    const item = plan.items.find((i) => i.id === "firb");
    expect(item).toBeDefined();
    expect(item!.calloutVariant).toBe("warn");
  });

  it("includes a pension item for NZ (KiwiSaver)", () => {
    const item = plan.items.find((i) => i.id === "pension");
    expect(item).toBeDefined();
    expect(plan.pensionSummary).toBeDefined();
  });

  it("plan code is 'nz'", () => {
    expect(plan.code).toBe("nz");
  });
});

// ─── buildExpatPlan — CN (capital controls) ──────────────────────────────────

describe("buildExpatPlan — CN config", () => {
  const plan = buildExpatPlan(CN_CONFIG);

  it("eligibility item has critical callout for capital controls", () => {
    const item = plan.items.find((i) => i.id === "eligibility");
    expect(item).toBeDefined();
    expect(item!.calloutVariant).toBe("critical");
  });

  it("has an fxSummary", () => {
    expect(plan.fxSummary).toBeDefined();
  });
});

// ─── buildExpatPlan — SA (no DTA) ────────────────────────────────────────────

describe("buildExpatPlan — SA config (no DTA)", () => {
  const plan = buildExpatPlan(SA_CONFIG);

  it("plan has at least 3 items", () => {
    expect(plan.items.length).toBeGreaterThanOrEqual(3);
  });

  it("eligibility detail mentions no DTA", () => {
    const item = plan.items.find((i) => i.id === "eligibility");
    expect(item).toBeDefined();
    const text = item!.detail.join(" ");
    expect(text).toContain("Double Tax Agreement");
  });
});

// ─── buildExpatPlan — data integrity ─────────────────────────────────────────

describe("buildExpatPlan — link integrity", () => {
  const KNOWN_PREFIXES = [
    "/foreign-investment",
    "/advisors",
    "/compare",
    "/non-resident",
    "/visa-investment",
    "/cgt-calculator",
    "/invest",
    "/find-advisor",
    "/login",
  ];

  for (const code of ["uk", "us", "nz", "cn", "sa"] as const) {
    const configs = {
      uk: UK_CONFIG,
      us: US_CONFIG,
      nz: NZ_CONFIG,
      cn: CN_CONFIG,
      sa: SA_CONFIG,
    };
    it(`all links in ${code.toUpperCase()} plan start with a known prefix`, () => {
      const plan = buildExpatPlan(configs[code]);
      for (const item of plan.items) {
        for (const link of item.links) {
          const isKnown = KNOWN_PREFIXES.some((prefix) =>
            link.href.startsWith(prefix),
          );
          expect(
            isKnown,
            `Unexpected link href in item "${item.id}": ${link.href}`,
          ).toBe(true);
        }
      }
    });
  }
});

// ─── computeCompletion ───────────────────────────────────────────────────────

describe("computeCompletion", () => {
  const plan = buildExpatPlan(UK_CONFIG);
  const allIds = plan.items.map((i) => i.id);

  it("returns 0% and not complete when no items done", () => {
    const result = computeCompletion(plan, []);
    expect(result.doneCount).toBe(0);
    expect(result.totalCount).toBe(plan.items.length);
    expect(result.percent).toBe(0);
    expect(result.complete).toBe(false);
  });

  it("returns 100% and complete when all items done", () => {
    const result = computeCompletion(plan, allIds);
    expect(result.doneCount).toBe(plan.items.length);
    expect(result.percent).toBe(100);
    expect(result.complete).toBe(true);
  });

  it("correctly calculates partial completion", () => {
    // Mark exactly half done (rounded)
    const halfIds = allIds.slice(0, Math.floor(allIds.length / 2));
    const result = computeCompletion(plan, halfIds);
    expect(result.doneCount).toBe(halfIds.length);
    expect(result.percent).toBeGreaterThan(0);
    expect(result.percent).toBeLessThan(100);
    expect(result.complete).toBe(false);
  });

  it("ignores unknown ids not in the plan", () => {
    const result = computeCompletion(plan, ["totally-unknown-id"]);
    expect(result.doneCount).toBe(0);
    expect(result.percent).toBe(0);
  });

  it("handles duplicate done ids gracefully (deduplication via Set)", () => {
    const firstId = allIds[0]!;
    const result = computeCompletion(plan, [firstId, firstId, firstId]);
    expect(result.doneCount).toBe(1);
  });

  it("percent is always an integer (Math.round)", () => {
    for (let i = 0; i < allIds.length; i++) {
      const result = computeCompletion(plan, allIds.slice(0, i));
      expect(result.percent).toBe(Math.round(result.percent));
      expect(Number.isInteger(result.percent)).toBe(true);
    }
  });

  it("handles an empty plan (zero total) without divide-by-zero", () => {
    const emptyPlan: ExpatPlan = {
      code: "uk",
      countryName: "United Kingdom",
      countryShort: "UK",
      flag: "🇬🇧",
      currency: "GBP",
      items: [],
      builtAt: new Date().toISOString(),
    };
    const result = computeCompletion(emptyPlan, []);
    expect(result.percent).toBe(0);
    expect(result.complete).toBe(false);
    expect(result.totalCount).toBe(0);
    expect(result.doneCount).toBe(0);
  });
});

// ─── getPlanItem ──────────────────────────────────────────────────────────────

describe("getPlanItem", () => {
  const plan = buildExpatPlan(UK_CONFIG);

  it("returns the item matching the given id", () => {
    const item = getPlanItem(plan, "tax");
    expect(item).toBeDefined();
    expect(item!.id).toBe("tax");
  });

  it("returns undefined for an unknown id", () => {
    const item = getPlanItem(plan, "nonexistent-id");
    expect(item).toBeUndefined();
  });

  it("returns the eligibility item by id", () => {
    const item = getPlanItem(plan, "eligibility");
    expect(item).toBeDefined();
    expect(item!.stepNumber).toBe(1);
  });
});

// ─── planProgressKey ─────────────────────────────────────────────────────────

describe("planProgressKey", () => {
  it("returns the expected key format for known codes", () => {
    expect(planProgressKey("uk")).toBe("expat_plan_progress_uk");
    expect(planProgressKey("us")).toBe("expat_plan_progress_us");
    expect(planProgressKey("nz")).toBe("expat_plan_progress_nz");
    expect(planProgressKey("cn")).toBe("expat_plan_progress_cn");
  });

  it("keys are unique per country code", () => {
    const codes = ["uk", "us", "nz", "cn", "in", "jp", "sg", "hk", "kr", "my", "ae", "sa"] as const;
    const keys = codes.map(planProgressKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(codes.length);
  });
});

// ─── parseProgress ───────────────────────────────────────────────────────────

describe("parseProgress", () => {
  it("returns empty progress for null input", () => {
    const result = parseProgress(null);
    expect(result.doneIds).toEqual([]);
  });

  it("returns empty progress for undefined input", () => {
    const result = parseProgress(undefined);
    expect(result.doneIds).toEqual([]);
  });

  it("returns empty progress for empty string", () => {
    const result = parseProgress("");
    expect(result.doneIds).toEqual([]);
  });

  it("parses a valid progress JSON string", () => {
    const progress: ExpatPlanProgress = {
      doneIds: ["eligibility", "firb"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const result = parseProgress(JSON.stringify(progress));
    expect(result.doneIds).toEqual(["eligibility", "firb"]);
    expect(result.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("handles malformed JSON without throwing", () => {
    expect(() => parseProgress("{invalid json")).not.toThrow();
    const result = parseProgress("{invalid json");
    expect(result.doneIds).toEqual([]);
  });

  it("handles an object without doneIds array gracefully", () => {
    const result = parseProgress(JSON.stringify({ something: "else" }));
    expect(result.doneIds).toEqual([]);
  });

  it("filters out non-string doneIds", () => {
    const raw = JSON.stringify({
      doneIds: ["eligibility", 42, null, "firb", true],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = parseProgress(raw);
    expect(result.doneIds).toEqual(["eligibility", "firb"]);
  });

  it("filters out empty-string doneIds", () => {
    const raw = JSON.stringify({
      doneIds: ["eligibility", "", "firb"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = parseProgress(raw);
    expect(result.doneIds).toEqual(["eligibility", "firb"]);
  });

  it("filters out excessively long doneIds (>= 64 chars)", () => {
    const longId = "a".repeat(65);
    const raw = JSON.stringify({
      doneIds: ["eligibility", longId, "firb"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = parseProgress(raw);
    expect(result.doneIds).not.toContain(longId);
    expect(result.doneIds).toContain("eligibility");
    expect(result.doneIds).toContain("firb");
  });

  it("handles a primitive JSON value (string, number) without throwing", () => {
    expect(() => parseProgress('"just a string"')).not.toThrow();
    expect(() => parseProgress("42")).not.toThrow();
    expect(parseProgress('"just a string"').doneIds).toEqual([]);
  });

  it("falls back updatedAt to epoch for missing field", () => {
    const raw = JSON.stringify({ doneIds: ["eligibility"] });
    const result = parseProgress(raw);
    expect(result.updatedAt).toBe(new Date(0).toISOString());
  });
});

// ─── toggleItemDone ──────────────────────────────────────────────────────────

describe("toggleItemDone", () => {
  const baseProgress: ExpatPlanProgress = {
    doneIds: ["eligibility"],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("adds an item to doneIds when done=true", () => {
    const result = toggleItemDone(baseProgress, "firb", true);
    expect(result.doneIds).toContain("firb");
    expect(result.doneIds).toContain("eligibility");
  });

  it("removes an item from doneIds when done=false", () => {
    const result = toggleItemDone(baseProgress, "eligibility", false);
    expect(result.doneIds).not.toContain("eligibility");
  });

  it("is idempotent — adding an already-done item does not duplicate", () => {
    const result = toggleItemDone(baseProgress, "eligibility", true);
    expect(result.doneIds.filter((id) => id === "eligibility").length).toBe(1);
  });

  it("is idempotent — removing a not-done item is safe", () => {
    const result = toggleItemDone(baseProgress, "nonexistent", false);
    expect(result.doneIds).toEqual(baseProgress.doneIds);
  });

  it("does not mutate the original progress object", () => {
    const original = { doneIds: ["eligibility"], updatedAt: "2026-01-01T00:00:00.000Z" };
    toggleItemDone(original, "firb", true);
    expect(original.doneIds).toEqual(["eligibility"]);
  });

  it("sets updatedAt to a date later than the original", () => {
    const before = new Date(baseProgress.updatedAt).getTime();
    const result = toggleItemDone(baseProgress, "firb", true);
    const after = new Date(result.updatedAt).getTime();
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("returns a new object (does not return the same reference)", () => {
    const result = toggleItemDone(baseProgress, "firb", true);
    expect(result).not.toBe(baseProgress);
  });
});
