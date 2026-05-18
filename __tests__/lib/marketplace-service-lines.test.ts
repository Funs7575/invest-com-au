import { describe, expect, it } from "vitest";

import {
  SERVICE_LINES,
  getServiceLine,
  isHighLtvServiceLine,
  listServiceLines,
  serviceLinesForAdvisorSpecialties,
} from "@/lib/marketplace/service-lines";

describe("SERVICE_LINES taxonomy", () => {
  it("exports a non-empty list with unique slugs", () => {
    expect(SERVICE_LINES.length).toBeGreaterThan(0);
    const slugs = SERVICE_LINES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("includes the 4 canonical cross-border service lines", () => {
    const slugs = SERVICE_LINES.map((s) => s.slug);
    expect(slugs).toContain("uk-pension-transfer");
    expect(slugs).toContain("us-expat-tax");
    expect(slugs).toContain("firb-application");
    expect(slugs).toContain("non-resident-mortgage");
  });

  it("flags cross-border lines as highLtv", () => {
    expect(getServiceLine("uk-pension-transfer")?.highLtv).toBe(true);
    expect(getServiceLine("us-expat-tax")?.highLtv).toBe(true);
    expect(getServiceLine("firb-application")?.highLtv).toBe(true);
  });
});

describe("getServiceLine", () => {
  it("returns the line for a known slug", () => {
    expect(getServiceLine("smsf-setup")?.label).toContain("SMSF");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getServiceLine("not-a-real-slug")).toBeUndefined();
  });
});

describe("listServiceLines", () => {
  it("returns the same array as SERVICE_LINES", () => {
    expect(listServiceLines()).toEqual(SERVICE_LINES);
  });
});

describe("serviceLinesForAdvisorSpecialties", () => {
  it("returns empty when advisor has no matching specialties", () => {
    expect(serviceLinesForAdvisorSpecialties(["Random Other Specialty"])).toEqual([]);
  });

  it("returns SMSF setup for an SMSF Specialist", () => {
    const result = serviceLinesForAdvisorSpecialties(["SMSF Specialist"]);
    expect(result.map((r) => r.slug)).toContain("smsf-setup");
  });

  it("returns multiple lines when advisor has multiple matching specialties", () => {
    const result = serviceLinesForAdvisorSpecialties([
      "SMSF Specialist",
      "Tax Agent",
    ]);
    expect(result.length).toBeGreaterThan(1);
  });

  it("returns the cross-border line for the matching specialty", () => {
    const result = serviceLinesForAdvisorSpecialties(["UK Pension Transfer"]);
    expect(result.map((r) => r.slug)).toContain("uk-pension-transfer");
  });
});

describe("isHighLtvServiceLine", () => {
  it("returns true for cross-border slugs", () => {
    expect(isHighLtvServiceLine("uk-pension-transfer")).toBe(true);
    expect(isHighLtvServiceLine("firb-application")).toBe(true);
  });

  it("returns false for non-LTV slugs", () => {
    expect(isHighLtvServiceLine("super-consolidation")).toBe(false);
    expect(isHighLtvServiceLine("buyers-agent-residential")).toBe(false);
  });

  it("returns false for unknown slugs", () => {
    expect(isHighLtvServiceLine("not-a-real-slug")).toBe(false);
  });
});
