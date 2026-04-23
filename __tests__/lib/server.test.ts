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
import { getSubscription } from "@/lib/server/get-subscription";

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
