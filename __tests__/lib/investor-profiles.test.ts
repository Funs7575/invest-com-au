import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let quizRow: Record<string, unknown> | null = null;
let profileRow: Record<string, unknown> | null = null;
const upsertCalls: Record<string, unknown>[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "user_quiz_history") {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: quizRow, error: null }),
    };
    return chain;
  }
  if (table === "investor_profiles") {
    return {
      select: () => {
        const chain = {
          eq: () => chain,
          maybeSingle: async () => ({ data: profileRow, error: null }),
        };
        return chain;
      },
      upsert: async (row: Record<string, unknown>) => {
        upsertCalls.push(row);
        return { error: null };
      },
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  getInvestorProfile,
  upsertInvestorProfile,
  syncQuizToInvestorProfile,
} from "@/lib/investor-profiles";

describe("getInvestorProfile", () => {
  beforeEach(() => {
    profileRow = null;
  });

  it("returns null when no row exists", async () => {
    expect(await getInvestorProfile("u1")).toBeNull();
  });

  it("maps DB row to typed profile", async () => {
    profileRow = {
      auth_user_id: "u1",
      display_name: "Alex",
      is_fhb: true,
      is_pre_retiree: false,
      is_business_owner: false,
      is_cross_border: true,
      is_hnw: false,
      intent_country_snapshot: "uk",
      budget_band: "medium",
      experience_level: "intermediate",
      primary_vertical: "shares",
      meta: { foo: "bar" },
      created_at: "2026-05-10T00:00:00Z",
      updated_at: "2026-05-10T00:00:00Z",
    };
    const p = await getInvestorProfile("u1");
    expect(p?.isFhb).toBe(true);
    expect(p?.isCrossBorder).toBe(true);
    expect(p?.intentCountrySnapshot).toBe("uk");
    expect(p?.budgetBand).toBe("medium");
    expect(p?.experienceLevel).toBe("intermediate");
    expect(p?.meta).toEqual({ foo: "bar" });
  });
});

describe("upsertInvestorProfile", () => {
  beforeEach(() => {
    upsertCalls.length = 0;
  });

  it("upserts the patch with auth_user_id + updated_at", async () => {
    const ok = await upsertInvestorProfile("u1", { is_fhb: true, intent_country_snapshot: "uk" });
    expect(ok).toBe(true);
    expect(upsertCalls[0]).toMatchObject({
      auth_user_id: "u1",
      is_fhb: true,
      intent_country_snapshot: "uk",
    });
    expect(upsertCalls[0]?.updated_at).toEqual(expect.any(String));
  });
});

describe("syncQuizToInvestorProfile", () => {
  beforeEach(() => {
    quizRow = null;
    upsertCalls.length = 0;
  });

  it("returns false when no quiz history exists", async () => {
    const ok = await syncQuizToInvestorProfile({ userId: "u1", sessionId: "s1" });
    expect(ok).toBe(false);
    expect(upsertCalls).toHaveLength(0);
  });

  it("derives is_fhb from goal=home", async () => {
    quizRow = {
      answers: { raw: { goal: "home", amount: "small", experience: "beginner" } },
      inferred_vertical: "home",
      top_match_slug: null,
      completed_at: "2026-05-10T00:00:00Z",
    };
    const ok = await syncQuizToInvestorProfile({ userId: "u1", sessionId: "s1" });
    expect(ok).toBe(true);
    expect(upsertCalls[0]?.is_fhb).toBe(true);
    expect(upsertCalls[0]?.budget_band).toBe("small");
    expect(upsertCalls[0]?.experience_level).toBe("beginner");
    expect(upsertCalls[0]?.primary_vertical).toBe("home");
  });

  it("derives is_pre_retiree from goal=super", async () => {
    quizRow = {
      answers: { raw: { goal: "super", amount: "large" } },
      inferred_vertical: "super",
    };
    await syncQuizToInvestorProfile({ userId: "u1", sessionId: "s1" });
    expect(upsertCalls[0]?.is_pre_retiree).toBe(true);
    expect(upsertCalls[0]?.is_fhb).toBe(false);
  });

  it("derives is_hnw from amount=whale", async () => {
    quizRow = {
      answers: { raw: { amount: "whale" } },
    };
    await syncQuizToInvestorProfile({ userId: "u1", sessionId: "s1" });
    expect(upsertCalls[0]?.is_hnw).toBe(true);
    expect(upsertCalls[0]?.budget_band).toBe("whale");
  });

  it("derives is_cross_border from investor_country", async () => {
    quizRow = {
      answers: { raw: { investor_country: "united_kingdom" } },
    };
    await syncQuizToInvestorProfile({ userId: "u1", sessionId: "s1" });
    expect(upsertCalls[0]?.is_cross_border).toBe(true);
    expect(upsertCalls[0]?.intent_country_snapshot).toBe("uk");
  });

  it("derives is_business_owner from complexity=business_owner", async () => {
    quizRow = {
      answers: { raw: { complexity: "business_owner" } },
    };
    await syncQuizToInvestorProfile({ userId: "u1", sessionId: "s1" });
    expect(upsertCalls[0]?.is_business_owner).toBe(true);
  });

  it("ignores unknown investor_country / amount values", async () => {
    quizRow = {
      answers: { raw: { investor_country: "atlantis", amount: "tiny" } },
    };
    await syncQuizToInvestorProfile({ userId: "u1", sessionId: "s1" });
    expect(upsertCalls[0]?.intent_country_snapshot).toBeNull();
    expect(upsertCalls[0]?.budget_band).toBeNull();
    expect(upsertCalls[0]?.is_cross_border).toBe(false);
  });
});
