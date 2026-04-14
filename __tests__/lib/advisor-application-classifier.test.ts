import { describe, it, expect } from "vitest";
import {
  classifyApplication,
  firmNamesMatch,
  type ApplicationForClassifier,
  type AfslLookupResult,
  type AbnLookupResult,
} from "@/lib/advisor-application-classifier";

function app(overrides: Partial<ApplicationForClassifier> = {}): ApplicationForClassifier {
  return {
    id: 1,
    name: "Jane Smith",
    firm_name: "Smith Financial Pty Ltd",
    email: "jane@smithfin.com.au",
    phone: "+61400123456",
    type: "financial_planner",
    afsl_number: "235410",
    registration_number: null,
    abn: "12345678901",
    bio: "Experienced financial planner with a focus on retirement planning and SMSF strategies for pre-retirees.",
    website: "https://smithfinancial.com.au",
    location_state: "NSW",
    years_experience: 12,
    specialties: "Retirement, SMSF",
    ...overrides,
  };
}

function afslOk(name = "Smith Financial Pty Ltd"): AfslLookupResult {
  return {
    performed: true,
    afslNumber: "235410",
    registeredName: name,
    status: "current",
    licenceType: "financial_product_advice",
  };
}

function abnOk(name = "Smith Financial Pty Ltd"): AbnLookupResult {
  return {
    performed: true,
    abn: "12345678901",
    entityName: name,
    entityStatus: "active",
  };
}

function stubLookup(): AfslLookupResult {
  return { performed: false, afslNumber: null, registeredName: null, status: null, licenceType: null };
}

function stubAbn(): AbnLookupResult {
  return { performed: false, abn: null, entityName: null, entityStatus: null };
}

describe("classifyApplication — AFSL-required types", () => {
  it("auto-approves financial_planner when AFSL current and firm matches", () => {
    const r = classifyApplication({ application: app(), afslLookup: afslOk(), abnLookup: stubAbn() });
    expect(r.verdict).toBe("approve");
    expect(r.confidence).toBe("high");
  });

  it("auto-approves sole trader with valid AFSL and no firm claimed", () => {
    const r = classifyApplication({
      application: app({ firm_name: null }),
      afslLookup: afslOk(),
      abnLookup: stubAbn(),
    });
    expect(r.verdict).toBe("approve");
  });

  it("rejects when AFSL not found on register", () => {
    const r = classifyApplication({
      application: app(),
      afslLookup: { performed: true, afslNumber: "235410", registeredName: null, status: "not_found", licenceType: null },
      abnLookup: stubAbn(),
    });
    expect(r.verdict).toBe("reject");
    expect(r.confidence).toBe("high");
    expect(r.rejectionReason).toContain("not found");
  });

  it("rejects when AFSL is ceased", () => {
    const r = classifyApplication({
      application: app(),
      afslLookup: { performed: true, afslNumber: "235410", registeredName: null, status: "ceased", licenceType: null },
      abnLookup: stubAbn(),
    });
    expect(r.verdict).toBe("reject");
  });

  it("rejects when firm name doesn't match register entry", () => {
    const r = classifyApplication({
      application: app({ firm_name: "Totally Different Pty Ltd" }),
      afslLookup: afslOk("Smith Financial Pty Ltd"),
      abnLookup: stubAbn(),
    });
    expect(r.verdict).toBe("reject");
  });

  it("rejects financial_planner with no AFSL provided", () => {
    const r = classifyApplication({
      application: app({ afsl_number: null }),
      afslLookup: stubLookup(),
      abnLookup: stubAbn(),
    });
    expect(r.verdict).toBe("reject");
  });

  it("escalates when AFSL lookup wasn't performed (env not set)", () => {
    const r = classifyApplication({ application: app(), afslLookup: stubLookup(), abnLookup: stubAbn() });
    expect(r.verdict).toBe("escalate");
  });
});

describe("classifyApplication — ABN-required types", () => {
  it("auto-approves tax_agent with active ABN and complete profile", () => {
    const r = classifyApplication({
      application: app({ type: "tax_agent", afsl_number: null, firm_name: null }),
      afslLookup: stubLookup(),
      abnLookup: abnOk(),
    });
    expect(r.verdict).toBe("approve");
  });

  it("escalates tax_agent with active ABN but no bio/phone/website", () => {
    const r = classifyApplication({
      application: app({
        type: "tax_agent",
        afsl_number: null,
        firm_name: null,
        bio: null,
        phone: null,
        website: null,
        years_experience: null,
        specialties: null,
      }),
      afslLookup: stubLookup(),
      abnLookup: abnOk(),
    });
    expect(r.verdict).toBe("escalate");
  });

  it("rejects tax_agent with cancelled ABN", () => {
    const r = classifyApplication({
      application: app({ type: "tax_agent", afsl_number: null }),
      afslLookup: stubLookup(),
      abnLookup: { performed: true, abn: "12345678901", entityName: "Old Co", entityStatus: "cancelled" },
    });
    expect(r.verdict).toBe("reject");
  });

  it("escalates mortgage_broker with no ABN", () => {
    const r = classifyApplication({
      application: app({ type: "mortgage_broker", afsl_number: null, abn: null }),
      afslLookup: stubLookup(),
      abnLookup: stubAbn(),
    });
    expect(r.verdict).toBe("escalate");
  });
});

describe("firmNamesMatch", () => {
  it("matches exact names", () => {
    expect(firmNamesMatch("Acme Wealth", "Acme Wealth")).toBe(true);
  });
  it("matches with pty/ltd suffixes stripped", () => {
    expect(firmNamesMatch("Acme Wealth Pty Ltd", "Acme Wealth Limited")).toBe(true);
  });
  it("matches substrings", () => {
    expect(firmNamesMatch("Morgans", "Morgans Financial Limited")).toBe(true);
  });
  it("matches near-spellings (Levenshtein)", () => {
    expect(firmNamesMatch("Morgans Financial", "Morgans Finacial")).toBe(true);
  });
  it("rejects different firms", () => {
    expect(firmNamesMatch("Acme Wealth", "Globex Capital")).toBe(false);
  });
  it("rejects similar short unrelated names", () => {
    expect(firmNamesMatch("CBA", "ANZ")).toBe(false);
  });
});
