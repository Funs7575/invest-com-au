import { describe, it, expect } from "vitest";
import {
  computeIdealClientBoost,
  computeAdvisorProfileMatch,
  type UserMatchProfile,
  type AdvisorMatchProfile,
  type IdealClientCriteria,
} from "@/lib/advisor-profile-match";

// advisor-profile-match.ts is a pure module with no imports / no I/O — no mocks required.

function baseUser(overrides: Partial<UserMatchProfile> = {}): UserMatchProfile {
  return {
    primary_vertical: null,
    budget_band: null,
    is_fhb: false,
    is_hnw: false,
    is_pre_retiree: false,
    experience_level: null,
    location_state: null,
    ...overrides,
  };
}

function baseAdvisor(overrides: Partial<AdvisorMatchProfile> = {}): AdvisorMatchProfile {
  return {
    id: 1,
    specialties: [],
    min_investment_cents: null,
    minimum_investment_cents: null,
    location_state: null,
    office_states: null,
    accepts_new_clients: true,
    advisor_tier: null,
    rating: null,
    review_count: null,
    ...overrides,
  };
}

describe("computeIdealClientBoost", () => {
  it("returns 0 when criteria is null", () => {
    expect(computeIdealClientBoost(baseUser(), null)).toBe(0);
  });

  it("returns 0 when criteria is undefined", () => {
    expect(computeIdealClientBoost(baseUser(), undefined)).toBe(0);
  });

  it("returns 0 for an empty criteria object (no arrays -> checks === 0)", () => {
    expect(computeIdealClientBoost(baseUser(), {})).toBe(0);
  });

  it("returns 0 when all criteria arrays are present but empty (length > 0 guard skips them)", () => {
    const criteria: IdealClientCriteria = {
      verticals: [],
      budget_bands: [],
      archetypes: [],
      experience_levels: [],
    };
    expect(computeIdealClientBoost(baseUser({ primary_vertical: "shares" }), criteria)).toBe(0);
  });

  it("returns 10 when the only criterion (verticals) fully matches: round(1/1*10)", () => {
    const criteria: IdealClientCriteria = { verticals: ["shares"] };
    expect(
      computeIdealClientBoost(baseUser({ primary_vertical: "shares" }), criteria),
    ).toBe(10);
  });

  it("returns 5 on a 2-of-4 partial match: round(2/4*10)", () => {
    // verticals + budget_bands match (2 hits), archetypes + experience_levels set but no match (2 misses)
    const criteria: IdealClientCriteria = {
      verticals: ["shares"],
      budget_bands: ["100k_250k"],
      archetypes: ["hnw"],
      experience_levels: ["expert"],
    };
    const user = baseUser({
      primary_vertical: "shares",
      budget_band: "100k_250k",
      // not hnw, experience_level "beginner" -> two misses
      experience_level: "beginner",
    });
    expect(computeIdealClientBoost(user, criteria)).toBe(5);
  });

  it("matches archetypes via is_fhb -> 'fhb'", () => {
    const criteria: IdealClientCriteria = { archetypes: ["fhb"] };
    expect(computeIdealClientBoost(baseUser({ is_fhb: true }), criteria)).toBe(10);
  });

  it("matches archetypes via is_hnw -> 'hnw'", () => {
    const criteria: IdealClientCriteria = { archetypes: ["hnw"] };
    expect(computeIdealClientBoost(baseUser({ is_hnw: true }), criteria)).toBe(10);
  });

  it("matches archetypes via is_pre_retiree -> 'pre_retiree'", () => {
    const criteria: IdealClientCriteria = { archetypes: ["pre_retiree"] };
    expect(computeIdealClientBoost(baseUser({ is_pre_retiree: true }), criteria)).toBe(10);
  });

  it("counts an archetype check but scores no match when no archetype flag is set", () => {
    const criteria: IdealClientCriteria = { archetypes: ["fhb", "hnw"] };
    // no flags set -> userArchetypes is empty -> no match -> round(0/1*10) === 0
    expect(computeIdealClientBoost(baseUser(), criteria)).toBe(0);
  });

  it("counts a check but no match when the user field is null while the criteria array is non-empty", () => {
    const criteria: IdealClientCriteria = { verticals: ["shares"] };
    // primary_vertical null -> check counted, no match
    expect(computeIdealClientBoost(baseUser({ primary_vertical: null }), criteria)).toBe(0);
  });

  it("matches experience_levels when the user level is included", () => {
    const criteria: IdealClientCriteria = { experience_levels: ["expert", "intermediate"] };
    expect(
      computeIdealClientBoost(baseUser({ experience_level: "expert" }), criteria),
    ).toBe(10);
  });

  it("matches budget_bands when the user band is included", () => {
    const criteria: IdealClientCriteria = { budget_bands: ["1m_5m"] };
    expect(
      computeIdealClientBoost(baseUser({ budget_band: "1m_5m" }), criteria),
    ).toBe(10);
  });
});

