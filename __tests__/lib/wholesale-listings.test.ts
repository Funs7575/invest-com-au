import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import {
  isS708Certified,
  getListingDetail,
  submitWholesaleLead,
} from "@/lib/wholesale-listings";

function profile(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) }),
    }),
  };
}

describe("isS708Certified", () => {
  beforeEach(() => mockFrom.mockReset());
  it("true when HNW flag set", async () => {
    mockFrom.mockReturnValue(profile({ is_hnw: true, meta: {} }));
    expect(await isS708Certified("u-1")).toBe(true);
  });
  it("true when meta.s708_certified", async () => {
    mockFrom.mockReturnValue(profile({ is_hnw: false, meta: { s708_certified: true } }));
    expect(await isS708Certified("u-1")).toBe(true);
  });
  it("false otherwise", async () => {
    mockFrom.mockReturnValue(profile({ is_hnw: false, meta: {} }));
    expect(await isS708Certified("u-1")).toBe(false);
  });
  it("false when no profile", async () => {
    mockFrom.mockReturnValue(profile(null));
    expect(await isS708Certified("u-1")).toBe(false);
  });
});

describe("getListingDetail gating", () => {
  beforeEach(() => mockFrom.mockReset());

  it("gates a s708 listing for a non-certified / anonymous viewer", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "wholesale_listings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1, s708_gated: true }, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    });
    const res = await getListingDetail({ slug: "x", authUserId: null });
    expect(res.gated).toBe(true);
  });

  it("returns detail for a non-gated listing", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 2, s708_gated: false, title: "Open" }, error: null }),
          }),
        }),
      }),
    });
    const res = await getListingDetail({ slug: "y", authUserId: null });
    expect(res.gated).toBe(false);
  });
});

describe("submitWholesaleLead", () => {
  beforeEach(() => mockFrom.mockReset());

  it("refuses a non-certified requester", async () => {
    mockFrom.mockReturnValue(profile({ is_hnw: false, meta: {} }));
    expect(
      await submitWholesaleLead({ listingId: 1, authUserId: "u-1", investorEmail: "x@y.com" }),
    ).toBe(false);
  });

  it("inserts when certified", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "investor_profiles") return profile({ is_hnw: true, meta: {} });
      if (table === "wholesale_listing_leads") return { insert };
      throw new Error(`unexpected ${table}`);
    });
    const ok = await submitWholesaleLead({ listingId: 1, authUserId: "u-1", investorEmail: "x@y.com" });
    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ listing_id: 1 }));
  });
});
