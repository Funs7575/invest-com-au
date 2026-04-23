import { describe, it, expect } from "vitest";
import {
  ADVISOR_GUIDES,
  getAdvisorGuide,
  getAllAdvisorGuideSlugs,
} from "@/lib/advisor-guides";

describe("ADVISOR_GUIDES", () => {
  it("has multiple guides", () => {
    expect(ADVISOR_GUIDES.length).toBeGreaterThan(3);
  });

  it("every guide has all required shape fields", () => {
    for (const g of ADVISOR_GUIDES) {
      expect(g.slug).toBeTruthy();
      expect(g.type).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.metaDescription).toBeTruthy();
      expect(g.intro).toBeTruthy();
      expect(Array.isArray(g.sections)).toBe(true);
      expect(g.sections.length).toBeGreaterThan(0);
      expect(Array.isArray(g.checklist)).toBe(true);
      expect(Array.isArray(g.redFlags)).toBe(true);
      expect(Array.isArray(g.faqs)).toBe(true);
    }
  });

  it("slugs are url-safe + globally unique", () => {
    const slugs = ADVISOR_GUIDES.map((g) => g.slug);
    for (const s of slugs) {
      expect(s).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    }
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every section has heading + body", () => {
    for (const g of ADVISOR_GUIDES) {
      for (const s of g.sections) {
        expect(s.heading).toBeTruthy();
        expect(s.body.length).toBeGreaterThan(20);
      }
    }
  });

  it("every faq has q + a", () => {
    for (const g of ADVISOR_GUIDES) {
      for (const f of g.faqs) {
        expect(f.q).toBeTruthy();
        expect(f.a).toBeTruthy();
      }
    }
  });
});

describe("getAdvisorGuide", () => {
  it("returns undefined for unknown slug", () => {
    expect(getAdvisorGuide("not-a-guide")).toBeUndefined();
  });

  it("returns the matching guide", () => {
    const smsf = getAdvisorGuide("how-to-choose-smsf-accountant");
    expect(smsf?.type).toBe("smsf_accountant");
  });
});

describe("getAllAdvisorGuideSlugs", () => {
  it("matches ADVISOR_GUIDES.map(g => g.slug)", () => {
    expect(getAllAdvisorGuideSlugs()).toEqual(ADVISOR_GUIDES.map((g) => g.slug));
  });
});
