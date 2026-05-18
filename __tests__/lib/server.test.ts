import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
let courseData: { id: number } | null = null;
let subData: { status: string } | null = null;

const mockFrom = vi.fn((table: string) => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      if (table === "course_purchases") return { data: courseData, error: null };
      if (table === "subscriptions") return { data: subData, error: null };
      return { data: null, error: null };
    },
  };
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { hasCourseAccess } from "@/lib/server/course-access";
import { gatePremiumData, getSubscription, requirePro } from "@/lib/server/get-subscription";

// ─── Tests ───────────────────────────────────────────────────────────

describe("hasCourseAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courseData = null;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns false when no purchase row exists", async () => {
    courseData = null;
    expect(await hasCourseAccess("u1")).toBe(false);
  });

  it("returns true when a purchase row exists", async () => {
    courseData = { id: 42 };
    expect(await hasCourseAccess("u1")).toBe(true);
  });

  it("defaults the course slug to 'investing-101'", async () => {
    courseData = { id: 42 };
    // The from/eq chain isn't directly observable, but the function
    // must not throw when slug is omitted.
    await expect(hasCourseAccess("u1")).resolves.toBe(true);
  });

  it("supports an explicit course slug", async () => {
    courseData = { id: 42 };
    await expect(hasCourseAccess("u1", "advanced-options")).resolves.toBe(true);
  });
});

describe("getSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subData = null;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns null subscription + isPro=false when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await getSubscription();
    expect(res).toEqual({ user: null, subscription: null, isPro: false });
  });

  it("returns isPro=true for active status", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = { status: "active" };
    const res = await getSubscription();
    expect(res.isPro).toBe(true);
    expect(res.subscription).toEqual({ status: "active" });
  });

  it("returns isPro=true for trialing status", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = { status: "trialing" };
    const res = await getSubscription();
    expect(res.isPro).toBe(true);
  });

  it("returns isPro=false for past_due status (still in the queried statuses set, but not Pro)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = { status: "past_due" };
    const res = await getSubscription();
    expect(res.isPro).toBe(false);
    expect(res.subscription?.status).toBe("past_due");
  });

  it("returns isPro=false when the user has no matching subscription", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = null;
    const res = await getSubscription();
    expect(res.isPro).toBe(false);
    expect(res.subscription).toBeNull();
  });

  it("always returns the user object unchanged", async () => {
    const user = { id: "u1", email: "u@x.com" };
    mockGetUser.mockResolvedValueOnce({ data: { user } });
    subData = { status: "active" };
    const res = await getSubscription();
    expect(res.user).toBe(user);
  });
});

describe("requirePro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subData = null;
  });

  it("returns isPro=false for an unauthenticated visitor", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await requirePro();
    expect(res.isPro).toBe(false);
    expect(res.user).toBeNull();
  });

  it("returns isPro=true when the active subscription matches", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = { status: "active" };
    const res = await requirePro();
    expect(res.isPro).toBe(true);
  });

  it("does not throw or redirect when the viewer is non-Pro (soft-gating contract)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = null;
    await expect(requirePro()).resolves.toEqual(
      expect.objectContaining({ isPro: false }),
    );
  });
});

describe("gatePremiumData", () => {
  const fullReport = {
    title: "Q1 2026 Broker Report",
    executive_summary: "Free for everyone.",
    sections: [{ heading: "Paid", body: "Long-form analysis." }],
    fee_changes_summary: [
      { broker: "X", field: "fee", old_value: "$1", new_value: "$2" },
    ],
    new_entrants: ["NewBroker"],
  };

  it("returns the data unchanged when isPro=true", () => {
    const result = gatePremiumData(fullReport, true, {
      sections: [],
      fee_changes_summary: [],
      new_entrants: [],
    });
    expect(result).toEqual(fullReport);
  });

  it("substitutes the fallbacks when isPro=false", () => {
    const result = gatePremiumData(fullReport, false, {
      sections: [],
      fee_changes_summary: [],
      new_entrants: [],
    });
    expect(result.sections).toEqual([]);
    expect(result.fee_changes_summary).toEqual([]);
    expect(result.new_entrants).toEqual([]);
    // Free fields are preserved
    expect(result.title).toBe("Q1 2026 Broker Report");
    expect(result.executive_summary).toBe("Free for everyone.");
  });

  it("does not mutate the input record", () => {
    const original = { ...fullReport };
    gatePremiumData(fullReport, false, {
      sections: [],
      fee_changes_summary: [],
      new_entrants: [],
    });
    expect(fullReport).toEqual(original);
  });

  it("only blanks fields listed in fallbacks (others pass through)", () => {
    const result = gatePremiumData(fullReport, false, {
      sections: [],
    });
    expect(result.sections).toEqual([]);
    // Untouched paid fields stay as-is — caller must explicitly list
    // every field they want to gate.
    expect(result.fee_changes_summary).toEqual(fullReport.fee_changes_summary);
    expect(result.new_entrants).toEqual(fullReport.new_entrants);
  });
});
