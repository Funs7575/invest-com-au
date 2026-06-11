import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetInvestorProfile, mockUpsertInvestorProfile } = vi.hoisted(() => ({
  mockGetInvestorProfile: vi.fn(async () => null as Record<string, unknown> | null),
  mockUpsertInvestorProfile: vi.fn(async () => true),
}));
vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: mockGetInvestorProfile,
  upsertInvestorProfile: mockUpsertInvestorProfile,
}));

import {
  parseMoneyMeta,
  buildMoneyProfile,
  moneyProfileCoverage,
  hasAnyPrefillValue,
  loadMoneyProfileForUser,
  saveMoneyMeta,
  EMPTY_MONEY_META,
  MONEY_META_KEY,
  type DerivedParts,
  type MoneyProfileQueryClient,
} from "@/lib/money-profile";

const EMPTY_DERIVED: DerivedParts = {
  savingsBalance: null,
  superBalance: null,
  propertyValue: null,
  holdingsValue: null,
  feeProfilePortfolioValue: null,
  currentBrokerSlug: null,
  budgetBand: null,
  experienceLevel: null,
};

describe("parseMoneyMeta", () => {
  it("returns empty meta for null / missing / malformed input", () => {
    expect(parseMoneyMeta(null)).toEqual(EMPTY_MONEY_META);
    expect(parseMoneyMeta({})).toEqual(EMPTY_MONEY_META);
    expect(parseMoneyMeta({ [MONEY_META_KEY]: "garbage" })).toEqual(EMPTY_MONEY_META);
    expect(parseMoneyMeta({ [MONEY_META_KEY]: 42 })).toEqual(EMPTY_MONEY_META);
  });

  it("parses valid fields and coerces numeric strings", () => {
    const meta = {
      [MONEY_META_KEY]: {
        state: "VIC",
        age: "34",
        annual_income: 95_000,
        monthly_savings: 1500,
        target_retirement_age: 60,
      },
    };
    expect(parseMoneyMeta(meta)).toEqual({
      state: "VIC",
      age: 34,
      annual_income: 95_000,
      monthly_savings: 1500,
      target_retirement_age: 60,
    });
  });

  it("rejects out-of-bounds and unknown values field-by-field", () => {
    const meta = {
      [MONEY_META_KEY]: {
        state: "XX",
        age: 12,
        annual_income: -5,
        monthly_savings: 2_000_000,
        target_retirement_age: 30,
      },
    };
    expect(parseMoneyMeta(meta)).toEqual(EMPTY_MONEY_META);
  });
});

describe("buildMoneyProfile", () => {
  it("prefers holdings value over the fee-profile fallback for portfolio", () => {
    const p = buildMoneyProfile(EMPTY_MONEY_META, {
      ...EMPTY_DERIVED,
      holdingsValue: 80_000,
      feeProfilePortfolioValue: 50_000,
    });
    expect(p.portfolio_value).toBe(80_000);
  });

  it("falls back to fee-profile portfolio when there are no holdings", () => {
    const p = buildMoneyProfile(EMPTY_MONEY_META, {
      ...EMPTY_DERIVED,
      feeProfilePortfolioValue: 50_000,
    });
    expect(p.portfolio_value).toBe(50_000);
  });

  it("sums investable assets across portfolio + savings + super, skipping nulls", () => {
    const p = buildMoneyProfile(EMPTY_MONEY_META, {
      ...EMPTY_DERIVED,
      holdingsValue: 80_000,
      savingsBalance: 20_000,
    });
    expect(p.investable_assets).toBe(100_000);

    const empty = buildMoneyProfile(EMPTY_MONEY_META, EMPTY_DERIVED);
    expect(empty.investable_assets).toBeNull();
  });
});

describe("moneyProfileCoverage", () => {
  it("is 0% with nothing and lists every missing field with a fix-it href", () => {
    const cov = moneyProfileCoverage(buildMoneyProfile(EMPTY_MONEY_META, EMPTY_DERIVED));
    expect(cov.filled).toBe(0);
    expect(cov.pct).toBe(0);
    expect(cov.missing.length).toBe(cov.total);
    expect(cov.missing.every((m) => m.href.startsWith("/"))).toBe(true);
  });

  it("counts filled fields across editable and derived sources", () => {
    const profile = buildMoneyProfile(
      { ...EMPTY_MONEY_META, state: "NSW", age: 40 },
      { ...EMPTY_DERIVED, savingsBalance: 10_000 },
    );
    const cov = moneyProfileCoverage(profile);
    expect(cov.filled).toBe(3);
    expect(cov.missing.map((m) => m.label)).not.toContain("State");
    expect(hasAnyPrefillValue(profile)).toBe(true);
  });
});

