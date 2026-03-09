import { describe, it, expect } from "vitest";
import {
  ADVERTISER_DISCLOSURE,
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
  CRYPTO_WARNING,
  CFD_WARNING,
  CFD_WARNING_SHORT,
  SPONSORED_DISCLOSURE,
  RISK_WARNING_CTA,
  PDS_CONSIDERATION,
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
  REGULATORY_NOTE,
  SUPER_WARNING,
  SUPER_WARNING_SHORT,
  AFCA_REFERENCE,
  CHESS_EXPLANATION,
} from "@/lib/compliance";

describe("compliance constants", () => {
  it("all key exports are non-empty strings", () => {
    const exports = [
      ADVERTISER_DISCLOSURE,
      ADVERTISER_DISCLOSURE_SHORT,
      GENERAL_ADVICE_WARNING,
      CRYPTO_WARNING,
      CFD_WARNING,
      CFD_WARNING_SHORT,
      SPONSORED_DISCLOSURE,
      RISK_WARNING_CTA,
      PDS_CONSIDERATION,
      COMPANY_LEGAL_NAME,
      COMPANY_ACN,
      COMPANY_ABN,
      REGULATORY_NOTE,
      SUPER_WARNING,
      SUPER_WARNING_SHORT,
      AFCA_REFERENCE,
      CHESS_EXPLANATION,
    ];

    exports.forEach((val) => {
      expect(typeof val).toBe("string");
      expect(val.length).toBeGreaterThan(0);
    });
  });

  it("ADVERTISER_DISCLOSURE contains 'compensation'", () => {
    expect(ADVERTISER_DISCLOSURE.toLowerCase()).toContain("compensation");
  });

  it("CRYPTO_WARNING contains 'speculative'", () => {
    expect(CRYPTO_WARNING.toLowerCase()).toContain("speculative");
  });

  it("CFD_WARNING is non-empty and mentions risk", () => {
    expect(CFD_WARNING.length).toBeGreaterThan(0);
    expect(CFD_WARNING.toLowerCase()).toContain("risk");
    expect(CFD_WARNING).toContain("62%");
  });

  it("GENERAL_ADVICE_WARNING contains disclaimer language", () => {
    expect(GENERAL_ADVICE_WARNING.toLowerCase()).toContain(
      "not financial advice"
    );
  });

  it("SUPER_WARNING mentions insurance cover", () => {
    expect(SUPER_WARNING.toLowerCase()).toContain("insurance");
  });

  it("REGULATORY_NOTE contains company legal name", () => {
    expect(REGULATORY_NOTE).toContain(COMPANY_LEGAL_NAME);
    expect(REGULATORY_NOTE).toContain(COMPANY_ACN);
  });
});
