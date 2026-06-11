import { describe, it, expect } from "vitest";

import {
  deepLinkPrefill,
  helpSubForSpecialty,
  countryOfResidenceForParam,
} from "@/lib/getmatched/deep-link-prefill";

// The /find-advisor → /get-matched fold-in: ?specialty= / ?country= deep
// links (forwarded through the redirect, query preserved) must translate
// into a start prefill the engine already routes on.

describe("helpSubForSpecialty", () => {
  it("maps the four cross-border specialties to a help_sub", () => {
    expect(helpSubForSpecialty("UK Pension Transfer")).toBe("financial_planner");
    expect(helpSubForSpecialty("FATCA-Aware US Expat Planning")).toBe("tax_agent");
    expect(helpSubForSpecialty("DASP Processing")).toBe("tax_agent");
    expect(helpSubForSpecialty("FIRB Property (Non-Resident)")).toBe("buyers_agent");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(helpSubForSpecialty("  uk pension transfer  ")).toBe("financial_planner");
    expect(helpSubForSpecialty("MORTGAGE")).toBe("mortgage_broker");
  });

  it("returns null for empty / unmapped specialties", () => {
    expect(helpSubForSpecialty(null)).toBeNull();
    expect(helpSubForSpecialty(undefined)).toBeNull();
    expect(helpSubForSpecialty("")).toBeNull();
    expect(helpSubForSpecialty("wholesale_investor_certification")).toBeNull();
  });
});

describe("countryOfResidenceForParam", () => {
  it("resolves foreign-investment folder slugs to the engine quizKey", () => {
    expect(countryOfResidenceForParam("united-kingdom")).toBe("uk");
    expect(countryOfResidenceForParam("hong-kong")).toBe("hong_kong");
    expect(countryOfResidenceForParam("united-states")).toBe("usa");
  });

  it("resolves ISO alpha-2 codes (incl. GB→uk) case-insensitively", () => {
    expect(countryOfResidenceForParam("gb")).toBe("uk");
    expect(countryOfResidenceForParam("HK")).toBe("hong_kong");
    expect(countryOfResidenceForParam("us")).toBe("usa");
    expect(countryOfResidenceForParam("in")).toBe("india");
  });

  it("passes through an already-canonical quizKey", () => {
    expect(countryOfResidenceForParam("uk")).toBe("uk");
    expect(countryOfResidenceForParam("hong_kong")).toBe("hong_kong");
  });

  it("returns null for unknown / empty values", () => {
    expect(countryOfResidenceForParam(null)).toBeNull();
    expect(countryOfResidenceForParam("")).toBeNull();
    expect(countryOfResidenceForParam("atlantis")).toBeNull();
  });
});

describe("deepLinkPrefill", () => {
  it("specialty → intent:help + help_sub", () => {
    expect(deepLinkPrefill({ specialty: "UK Pension Transfer" })).toEqual({
      intent: "help",
      help_sub: "financial_planner",
    });
  });

  it("an unmapped specialty still lands in the advisor lane (intent:help, no sub)", () => {
    expect(deepLinkPrefill({ specialty: "wholesale_investor_certification" })).toEqual({
      intent: "help",
    });
  });

  it("country → starting_point:overseas + country_of_residence", () => {
    expect(deepLinkPrefill({ country: "united-kingdom" })).toEqual({
      starting_point: "overseas",
      country_of_residence: "uk",
    });
  });

  it("combines specialty + country (the full cross-border deep link)", () => {
    expect(
      deepLinkPrefill({ specialty: "FIRB Property (Non-Resident)", country: "hk" }),
    ).toEqual({
      intent: "help",
      help_sub: "buyers_agent",
      starting_point: "overseas",
      country_of_residence: "hong_kong",
    });
  });

  it("returns an empty object when neither param carries a signal", () => {
    expect(deepLinkPrefill({})).toEqual({});
    expect(deepLinkPrefill({ specialty: "", country: "atlantis" })).toEqual({});
  });
});