// ─── loadMoneyProfileForUser ────────────────────────────────────────────

type QueryResult = { data: unknown; error: { message: string } | null };

function makeQueryClient(results: Record<string, QueryResult>): MoneyProfileQueryClient {
  return {
    from(table: string) {
      const result = results[table] ?? { data: null, error: null };
      const thenable = {
        then: (cb: (v: QueryResult) => unknown) => Promise.resolve(cb(result)),
        maybeSingle: () =>
          Promise.resolve({
            data: (result.data as Record<string, unknown> | null) ?? null,
            error: result.error,
          }),
      };
      return {
        select: () => ({
          eq: () => thenable,
        }),
      } as unknown as ReturnType<MoneyProfileQueryClient["from"]>;
    },
  };
}

describe("loadMoneyProfileForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInvestorProfile.mockResolvedValue(null);
  });

  it("assembles balances, holdings and fee-profile fallbacks", async () => {
    mockGetInvestorProfile.mockResolvedValue({
      meta: { [MONEY_META_KEY]: { state: "QLD", age: 45 } },
      budgetBand: "large",
      experienceLevel: "intermediate",
    });
    const client = makeQueryClient({
      manual_balances: {
        data: [
          { category: "savings", amount_cents: 1_500_000 },
          { category: "savings", amount_cents: 500_000 },
          { category: "super", amount_cents: 30_000_000 },
        ],
        error: null,
      },
      investor_holdings: {
        data: [{ shares: 100, cost_basis_per_share_cents: 5_000 }],
        error: null,
      },
      fee_profiles: {
        data: { portfolio_value: 99_999, current_broker_slug: "stake" },
        error: null,
      },
    });

    const profile = await loadMoneyProfileForUser("user-1", client);
    expect(profile.state).toBe("QLD");
    expect(profile.age).toBe(45);
    expect(profile.savings_balance).toBe(20_000);
    expect(profile.super_balance).toBe(300_000);
    // Holdings (100 × $50) win over the fee-profile number.
    expect(profile.portfolio_value).toBe(5_000);
    expect(profile.current_broker_slug).toBe("stake");
    expect(profile.budget_band).toBe("large");
    expect(profile.investable_assets).toBe(20_000 + 300_000 + 5_000);
  });

  it("degrades to an empty profile when every source is empty", async () => {
    const profile = await loadMoneyProfileForUser("user-1", makeQueryClient({}));
    expect(profile.savings_balance).toBeNull();
    expect(profile.portfolio_value).toBeNull();
    expect(hasAnyPrefillValue(profile)).toBe(false);
  });
});

describe("saveMoneyMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges the patch into meta.money without clobbering sibling meta keys", async () => {
    mockGetInvestorProfile.mockResolvedValue({
      meta: {
        account_type: "couple",
        [MONEY_META_KEY]: { state: "NSW", age: 40 },
      },
    });
    await saveMoneyMeta("user-1", { age: 41, monthly_savings: 1200 });

    expect(mockUpsertInvestorProfile).toHaveBeenCalledWith("user-1", {
      meta: {
        account_type: "couple",
        [MONEY_META_KEY]: expect.objectContaining({
          state: "NSW",
          age: 41,
          monthly_savings: 1200,
        }),
      },
    });
  });

  it("null clears a field", async () => {
    mockGetInvestorProfile.mockResolvedValue({
      meta: { [MONEY_META_KEY]: { state: "NSW" } },
    });
    await saveMoneyMeta("user-1", { state: null });
    const call = (mockUpsertInvestorProfile.mock.calls[0] as unknown as unknown[])?.[1] as {
      meta: Record<string, Record<string, unknown>>;
    };
    expect(call.meta[MONEY_META_KEY]?.state).toBeNull();
  });
});
