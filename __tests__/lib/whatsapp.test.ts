import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WHATSAPP_INTAKE_COUNTRIES,
  buildAdvisorWaMessage,
  buildWhatsAppUrl,
  getWhatsAppLeadNumber,
  isWhatsAppIntakeCountry,
} from "@/lib/whatsapp";

describe("WHATSAPP_INTAKE_COUNTRIES", () => {
  it("covers HK, IN, CN, SG", () => {
    expect(WHATSAPP_INTAKE_COUNTRIES.has("hk")).toBe(true);
    expect(WHATSAPP_INTAKE_COUNTRIES.has("in")).toBe(true);
    expect(WHATSAPP_INTAKE_COUNTRIES.has("cn")).toBe(true);
    expect(WHATSAPP_INTAKE_COUNTRIES.has("sg")).toBe(true);
  });

  it("does not cover the other 8 supported countries (UK / US / NZ / etc.)", () => {
    for (const c of ["uk", "us", "jp", "kr", "my", "nz", "ae", "sa"] as const) {
      expect(WHATSAPP_INTAKE_COUNTRIES.has(c)).toBe(false);
    }
  });
});

describe("isWhatsAppIntakeCountry", () => {
  it("returns false for null", () => {
    expect(isWhatsAppIntakeCountry(null)).toBe(false);
  });
  it("returns true only for the four intake countries", () => {
    expect(isWhatsAppIntakeCountry("hk")).toBe(true);
    expect(isWhatsAppIntakeCountry("uk")).toBe(false);
    expect(isWhatsAppIntakeCountry("us")).toBe(false);
  });
});

describe("getWhatsAppLeadNumber", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when env var unset", () => {
    vi.stubEnv("WHATSAPP_LEAD_NUMBER", "");
    expect(getWhatsAppLeadNumber()).toBeNull();
  });

  it("returns the trimmed E.164 number when valid", () => {
    vi.stubEnv("WHATSAPP_LEAD_NUMBER", "  +61400000000  ");
    expect(getWhatsAppLeadNumber()).toBe("+61400000000");
  });

  it("rejects malformed numbers (no leading +)", () => {
    vi.stubEnv("WHATSAPP_LEAD_NUMBER", "61400000000");
    expect(getWhatsAppLeadNumber()).toBeNull();
  });

  it("rejects too-short numbers", () => {
    vi.stubEnv("WHATSAPP_LEAD_NUMBER", "+12345");
    expect(getWhatsAppLeadNumber()).toBeNull();
  });

  it("rejects numbers with non-digit garbage", () => {
    vi.stubEnv("WHATSAPP_LEAD_NUMBER", "+61400-not-digits");
    expect(getWhatsAppLeadNumber()).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("strips + and URL-encodes the message", () => {
    const url = buildWhatsAppUrl("+61400000000", "hi there");
    expect(url).toBe("https://wa.me/61400000000?text=hi%20there");
  });

  it("strips non-digit chars from the phone number defensively", () => {
    const url = buildWhatsAppUrl("+61 400 000 000", "x");
    expect(url).toBe("https://wa.me/61400000000?text=x");
  });

  it("URL-encodes newlines + special chars", () => {
    const url = buildWhatsAppUrl("+61400000000", "line1\nline2 & ?");
    expect(url).toBe("https://wa.me/61400000000?text=line1%0Aline2%20%26%20%3F");
  });
});

describe("buildAdvisorWaMessage", () => {
  it("includes advisor name when provided", () => {
    const m = buildAdvisorWaMessage({
      advisorName: "Jane Smith",
      intentCountryLabel: "HK investors",
      sourcePath: "/advisors/jane-smith",
    });
    expect(m).toContain("for Jane Smith");
    expect(m).toContain("HK investors");
    expect(m).toContain("invest.com.au/advisors/jane-smith");
  });

  it("omits the 'for' clause when advisor name is missing", () => {
    const m = buildAdvisorWaMessage({
      intentCountryLabel: "Singapore investors",
      sourcePath: "/find-advisor",
    });
    expect(m).not.toMatch(/\bfor\b\s*\.$/);
    expect(m.startsWith("Hi —")).toBe(true);
  });
});
