import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockMaybeSingle, mockFrom } = vi.hoisted(() => {
  const m = vi.fn();
  return {
    mockMaybeSingle: m,
    mockFrom: vi.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: m }),
      }),
    })),
  };
});

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: () => ({ from: mockFrom }),
}));

import { getAfslLicensee, normaliseAfslNumber } from "@/lib/afsl-register";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
});

describe("normaliseAfslNumber", () => {
  it("strips non-digit characters", () => {
    expect(normaliseAfslNumber("AFSL 123456")).toBe("123456");
    expect(normaliseAfslNumber("AFSL: 123 456")).toBe("123456");
    expect(normaliseAfslNumber("afsl no. 654321")).toBe("654321");
    expect(normaliseAfslNumber(" 000111 ")).toBe("000111");
  });

  it("returns empty string when no digits", () => {
    expect(normaliseAfslNumber("AFSL")).toBe("");
    expect(normaliseAfslNumber("")).toBe("");
  });
});

describe("getAfslLicensee", () => {
  it("returns null for an unparseable input without querying", async () => {
    const result = await getAfslLicensee("nothing");
    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("queries the normalised number and returns the row when found", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        afsl_number: "123456",
        licensee_name: "Acme Wealth",
        status: "current",
        licence_conditions: null,
        address: null,
        effective_date: null,
        cancelled_date: null,
        last_verified_at: "2026-05-18T00:00:00Z",
        source: "asic_connect",
      },
      error: null,
    });
    const result = await getAfslLicensee("AFSL 123 456");
    expect(result?.afsl_number).toBe("123456");
    expect(result?.licensee_name).toBe("Acme Wealth");
    expect(mockFrom).toHaveBeenCalledWith("afsl_register");
  });

  it("returns null when the row is missing", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getAfslLicensee("999999")).toBeNull();
  });

  it("returns null on supabase error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getAfslLicensee("123456")).toBeNull();
  });
});
