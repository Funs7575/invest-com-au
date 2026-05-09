import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CountrySchemeSchema,
  SchemeAudienceSchema,
  SchemeCategorySchema,
  CATEGORY_LABELS,
  AUDIENCE_LABELS,
  groupByCategory,
  type CountryScheme,
} from "@/lib/country-schemes";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
const mockedCreateClient = vi.mocked(createClient);

function row(overrides: Partial<CountryScheme> = {}): CountryScheme {
  return {
    id: 1,
    country_code: "GB",
    audience: "inbound_migrant",
    category: "tax_concession",
    name: "UK pension",
    summary: "summary",
    body_md: "body",
    threshold_cents: null,
    threshold_label: null,
    source_name: "HMRC",
    source_url: "https://gov.uk",
    sourced_at: "2026-04-01",
    stales_at: "2026-10-01",
    display_order: 0,
    active: true,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

describe("schema enums", () => {
  it("rejects unknown audiences", () => {
    expect(SchemeAudienceSchema.safeParse("rogue").success).toBe(false);
    expect(SchemeAudienceSchema.safeParse("inbound_migrant").success).toBe(true);
  });

  it("rejects unknown categories", () => {
    expect(SchemeCategorySchema.safeParse("hot_take").success).toBe(false);
    expect(SchemeCategorySchema.safeParse("visa_pathway").success).toBe(true);
  });

  it("CATEGORY_LABELS covers every category enum value", () => {
    for (const cat of SchemeCategorySchema.options) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it("AUDIENCE_LABELS covers every audience enum value", () => {
    for (const a of SchemeAudienceSchema.options) {
      expect(AUDIENCE_LABELS[a]).toBeTruthy();
    }
  });
});

describe("CountrySchemeSchema", () => {
  it("parses a valid row end to end", () => {
    const parsed = CountrySchemeSchema.safeParse(row());
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const bad = { ...row(), source_url: undefined };
    expect(CountrySchemeSchema.safeParse(bad).success).toBe(false);
  });
});

describe("groupByCategory", () => {
  it("groups rows by category preserving input order", () => {
    const rows = [
      row({ id: 1, category: "tax_concession" }),
      row({ id: 2, category: "visa_pathway" }),
      row({ id: 3, category: "tax_concession" }),
    ];
    const grouped = groupByCategory(rows);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.category).toBe("tax_concession");
    expect(grouped[0]?.rows.map((r) => r.id)).toEqual([1, 3]);
    expect(grouped[1]?.category).toBe("visa_pathway");
  });

  it("returns empty array for no input", () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

describe("getSchemesForCountry", () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  it("returns parsed rows for the requested country", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [row({ id: 7, country_code: "GB" })], error: null }),
    };
    mockedCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQuery),
    } as never);

    const { getSchemesForCountry } = await import("@/lib/country-schemes");
    const result = await getSchemesForCountry("gb");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(7);
  });

  it("uppercases the country code before query", async () => {
    const eqSpy = vi.fn().mockReturnThis();
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: eqSpy,
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockedCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQuery),
    } as never);

    const { getSchemesForCountry } = await import("@/lib/country-schemes");
    await getSchemesForCountry("gb");
    expect(eqSpy).toHaveBeenCalledWith("country_code", "GB");
  });

  it("returns empty array on supabase failure", async () => {
    mockedCreateClient.mockRejectedValue(new Error("boom"));
    const { getSchemesForCountry } = await import("@/lib/country-schemes");
    const result = await getSchemesForCountry("US");
    expect(result).toEqual([]);
  });

  it("filters out rows that fail schema validation", async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          row({ id: 1 }),
          { id: 2, country_code: "GB" }, // missing required fields
          row({ id: 3 }),
        ],
        error: null,
      }),
    };
    mockedCreateClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQuery),
    } as never);

    const { getSchemesForCountry } = await import("@/lib/country-schemes");
    const result = await getSchemesForCountry("GB");
    expect(result.map((r) => r.id)).toEqual([1, 3]);
  });
});
