import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AlertCountrySchema,
  AlertSeveritySchema,
  PublicRuleAlertSchema,
  AdminRuleAlertSchema,
  COUNTRY_RULE_ALERT_COUNTRIES,
  SEVERITY_LABELS,
  type AdminRuleAlert,
  type PublicRuleAlert,
} from "@/lib/country-rule-alerts";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
const mockedCreateClient = vi.mocked(createClient);

function publicRow(overrides: Partial<PublicRuleAlert> = {}): PublicRuleAlert {
  return {
    alert_key: "uk-test-alert",
    severity: "warning",
    headline: "Test headline",
    body: "Body copy",
    source: "ATO",
    cta_href: "/foreign-investment/united-kingdom",
    cta_label: "UK guide",
    ...overrides,
  };
}

function adminRow(overrides: Partial<AdminRuleAlert> = {}): AdminRuleAlert {
  return {
    id: 1,
    alert_key: "uk-test-alert",
    country_code: "uk",
    severity: "warning",
    headline: "Test headline",
    body: "Body",
    source: "ATO",
    cta_href: null,
    cta_label: null,
    stales_at: "2027-01-01",
    display_order: 10,
    active: true,
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z",
    ...overrides,
  };
}

describe("schema enums", () => {
  it("rejects unknown country", () => {
    expect(AlertCountrySchema.safeParse("zz").success).toBe(false);
    expect(AlertCountrySchema.safeParse("uk").success).toBe(true);
  });

  it("rejects unknown severity", () => {
    expect(AlertSeveritySchema.safeParse("yikes").success).toBe(false);
    expect(AlertSeveritySchema.safeParse("urgent").success).toBe(true);
  });

  it("SEVERITY_LABELS covers every severity enum", () => {
    for (const sev of AlertSeveritySchema.options) {
      expect(SEVERITY_LABELS[sev]).toBeTruthy();
    }
  });

  it("COUNTRY_RULE_ALERT_COUNTRIES matches AlertCountrySchema options", () => {
    expect([...AlertCountrySchema.options].sort()).toEqual(
      [...COUNTRY_RULE_ALERT_COUNTRIES].sort(),
    );
  });
});

describe("PublicRuleAlertSchema", () => {
  it("parses a valid public row", () => {
    expect(PublicRuleAlertSchema.safeParse(publicRow()).success).toBe(true);
  });

  it("rejects a row missing required headline", () => {
    const bad = { ...publicRow(), headline: undefined } as unknown;
    expect(PublicRuleAlertSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts null cta fields", () => {
    expect(
      PublicRuleAlertSchema.safeParse(
        publicRow({ cta_href: null, cta_label: null }),
      ).success,
    ).toBe(true);
  });
});

describe("AdminRuleAlertSchema", () => {
  it("parses a valid admin row", () => {
    expect(AdminRuleAlertSchema.safeParse(adminRow()).success).toBe(true);
  });

  it("rejects an admin row with invalid country", () => {
    expect(
      AdminRuleAlertSchema.safeParse(adminRow({ country_code: "zz" as never }))
        .success,
    ).toBe(false);
  });
});

describe("getActiveAlertsForCountry", () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  it("returns parsed rows for the requested country (lowercased)", async () => {
    const eqSpy = vi.fn().mockReturnThis();
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: eqSpy,
      order: vi
        .fn()
        .mockResolvedValue({ data: [publicRow({ alert_key: "uk-x" })], error: null }),
    };
    mockedCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQuery),
    } as never);

    const { getActiveAlertsForCountry } = await import("@/lib/country-rule-alerts-server");
    const result = await getActiveAlertsForCountry("UK");

    expect(eqSpy).toHaveBeenCalledWith("country_code", "uk");
    expect(eqSpy).toHaveBeenCalledWith("active", true);
    expect(result).toHaveLength(1);
    expect(result[0]?.alert_key).toBe("uk-x");
  });

  it("returns empty array for unknown country (no DB call)", async () => {
    const fromSpy = vi.fn();
    mockedCreateClient.mockResolvedValue({ from: fromSpy } as never);

    const { getActiveAlertsForCountry } = await import("@/lib/country-rule-alerts-server");
    const result = await getActiveAlertsForCountry("zz");

    expect(result).toEqual([]);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("returns empty array for empty country", async () => {
    const { getActiveAlertsForCountry } = await import("@/lib/country-rule-alerts-server");
    expect(await getActiveAlertsForCountry("")).toEqual([]);
  });

  it("returns empty array on supabase failure", async () => {
    mockedCreateClient.mockRejectedValue(new Error("boom"));
    const { getActiveAlertsForCountry } = await import("@/lib/country-rule-alerts-server");
    expect(await getActiveAlertsForCountry("uk")).toEqual([]);
  });

  it("filters out rows that fail schema validation", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          publicRow({ alert_key: "uk-1" }),
          { alert_key: "uk-2" }, // missing required fields
          publicRow({ alert_key: "uk-3" }),
        ],
        error: null,
      }),
    };
    mockedCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQuery),
    } as never);

    const { getActiveAlertsForCountry } = await import("@/lib/country-rule-alerts-server");
    const result = await getActiveAlertsForCountry("uk");
    expect(result.map((r) => r.alert_key)).toEqual(["uk-1", "uk-3"]);
  });
});
