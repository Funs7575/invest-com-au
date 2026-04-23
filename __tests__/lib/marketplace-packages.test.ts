import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

let packagesList: unknown[] = [];
let accountRow: { package_id: number | null } | null = null;
let packageRow: unknown = null;

const updateCalls: { payload: Record<string, unknown>; slug: string }[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "broker_packages") {
    return {
      select: () => ({
        eq: () => ({
          order: async () => ({ data: packagesList, error: null }),
          maybeSingle: async () => ({ data: packageRow, error: null }),
        }),
      }),
    };
  }
  if (table === "broker_accounts") {
    return {
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: accountRow, error: null }),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, slug: string) => {
          updateCalls.push({ payload, slug });
          return { data: null, error: null };
        },
      }),
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  getPackageTiers,
  getBrokerPackage,
  getEffectiveCpcRate,
  assignPackage,
} from "@/lib/marketplace/packages";
import type { BrokerPackage } from "@/lib/types";

// ─── Tests ───────────────────────────────────────────────────────────

describe("getPackageTiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    packagesList = [];
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array when no active tiers", async () => {
    packagesList = [];
    expect(await getPackageTiers()).toEqual([]);
  });

  it("returns all active tiers sorted", async () => {
    packagesList = [
      { id: 1, name: "Basic" },
      { id: 2, name: "Pro" },
    ];
    const tiers = await getPackageTiers();
    expect(tiers).toHaveLength(2);
    expect(tiers[0]).toMatchObject({ id: 1, name: "Basic" });
  });

  it("coerces null data to an empty array", async () => {
    // Override to return explicit null
    mockFrom.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: null, error: null }),
        }),
      }),
    }));
    expect(await getPackageTiers()).toEqual([]);
  });
});

describe("getBrokerPackage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountRow = null;
    packageRow = null;
  });

  it("returns null when no broker_account is found", async () => {
    accountRow = null;
    expect(await getBrokerPackage("stake")).toBeNull();
  });

  it("returns null when the account has no package_id", async () => {
    accountRow = { package_id: null };
    expect(await getBrokerPackage("stake")).toBeNull();
  });

  it("returns the matching package row when assigned", async () => {
    accountRow = { package_id: 5 };
    packageRow = { id: 5, name: "Pro", cpc_rate_discount_pct: 10 };
    const pkg = await getBrokerPackage("stake");
    expect(pkg?.id).toBe(5);
    expect(pkg?.name).toBe("Pro");
  });
});

describe("getEffectiveCpcRate (pure)", () => {
  function pkg(discount: number): BrokerPackage {
    return {
      id: 1,
      name: "T",
      cpc_rate_discount_pct: discount,
    } as unknown as BrokerPackage;
  }

  it("returns the base rate when package is null", () => {
    expect(getEffectiveCpcRate(100, null)).toBe(100);
  });

  it("returns the base rate when discount is 0", () => {
    expect(getEffectiveCpcRate(100, pkg(0))).toBe(100);
  });

  it("returns the base rate when discount is negative (ignored)", () => {
    expect(getEffectiveCpcRate(100, pkg(-5))).toBe(100);
  });

  it("applies a 10% discount", () => {
    expect(getEffectiveCpcRate(1000, pkg(10))).toBe(900);
  });

  it("rounds the discount (e.g. 33% of 100 = 33, so 67)", () => {
    expect(getEffectiveCpcRate(100, pkg(33))).toBe(67);
  });

  it("clamps at 0 when discount exceeds 100%", () => {
    expect(getEffectiveCpcRate(100, pkg(150))).toBe(0);
  });

  it("applies 100% discount to give 0", () => {
    expect(getEffectiveCpcRate(100, pkg(100))).toBe(0);
  });
});

describe("assignPackage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
  });

  it("updates broker_accounts row with the new package + timestamp stamps", async () => {
    await assignPackage("stake", 7);
    expect(updateCalls).toHaveLength(1);
    const call = updateCalls[0];
    expect(call?.slug).toBe("stake");
    expect(call?.payload.package_id).toBe(7);
    expect(call?.payload.package_started_at).toEqual(expect.any(String));
    expect(call?.payload.updated_at).toEqual(expect.any(String));
  });
});