describe("computeAdvisorProfileMatch", () => {
  it("parses specialties from a JSON string via toSpecialtiesArray", () => {
    const user = baseUser({ primary_vertical: "smsf" });
    const advisor = baseAdvisor({ specialties: '["smsf"]' });
    // vertical match (+40) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 75
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(75);
  });

  it("treats a malformed specialties string as a single-element array [string]", () => {
    const user = baseUser({ primary_vertical: "smsf" });
    // not valid JSON -> [ "smsf, retirement" ] -> includes("smsf") matches via substring
    const advisor = baseAdvisor({ specialties: "smsf, retirement" });
    // vertical substring match (+40) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 75
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(75);
  });

  it("awards generalist +20 when no vertical and no specialties", () => {
    const user = baseUser(); // no vertical
    const advisor = baseAdvisor({ specialties: [] });
    // no vertical & no specialties (+20) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 55
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(55);
  });

  it("awards minInvest == null the +20 accessible bonus", () => {
    const user = baseUser({ primary_vertical: "shares", budget_band: "100k_250k" });
    const advisor = baseAdvisor({
      specialties: ["shares"],
      min_investment_cents: null,
      minimum_investment_cents: null,
    });
    // vertical (+40) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 75
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(75);
  });

  it("awards budget partial +15 when minInvest is above budget but <= midpoint*2", () => {
    // budget_band 100k_250k -> midpoint 175_000_00; midpoint*2 = 350_000_00
    const user = baseUser({ primary_vertical: "shares", budget_band: "100k_250k" });
    const advisor = baseAdvisor({
      specialties: ["shares"],
      min_investment_cents: 300_000_00, // > midpoint, <= midpoint*2
    });
    // vertical (+40) + budget partial (+15) + archetype floor (+10) + no location (+5) = 70
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(70);
  });

  it("awards full budget +30 when minInvest <= midpoint", () => {
    const user = baseUser({ primary_vertical: "shares", budget_band: "100k_250k" });
    const advisor = baseAdvisor({
      specialties: ["shares"],
      min_investment_cents: 100_000_00, // <= midpoint 175_000_00
    });
    // vertical (+40) + budget (+30) + archetype floor (+10) + no location (+5) = 85
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(85);
  });

  it("applies the archetype floor (+10) when archetypeScore === 0", () => {
    const user = baseUser({ primary_vertical: "shares" }); // no archetype flags
    const advisor = baseAdvisor({ specialties: ["shares"] });
    // vertical (+40) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 75
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(75);
  });

  it("uses office_states for the +10 location overlap (overrides location_state)", () => {
    const user = baseUser({ primary_vertical: "shares", location_state: "NSW" });
    const advisor = baseAdvisor({
      specialties: ["shares"],
      office_states: ["nsw", "vic"], // case-insensitive overlap
      location_state: "QLD", // ignored because office_states is present
    });
    // vertical (+40) + minInvest null (+20) + archetype floor (+10) + location (+10) = 80
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(80);
  });

  it("falls back to location_state when office_states is null", () => {
    const user = baseUser({ primary_vertical: "shares", location_state: "QLD" });
    const advisor = baseAdvisor({
      specialties: ["shares"],
      office_states: null,
      location_state: "QLD",
    });
    // vertical (+40) + minInvest null (+20) + archetype floor (+10) + location (+10) = 80
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(80);
  });

  it("gives +5 half-credit location when the user location_state is null", () => {
    const user = baseUser({ primary_vertical: "shares", location_state: null });
    const advisor = baseAdvisor({ specialties: ["shares"], office_states: ["nsw"] });
    // vertical (+40) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 75
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(75);
  });

  it("caps the final result at 100 even with a high score plus ideal-client boost", () => {
    // Maximise the base score, then add a boost; result must stay <= 100.
    const user = baseUser({
      primary_vertical: "smsf",
      budget_band: "100k_250k",
      is_hnw: true,
      location_state: "NSW",
      experience_level: "expert",
    });
    const advisor = baseAdvisor({
      specialties: ["smsf", "hnw"], // vertical match + hnw archetype
      min_investment_cents: 100_000_00, // <= midpoint -> +30
      office_states: ["nsw"],
    });
    const criteria: IdealClientCriteria = {
      verticals: ["smsf"],
      budget_bands: ["100k_250k"],
      archetypes: ["hnw"],
      experience_levels: ["expert"],
    };
    // base: vertical 40 + budget 30 + archetype(hnw=10) + location 10 = 90; boost = 10 -> 100 capped
    const result = computeAdvisorProfileMatch(user, advisor, criteria);
    expect(result).toBe(100);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("awards partial +8 specialty credit when a vertical is set but no specialty matches", () => {
    const user = baseUser({ primary_vertical: "crypto" });
    const advisor = baseAdvisor({ specialties: ["shares", "bonds"] });
    // no match but specialties present (+8) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 43
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(43);
  });

  it("awards neutral +15 when no vertical is set but the advisor lists specialties", () => {
    const user = baseUser({ primary_vertical: null });
    const advisor = baseAdvisor({ specialties: ["shares"] });
    // no vertical but specialties present (+15) + minInvest null (+20) + archetype floor (+10) + no location (+5) = 50
    expect(computeAdvisorProfileMatch(user, advisor)).toBe(50);
  });
});
