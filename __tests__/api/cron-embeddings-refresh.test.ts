import { describe, it, expect } from "vitest";

import { buildAdvisorEmbedText } from "@/app/api/cron/embeddings-refresh/route";

describe("buildAdvisorEmbedText", () => {
  it("returns name + firm + bio for a minimal row", () => {
    const out = buildAdvisorEmbedText({
      name: "Jane Smith",
      firm_name: "Smith Wealth",
      bio: "20 years advising Sydney professionals.",
    });
    expect(out).toContain("Jane Smith");
    expect(out).toContain("Smith Wealth");
    expect(out).toContain("20 years advising Sydney professionals.");
  });

  it("includes specialties, qualifications, languages from jsonb arrays", () => {
    const out = buildAdvisorEmbedText({
      name: "Test Advisor",
      specialties: ["SMSF", "Retirement Planning"],
      qualifications: ["CFP", "Diploma of Financial Planning"],
      languages: ["English", "Mandarin"],
    });
    expect(out).toContain("Specialties: SMSF, Retirement Planning");
    expect(out).toContain("Qualifications: CFP, Diploma of Financial Planning");
    expect(out).toContain("Languages: English, Mandarin");
  });

  it("handles jsonb arrays of {label} objects", () => {
    const out = buildAdvisorEmbedText({
      name: "Test",
      specialties: [{ label: "FATCA-Aware US Expat Planning" }, { label: "DASP Processing" }],
    });
    expect(out).toContain("FATCA-Aware US Expat Planning");
    expect(out).toContain("DASP Processing");
  });

  it("includes fees, location, ideal_client, years_experience", () => {
    const out = buildAdvisorEmbedText({
      name: "Test",
      fee_structure: "flat-fee",
      fee_description: "$2,500 initial + $1,200/yr ongoing",
      location_display: "Brisbane, QLD",
      ideal_client: "Pre-retiree with $500k+ super balance",
      years_experience: 15,
    });
    expect(out).toContain("Fees: flat-fee — $2,500 initial + $1,200/yr ongoing");
    expect(out).toContain("Location: Brisbane, QLD");
    expect(out).toContain("Ideal client: Pre-retiree with $500k+ super balance");
    expect(out).toContain("Experience: 15 years");
  });

  it("normalises type underscores to spaces", () => {
    const out = buildAdvisorEmbedText({ name: "Test", type: "private_wealth_manager" });
    expect(out).toContain("private wealth manager");
    expect(out).not.toContain("private_wealth_manager");
  });

  it("skips empty / null fields gracefully", () => {
    const out = buildAdvisorEmbedText({
      name: "Test",
      firm_name: null,
      bio: "",
      specialties: null as unknown,
      qualifications: undefined,
      fee_structure: null,
      fee_description: null,
      location_display: null,
      ideal_client: "",
      years_experience: 0,
    });
    expect(out).toBe("Test");
  });

  it("caps output at 8000 chars to bound token cost", () => {
    const out = buildAdvisorEmbedText({
      name: "Test",
      bio: "x".repeat(20_000),
    });
    expect(out.length).toBeLessThanOrEqual(8000);
  });

  it("a query-shaped string about a Brisbane SMSF flat-fee advisor would now hit on those tokens", () => {
    // Sanity: the keywords a user would type are present in the chunk.
    const out = buildAdvisorEmbedText({
      name: "Casey Lin",
      type: "financial_planner",
      bio: "Helping SMSF trustees navigate compliance.",
      specialties: ["SMSF strategy", "Pension transfer"],
      languages: ["English", "Mandarin"],
      fee_structure: "flat-fee",
      location_display: "Brisbane, QLD",
    });
    for (const token of ["Brisbane", "SMSF", "flat-fee", "Mandarin", "financial planner"]) {
      expect(out.toLowerCase()).toContain(token.toLowerCase());
    }
  });
});
