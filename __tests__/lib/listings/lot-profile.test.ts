import { describe, it, expect } from "vitest";
import { buildLotProfile, hasPaperTrail } from "@/lib/listings/lot-profile";

describe("buildLotProfile", () => {
  it("returns an empty profile for null/undefined/empty key_metrics", () => {
    for (const km of [null, undefined, {}]) {
      const profile = buildLotProfile(km);
      expect(profile.facts).toEqual([]);
      expect(profile.paperTrail).toEqual([]);
      expect(profile.provenanceEvents).toEqual([]);
      expect(profile.documents).toEqual([]);
      expect(profile.comparables).toEqual([]);
      expect(profile.holdingCosts).toEqual([]);
      expect(profile.timeToSell).toBeUndefined();
      expect(hasPaperTrail(profile)).toBe(false);
    }
  });

  it("folds doc-ish scalar keys into the paper trail (seed-row shape)", () => {
    // Mirrors the collectibles seed rows (GT-HO Phase III).
    const profile = buildLotProfile({
      year: 1971,
      make: "Ford",
      model: "Falcon GTHO Phase III",
      matching_numbers: true,
      transmission: "4-speed manual",
      provenance: "full build sheet and ownership history",
      documentation: "books and history file",
    });

    const trailLabels = profile.paperTrail.map((f) => f.label);
    expect(trailLabels).toContain("Provenance");
    expect(trailLabels).toContain("Documentation");
    expect(trailLabels).toContain("Matching Numbers");
    expect(
      profile.paperTrail.find((f) => f.label === "Matching Numbers")?.detail,
    ).toBe("Yes");

    // Doc-ish keys must NOT also appear in the fact grid.
    const factKeys = profile.facts.map((f) => f.key);
    expect(factKeys).not.toContain("provenance");
    expect(factKeys).not.toContain("documentation");
    expect(factKeys).not.toContain("matching_numbers");
    expect(factKeys).toContain("make");
    expect(factKeys).toContain("transmission");

    expect(hasPaperTrail(profile)).toBe(true);
  });

  it("surfaces km.stage as a leading fact despite the card skip-list", () => {
    const profile = buildLotProfile({
      stage: "pre_construction",
      hectares: 412,
    });
    expect(profile.facts[0]).toEqual({
      key: "stage",
      label: "Stage",
      value: "Pre Construction",
    });
    // Still absent when the row has no stage.
    const noStage = buildLotProfile({ hectares: 412 });
    expect(noStage.facts.map((f) => f.key)).not.toContain("stage");
  });

  it("parses structured modules and excludes them from facts", () => {
    const profile = buildLotProfile({
      hectares: 412,
      provenance_events: [
        { year: 2019, label: "Acquired", detail: "Private treaty" },
        { when: "2022", label: "Irrigation upgrade" },
      ],
      documents: [
        { name: "Independent valuation", status: "verified" },
        { name: "Water licence", status: "pending" },
        { name: "Soil report" },
      ],
      comparable_sales: [
        { label: "380ha Riverina aggregation", price: "$3.8M", when: "Nov 2025" },
      ],
      holding_costs: [{ label: "Council rates", amount: "$11,200/yr" }],
      typical_time_to_sell: "6-18 months",
      liquidity_note: "Sells on a seasonal clock.",
    });

    expect(profile.provenanceEvents).toHaveLength(2);
    expect(profile.provenanceEvents[0]?.when).toBe("2019");
    expect(profile.provenanceEvents[1]?.when).toBe("2022");
    expect(profile.documents).toHaveLength(3);
    expect(profile.documents[0]?.status).toBe("verified");
    expect(profile.documents[2]?.status).toBe("provided");
    expect(profile.comparables[0]?.price).toBe("$3.8M");
    expect(profile.holdingCosts[0]?.amount).toBe("$11,200/yr");
    expect(profile.timeToSell).toBe("6-18 months");
    expect(profile.liquidityNote).toBe("Sells on a seasonal clock.");

    const factKeys = profile.facts.map((f) => f.key);
    expect(factKeys).toEqual(["hectares"]);
  });

  it("drops malformed structured entries instead of throwing", () => {
    const profile = buildLotProfile({
      provenance_events: [
        { label: "Valid event" },
        { detail: "no label" },
        "just a string",
        42,
        null,
      ],
      documents: [{ status: "verified" }, { name: "Title search" }],
      comparable_sales: "not an array",
      holding_costs: [{ amount: "$1" }],
    });

    expect(profile.provenanceEvents).toHaveLength(1);
    expect(profile.provenanceEvents[0]?.label).toBe("Valid event");
    expect(profile.documents).toHaveLength(1);
    expect(profile.documents[0]?.name).toBe("Title search");
    expect(profile.comparables).toEqual([]);
    expect(profile.holdingCosts).toEqual([]);
  });

  it("coerces invalid document status to 'provided'", () => {
    const profile = buildLotProfile({
      documents: [{ name: "Survey", status: "notarised" }],
    });
    expect(profile.documents[0]?.status).toBe("provided");
  });

  it("ignores non-string typical_time_to_sell shapes", () => {
    const profile = buildLotProfile({ typical_time_to_sell: { weird: true } });
    expect(profile.timeToSell).toBeUndefined();
  });
});
