import { describe, it, expect } from "vitest";
import { RETAIL_LABELS, RETAIL_CTAS, RETAIL_BLURBS } from "@/lib/consumer-copy";

// ── RETAIL_LABELS ─────────────────────────────────────────────────────────────

describe("RETAIL_LABELS", () => {
  const requiredKeys = [
    "investorBrief",
    "investorBriefShort",
    "investorBriefPlural",
    "expertTeam",
    "expertTeamPlural",
    "briefTracker",
    "briefTrackerSingular",
    "listingBrief",
    "secondOpinion",
    "riskHeldTitle",
    "riskHeldBody",
  ] as const;

  it.each(requiredKeys)("has a non-empty string for %s", (key) => {
    expect(RETAIL_LABELS[key].length).toBeGreaterThan(0);
  });

  it("investorBriefPlural ends with s (plural form)", () => {
    expect(RETAIL_LABELS.investorBriefPlural.endsWith("s")).toBe(true);
  });

  it("expertTeamPlural ends with s (plural form)", () => {
    expect(RETAIL_LABELS.expertTeamPlural.endsWith("s")).toBe(true);
  });
});

// ── RETAIL_CTAS ───────────────────────────────────────────────────────────────

describe("RETAIL_CTAS", () => {
  it("createBrief is a non-empty string", () => {
    expect(RETAIL_CTAS.createBrief.length).toBeGreaterThan(0);
  });

  it("createBriefForRoute has entries for individual, firm, expert_team, investor_brief, listing_brief, second_opinion", () => {
    const routes = ["individual", "firm", "expert_team", "investor_brief", "listing_brief", "second_opinion"] as const;
    for (const route of routes) {
      expect(RETAIL_CTAS.createBriefForRoute[route].length).toBeGreaterThan(0);
    }
  });

  it("browseListings and comparePlatforms are non-empty strings", () => {
    expect(RETAIL_CTAS.browseListings.length).toBeGreaterThan(0);
    expect(RETAIL_CTAS.comparePlatforms.length).toBeGreaterThan(0);
  });

  it("save-plan strip CTAs are all non-empty", () => {
    expect(RETAIL_CTAS.emailMyPlan.length).toBeGreaterThan(0);
    expect(RETAIL_CTAS.createAccountToSave.length).toBeGreaterThan(0);
    expect(RETAIL_CTAS.skipAndBrowse.length).toBeGreaterThan(0);
  });
});

// ── RETAIL_BLURBS ─────────────────────────────────────────────────────────────

describe("RETAIL_BLURBS", () => {
  it("savePlanPrompt is a non-empty string", () => {
    expect(RETAIL_BLURBS.savePlanPrompt.length).toBeGreaterThan(0);
  });

  it("savePlanSubtitle is a non-empty string", () => {
    expect(RETAIL_BLURBS.savePlanSubtitle.length).toBeGreaterThan(0);
  });

  it("yourQuotesTile and yourPlansTile are non-empty strings", () => {
    expect(RETAIL_BLURBS.yourQuotesTile.length).toBeGreaterThan(0);
    expect(RETAIL_BLURBS.yourPlansTile.length).toBeGreaterThan(0);
  });
});
