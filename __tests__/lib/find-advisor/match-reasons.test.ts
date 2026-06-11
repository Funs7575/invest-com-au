import { describe, it, expect } from "vitest";
import {
  buildMatchReasons,
  matchedSpecialties,
  type ReasonAdvisor,
  type ReasonQuizInput,
} from "@/lib/find-advisor/match-reasons";

const FLAGS_ALL = { showRatings: true, showVerifiedBadge: true };
const FLAGS_FACTUAL = { showRatings: false, showVerifiedBadge: false };

function advisor(overrides: Partial<ReasonAdvisor> = {}): ReasonAdvisor {
  return {
    type: "smsf_accountant",
    specialties: ["SMSF Setup", "Tax Planning"],
    location_display: "Sydney, NSW",
    location_state: "NSW",
    rating: 4.8,
    review_count: 23,
    verified: true,
    avg_response_minutes: 45,
    available_in_countries: ["gb"],
    ...overrides,
  };
}

function input(overrides: Partial<ReasonQuizInput> = {}): ReasonQuizInput {
  return {
    intent: "business_tax",
    context: ["smsf_setup"],
    state: "NSW",
    overseasCountryName: null,
    overseasCountryIso: null,
    ...overrides,
  };
}

describe("matchedSpecialties", () => {
  it("connects context ids to specialty strings by keyword", () => {
    expect(matchedSpecialties(["smsf_setup"], ["SMSF Setup", "Estate Planning"])).toEqual(["SMSF Setup"]);
    expect(matchedSpecialties(["crypto_tax"], ["Crypto Tax Returns"])).toEqual(["Crypto Tax Returns"]);
  });

  it("returns nothing for not-sure or empty inputs", () => {
    expect(matchedSpecialties(["not_sure"], ["SMSF Setup"])).toEqual([]);
    expect(matchedSpecialties([], ["SMSF Setup"])).toEqual([]);
    expect(matchedSpecialties(["smsf_setup"], null)).toEqual([]);
  });
});

describe("buildMatchReasons", () => {
  it("leads with the specialty that matches the user's stated need", () => {
    const reasons = buildMatchReasons(input(), advisor(), FLAGS_ALL);
    expect(reasons[0]).toContain("SMSF Setup");
    expect(reasons[0]).toContain("setting up an SMSF");
  });

  it("always returns 3–4 bullets", () => {
    const minimal = advisor({
      specialties: [],
      location_display: null,
      rating: 0,
      review_count: 0,
      verified: false,
      avg_response_minutes: null,
    });
    const reasons = buildMatchReasons(input(), minimal, FLAGS_FACTUAL);
    expect(reasons.length).toBeGreaterThanOrEqual(3);
    expect(reasons.length).toBeLessThanOrEqual(4);
    const rich = buildMatchReasons(input(), advisor(), FLAGS_ALL);
    expect(rich.length).toBeLessThanOrEqual(4);
  });

  it("falls back to a professional-type bullet when no specialty matches", () => {
    const reasons = buildMatchReasons(
      input({ context: ["debt_restructure"] }),
      advisor({ specialties: ["Estate Planning"] }),
      FLAGS_ALL,
    );
    expect(reasons[0]).toContain("Smsf Accountant");
    expect(reasons[0]).toContain("restructuring business debt");
  });

  it("marks same-state advisors as local and cross-state as remote", () => {
    const local = buildMatchReasons(input(), advisor(), FLAGS_ALL);
    expect(local.join(" ")).toContain("local to NSW");

    const remote = buildMatchReasons(input({ state: "WA" }), advisor(), FLAGS_ALL);
    expect(remote.join(" ")).toContain("works with clients remotely");
  });

  it("includes the corridor bullet only when the advisor serves the user's country", () => {
    const overseas = input({
      state: "",
      overseasCountryName: "the UK",
      overseasCountryIso: "GB",
    });
    const serves = buildMatchReasons(overseas, advisor(), FLAGS_ALL);
    expect(serves.join(" ")).toContain("clients based in the UK");

    const doesNot = buildMatchReasons(
      overseas,
      advisor({ available_in_countries: ["sg"] }),
      FLAGS_ALL,
    );
    expect(doesNot.join(" ")).not.toContain("clients based in the UK");
  });

  it("suppresses rating and verification bullets in factual-only mode", () => {
    const reasons = buildMatchReasons(input(), advisor(), FLAGS_FACTUAL);
    const joined = reasons.join(" ");
    expect(joined).not.toMatch(/Rated [\d.]+\/5/);
    expect(joined).not.toContain("verified by our team");
  });

  it("shows the rating bullet when allowed and rating is strong", () => {
    const reasons = buildMatchReasons(input(), advisor(), FLAGS_ALL);
    expect(reasons.join(" ")).toContain("Rated 4.8/5 across 23 reviews");
  });

  it("mentions sub-hour responsiveness", () => {
    const reasons = buildMatchReasons(input(), advisor({ avg_response_minutes: 30 }), FLAGS_ALL);
    expect(reasons.join(" ")).toContain("under an hour");
  });

  it("never fabricates: bullets only reference real attributes", () => {
    const bare = advisor({
      specialties: null,
      location_display: null,
      rating: 0,
      review_count: 0,
      verified: false,
      avg_response_minutes: null,
      available_in_countries: null,
    });
    const reasons = buildMatchReasons(input({ context: ["not_sure"] }), bare, FLAGS_ALL);
    const joined = reasons.join(" ");
    expect(joined).not.toContain("Specialises in");
    expect(joined).not.toContain("Based in");
    expect(joined).not.toMatch(/Rated/);
  });
});
