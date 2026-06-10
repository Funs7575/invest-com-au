import { describe, it, expect } from "vitest";
import { describeIdealClientCriteria } from "@/lib/ideal-client-display";

describe("describeIdealClientCriteria", () => {
  it("returns empty for null/undefined/empty criteria", () => {
    expect(describeIdealClientCriteria(null)).toEqual([]);
    expect(describeIdealClientCriteria(undefined)).toEqual([]);
    expect(describeIdealClientCriteria({})).toEqual([]);
  });

  it("maps every known vocabulary value to plain English", () => {
    const groups = describeIdealClientCriteria({
      verticals: ["property", "smsf"],
      budget_bands: ["250k_500k", "5m_plus"],
      archetypes: ["fhb", "hnw", "pre_retiree", "business_owner"],
      experience_levels: ["beginner", "advanced"],
    });

    expect(groups).toHaveLength(4);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.values]));
    expect(byKey.archetypes).toEqual([
      "First home buyers",
      "High-net-worth investors",
      "Pre-retirees",
      "Business owners",
    ]);
    expect(byKey.verticals).toEqual(["Property investors", "SMSF trustees"]);
    expect(byKey.budget_bands).toEqual(["$250k–$500k", "$5m+"]);
    expect(byKey.experience_levels).toEqual(["New investors", "Experienced investors"]);
  });

  it("renders client types before focus areas (fixed group order)", () => {
    const groups = describeIdealClientCriteria({
      verticals: ["etf"],
      archetypes: ["hnw"],
    });
    expect(groups.map((g) => g.key)).toEqual(["archetypes", "verticals"]);
  });

  it("drops unknown vocabulary values instead of rendering raw tokens", () => {
    const groups = describeIdealClientCriteria({
      verticals: ["property", "made_up_vertical"],
      budget_bands: ["not_a_band"],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.values).toEqual(["Property investors"]);
  });

  it("omits groups whose values are all empty", () => {
    const groups = describeIdealClientCriteria({ verticals: [], archetypes: ["fhb"] });
    expect(groups.map((g) => g.key)).toEqual(["archetypes"]);
  });
});
