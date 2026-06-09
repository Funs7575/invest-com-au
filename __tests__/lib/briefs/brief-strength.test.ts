import { describe, it, expect } from "vitest";

import {
  scoreBriefStrength,
  type BriefStrengthInput,
} from "@/lib/briefs/brief-strength";

const EMPTY: BriefStrengthInput = {
  title: "",
  description: "",
  budgetBand: "",
  locationState: "",
  payload: {},
  fields: [],
};

function withDefaults(over: Partial<BriefStrengthInput>): BriefStrengthInput {
  return { ...EMPTY, ...over };
}

describe("scoreBriefStrength — bounds & tiers", () => {
  it("an empty brief scores low and is 'weak'", () => {
    const r = scoreBriefStrength(EMPTY);
    expect(r.score).toBeLessThan(40);
    expect(r.tier).toBe("weak");
    expect(r.label).toBe("Needs more detail");
  });

  it("a complete, detailed brief scores high and is 'great'", () => {
    const r = scoreBriefStrength({
      title: "SMSF property strategy in QLD with $200k super",
      description:
        "I'm 38, based in NSW, with about $200k in super. I want to set up an SMSF to buy an investment property in Brisbane, budget around $2,000 for advice, and I'd like to move in the next 3 months. I need lending and a buyer's agent.",
      budgetBand: "2k_5k",
      locationState: "NSW",
      payload: { timeline: "1_3_months", smsf_status: "considering_smsf", property_budget: "500k_700k", help_needed: ["lending"] },
      fields: [
        { key: "smsf_status", required: true },
        { key: "property_budget", required: true },
        { key: "timeline", required: true },
        { key: "help_needed", required: true },
      ],
    });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.tier).toBe("great");
    expect(r.tips).toHaveLength(0);
  });

  it("never exceeds 100 or drops below 0", () => {
    const r = scoreBriefStrength({
      title: "A very specific title with 12345 numbers and detail",
      description: "x".repeat(5000),
      budgetBand: "5k_10k",
      locationState: "VIC",
      payload: { timeline: "asap" },
      fields: [{ key: "timeline", required: true }],
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreBriefStrength — coaching tips", () => {
  it("surfaces the highest-impact missing dimension first", () => {
    // Title + budget + location present, but description empty → description
    // (max 40) is the biggest gap and should lead the tips.
    const r = scoreBriefStrength(
      withDefaults({
        title: "Refinance my $600k investment loan in NSW",
        budgetBand: "2k_5k",
        locationState: "NSW",
      }),
    );
    expect(r.tips[0]?.id).toBe("description");
  });

  it("recommends setting a budget when it's missing", () => {
    const r = scoreBriefStrength(
      withDefaults({
        title: "Tax help after selling a property",
        description:
          "I sold an investment property this financial year and want to minimise capital gains tax. Looking for a proactive accountant in the next month.",
        locationState: "QLD",
      }),
    );
    expect(r.tips.some((t) => t.id === "budget")).toBe(true);
  });

  it("returns at most three tips", () => {
    expect(scoreBriefStrength(EMPTY).tips.length).toBeLessThanOrEqual(3);
  });

  it("treats 'not_sure' budget as weaker than a real band", () => {
    const base = withDefaults({
      title: "Financial planning for retirement",
      description:
        "I'm 50 and want a long-term retirement plan covering super, shares and insurance over the next 6 months.",
      locationState: "WA",
    });
    const notSure = scoreBriefStrength({ ...base, budgetBand: "not_sure" });
    const real = scoreBriefStrength({ ...base, budgetBand: "5k_10k" });
    expect(real.score).toBeGreaterThan(notSure.score);
  });
});

describe("scoreBriefStrength — timeline relevance", () => {
  it("does not penalise templates that have no timeline field", () => {
    const notesOnly = scoreBriefStrength(
      withDefaults({
        title: "Independent review of my Statement of Advice",
        description:
          "My adviser recommended switching super funds. I'd like an independent professional to review the Statement of Advice before I act.",
        budgetBand: "500_2k",
        locationState: "NSW",
        fields: [{ key: "notes" }],
      }),
    );
    // No timeline tip should appear for a template without a timeline field.
    expect(notesOnly.tips.some((t) => t.id === "timeline")).toBe(false);
  });

  it("asks for a timeline when the template has the field but it's unset", () => {
    const r = scoreBriefStrength(
      withDefaults({
        title: "SMSF property purchase help in QLD",
        description:
          "I have an established SMSF and want to buy an investment property. I need lending and a buyer's agent to help me through it.",
        budgetBand: "2k_5k",
        locationState: "QLD",
        payload: { smsf_status: "smsf_established" },
        fields: [
          { key: "smsf_status", required: true },
          { key: "timeline", required: true },
        ],
      }),
    );
    expect(r.tips.some((t) => t.id === "timeline")).toBe(true);
  });
});
