import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockSubscriptionsUpdate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    subscriptions: { update: mockSubscriptionsUpdate },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn() }),
}));

import { POST } from "@/app/api/stripe/cancel-subscription/route";

function makeSubBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data })),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/stripe/cancel-subscription", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 404 when no active subscription found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder(null));
    const res = await POST();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/no active/i);
  });

  it("returns 400 when subscription is already cancelling", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder({
      id: "s1",
      stripe_subscription_id: "sub_abc",
      status: "active",
      cancel_at_period_end: true,
    }));
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already set to cancel/i);
  });

  it("cancels subscription at period end and updates DB", async () => {
    const sub = { id: "s1", stripe_subscription_id: "sub_abc", status: "active", cancel_at_period_end: false };
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder(sub));
    mockSubscriptionsUpdate.mockResolvedValue({ id: "sub_abc", cancel_at_period_end: true });
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn(() => Promise.resolve({}));
    mockAdminFrom.mockReturnValueOnce({ update: mockUpdate, eq: mockEq });

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.cancel_at_period_end).toBe(true);

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_abc",
      { cancel_at_period_end: true },
      expect.any(Object)
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ cancel_at_period_end: true })
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder({
      id: "s1",
      stripe_subscription_id: "sub_abc",
      status: "active",
      cancel_at_period_end: false,
    }));
    mockSubscriptionsUpdate.mockRejectedValue(new Error("Stripe down"));

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
