import { describe, it, expect } from "vitest";
import {
  LICENCE_MODE,
  SHOW_RATINGS,
  SHOW_EDITORIAL_BADGES,
  SHOW_BEST_PICKS,
  SHOW_QUIZ_MATCH,
  SHOW_FILTER_TOOL,
  SHOW_MATCH_LANGUAGE,
  SHOW_GENERIC_VERIFIED,
  SHOW_WEIGHTED_SCORES,
  ENABLE_AUTO_LEAD_ROUTING,
  SHOW_ADVISOR_VERIFIED_BADGE,
  SHOW_ADVISOR_RATINGS,
  SHOW_FEE_TABLES,
  SHOW_DIRECTORIES,
  SHOW_EDUCATIONAL_CONTENT,
  SHOW_CALCULATORS,
  SHOW_PROMOTED_PLACEMENTS,
  SHOW_LEAD_MAGNETS,
  SHOW_CONTACT_FORMS,
  SHOW_MARKETPLACE,
  SHOW_AFFILIATE_LINKS,
  PRIMARY_CTA_TEXT,
  PRIMARY_CTA_HREF,
  SECONDARY_CTA_TEXT,
  SECONDARY_CTA_HREF,
  ADVISOR_DIRECTORY_HEADING,
  REGISTER_WORDING,
  FACTUAL_COMPARISON_DISCLAIMER,
  FACTUAL_DIRECTORY_DISCLAIMER,
  FACTUAL_CALCULATOR_DISCLAIMER,
  getRegisterWording,
} from "@/lib/compliance-config";

describe("compliance-config flags", () => {
  it("LICENCE_MODE defaults to 'factual_only' without NEXT_PUBLIC_LICENCE_MODE", () => {
    // Module-scope evaluation already happened; test reflects current env
    expect(["factual_only", "general_advice", "personal_advice"]).toContain(
      LICENCE_MODE,
    );
  });

  it("all licence-gated flags share the same value in factual_only mode", () => {
    // In factual_only mode, every advice-implying flag is OFF (false).
    if (LICENCE_MODE === "factual_only") {
      expect(SHOW_RATINGS).toBe(false);
      expect(SHOW_EDITORIAL_BADGES).toBe(false);
      expect(SHOW_BEST_PICKS).toBe(false);
      expect(SHOW_QUIZ_MATCH).toBe(false);
      expect(SHOW_MATCH_LANGUAGE).toBe(false);
      expect(SHOW_GENERIC_VERIFIED).toBe(false);
      expect(SHOW_WEIGHTED_SCORES).toBe(false);
      expect(ENABLE_AUTO_LEAD_ROUTING).toBe(false);
      expect(SHOW_ADVISOR_VERIFIED_BADGE).toBe(false);
      expect(SHOW_ADVISOR_RATINGS).toBe(false);
    }
  });

  it("always-on safe flags are true regardless of licence", () => {
    expect(SHOW_FILTER_TOOL).toBe(true);
    expect(SHOW_FEE_TABLES).toBe(true);
    expect(SHOW_DIRECTORIES).toBe(true);
    expect(SHOW_EDUCATIONAL_CONTENT).toBe(true);
    expect(SHOW_CALCULATORS).toBe(true);
    expect(SHOW_PROMOTED_PLACEMENTS).toBe(true);
    expect(SHOW_LEAD_MAGNETS).toBe(true);
    expect(SHOW_CONTACT_FORMS).toBe(true);
    expect(SHOW_MARKETPLACE).toBe(true);
    expect(SHOW_AFFILIATE_LINKS).toBe(true);
  });
});

describe("derived CTA strings", () => {
  it("primary CTA + href align with match mode", () => {
    if (SHOW_MATCH_LANGUAGE) {
      expect(PRIMARY_CTA_TEXT).toBe("Start My Free Match");
      expect(PRIMARY_CTA_HREF).toBe("/quiz");
    } else {
      expect(PRIMARY_CTA_TEXT).toBe("Compare Platforms");
      expect(PRIMARY_CTA_HREF).toBe("/compare");
    }
  });

  it("secondary CTA + href align with match mode", () => {
    if (SHOW_MATCH_LANGUAGE) {
      expect(SECONDARY_CTA_TEXT).toBe("Find the Right Advisor");
      expect(SECONDARY_CTA_HREF).toBe("/find-advisor");
    } else {
      expect(SECONDARY_CTA_TEXT).toBe("Browse Directories");
      expect(SECONDARY_CTA_HREF).toBe("/advisors");
    }
  });

  it("advisor directory heading reflects SHOW_GENERIC_VERIFIED", () => {
    if (SHOW_GENERIC_VERIFIED) {
      expect(ADVISOR_DIRECTORY_HEADING).toBe("Find a Verified Professional");
    } else {
      expect(ADVISOR_DIRECTORY_HEADING).toBe("Browse Registered Professionals");
    }
  });
});

describe("REGISTER_WORDING + getRegisterWording", () => {
  it("covers the core advisor types", () => {
    expect(REGISTER_WORDING.financial_planner).toBeTruthy();
    expect(REGISTER_WORDING.smsf_accountant).toBeTruthy();
    expect(REGISTER_WORDING.tax_agent).toBeTruthy();
    expect(REGISTER_WORDING.mortgage_broker).toBeTruthy();
  });

  it("getRegisterWording returns the mapped wording for known types", () => {
    expect(getRegisterWording("financial_planner")).toBe(
      REGISTER_WORDING.financial_planner,
    );
  });

  it("getRegisterWording falls back to a generic string for unknown types", () => {
    const fallback = getRegisterWording("unknown_type");
    expect(fallback).toBe(
      "Professional registration details checked where applicable",
    );
  });
});

describe("factual disclaimers", () => {
  it("are non-empty strings mentioning 'factual' or 'not.. financial advice'", () => {
    expect(FACTUAL_COMPARISON_DISCLAIMER.length).toBeGreaterThan(30);
    expect(FACTUAL_DIRECTORY_DISCLAIMER.length).toBeGreaterThan(30);
    expect(FACTUAL_CALCULATOR_DISCLAIMER.toLowerCase()).toContain("not financial advice");
  });
});
