import { describe, it, expect } from "vitest";
import {
  VERIFICATION_CONFIGS,
  STATE_FAIR_TRADING_URLS,
  getVerificationConfig,
  getVerificationLinks,
} from "@/lib/advisor-verification";

describe("VERIFICATION_CONFIGS", () => {
  const types = Object.keys(VERIFICATION_CONFIGS) as Array<
    keyof typeof VERIFICATION_CONFIGS
  >;

  it("covers multiple professional types", () => {
    expect(types.length).toBeGreaterThan(10);
  });

  it("every config has a populated primaryLicence + qualifications + disclosure", () => {
    for (const t of types) {
      const c = VERIFICATION_CONFIGS[t];
      expect(c.primaryLicence).toBeDefined();
      expect(c.primaryLicence.code).toBeTruthy();
      expect(c.primaryLicence.name).toBeTruthy();
      expect(c.primaryLicence.regulator).toBeTruthy();
      expect(c.qualifications.length).toBeGreaterThan(0);
      expect(c.insurance).toBeTruthy();
      expect(c.edr).toBeTruthy();
      expect(c.disclosure).toBeTruthy();
    }
  });

  it("type field in config matches the map key", () => {
    for (const t of types) {
      expect(VERIFICATION_CONFIGS[t].type).toBe(t);
    }
  });

  it("associations arrays have name/acronym/url", () => {
    for (const t of types) {
      for (const a of VERIFICATION_CONFIGS[t].associations) {
        expect(a.name).toBeTruthy();
        expect(a.acronym).toBeTruthy();
        expect(a.url).toMatch(/^https?:\/\//);
      }
    }
  });
});

describe("STATE_FAIR_TRADING_URLS", () => {
  it("covers all 8 AU states/territories", () => {
    for (const state of ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]) {
      expect(
        STATE_FAIR_TRADING_URLS[state],
        `missing ${state}`,
      ).toBeDefined();
      expect(STATE_FAIR_TRADING_URLS[state]!.url).toMatch(/^https?:\/\//);
    }
  });
});

describe("getVerificationConfig", () => {
  it("returns the matching config", () => {
    const planner = getVerificationConfig("financial_planner");
    expect(planner.type).toBe("financial_planner");
    expect(planner.primaryLicence.code).toBe("AFSL");
  });
});

describe("getVerificationLinks", () => {
  it("includes the primary licence verify URL when populated", () => {
    const links = getVerificationLinks("financial_planner");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.url).toMatch(/^https?:\/\//);
    expect(links[0]?.regulator).toBe("ASIC");
  });

  it("omits links when verifyUrl is empty", () => {
    // real_estate_agent has an empty verifyUrl on the primary licence
    // (it's state-specific). Without state, primary link shouldn't appear.
    const noState = getVerificationLinks("real_estate_agent");
    const stateless = noState.filter((l) => l.regulator === "State OFT");
    expect(stateless.length).toBe(0);
  });

  it("adds state Fair Trading link for buyers_agent when state is provided", () => {
    const links = getVerificationLinks("buyers_agent", "NSW");
    expect(
      links.some((l) => l.url.includes("verify.licence.nsw.gov.au")),
    ).toBe(true);
  });

  it("adds state Fair Trading link for real_estate_agent by state", () => {
    const links = getVerificationLinks("real_estate_agent", "QLD");
    expect(
      links.some((l) => l.url.includes("qld.gov.au")),
    ).toBe(true);
  });

  it("includes additional licences in the returned list", () => {
    const smsfLinks = getVerificationLinks("smsf_accountant");
    // smsf_accountant has AFSL + TPB_TAX + TPB_BAS
    const codes = smsfLinks.map((l) => l.regulator);
    expect(codes).toContain("ASIC");
    expect(codes).toContain("TPB");
  });
});
