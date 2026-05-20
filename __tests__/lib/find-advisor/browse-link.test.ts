import { describe, it, expect } from "vitest";
import {
  intentToAdvisorTypes,
  browseAdvisorsHref,
} from "@/lib/find-advisor/browse-link";

describe("intentToAdvisorTypes", () => {
  it("maps buy_property → mortgage + buyers agent + property advisor", () => {
    expect(intentToAdvisorTypes("buy_property")).toBe(
      "mortgage_broker,buyers_agent,property_advisor",
    );
  });

  it("maps grow_wealth → financial planner + wealth manager", () => {
    expect(intentToAdvisorTypes("grow_wealth")).toBe(
      "financial_planner,wealth_manager",
    );
  });

  it("maps protect_assets → insurance + estate", () => {
    expect(intentToAdvisorTypes("protect_assets")).toBe(
      "insurance_broker,estate_planner",
    );
  });

  it("maps business_tax → tax agent + smsf accountant", () => {
    expect(intentToAdvisorTypes("business_tax")).toBe(
      "tax_agent,smsf_accountant",
    );
  });
});

describe("browseAdvisorsHref", () => {
  it("returns bare /advisors when both intent and state are missing", () => {
    expect(browseAdvisorsHref(null, "")).toBe("/advisors");
  });

  it("includes type when intent is set", () => {
    const href = browseAdvisorsHref("grow_wealth", "");
    expect(href).toBe("/advisors?type=financial_planner%2Cwealth_manager");
  });

  it("includes state when state is set", () => {
    const href = browseAdvisorsHref(null, "NSW");
    expect(href).toBe("/advisors?state=NSW");
  });

  it("includes both type and state when both are present", () => {
    const href = browseAdvisorsHref("buy_property", "VIC");
    const url = new URL(href, "https://invest.com.au");
    expect(url.pathname).toBe("/advisors");
    expect(url.searchParams.get("type")).toBe(
      "mortgage_broker,buyers_agent,property_advisor",
    );
    expect(url.searchParams.get("state")).toBe("VIC");
  });

  it("URL-encodes the comma in type lists so parsing on the receiving end is unambiguous", () => {
    const href = browseAdvisorsHref("buy_property", "");
    // %2C is the encoded comma
    expect(href).toContain("%2C");
  });
});
