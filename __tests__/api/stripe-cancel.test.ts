import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const mockAuth = { getUser: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

const mockSubscriptionsUpdate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { update: mockSubscriptionsUpdate },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

// Import the handler AFTER mocks
import { POST } from "@/app/api/stripe/cancel-subscription/route";

// ─── Helpers ─────────────────────────────────────────────────────────

function createChainableBuilder(resolveData: unknown = null) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    "select",
    "insert",
    "upsert",
    "update",
    "delete",
    "eq",
    "neq",
    "order",
    "limit",
    "gte",
    "lte",
    "in",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }

  builder.single = vi.fn(() =>
    Promise.resolve({ data: resolveData, error: null }),
  );

  builder.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: resolveData, error: null }),
  );

  return builder;
}

const TEST_USER = {
  id: "user-uuid-123",
  email: "test@example.com",
};

const TEST_SUB_ACTIVE = {
  stripe_subscription_id: "sub_active_456",
  status: "active",
  cancel_at_period_end: false,
};

const TEST_SUB_TRIALING = {
  stripe_subscription_id: "sub_trial_789",
  status: "trialing",
  cancel_at_period_end: false,
};

function setupHappyPath(sub = TEST_SUB_ACTIVE) {
  mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
  mockAdminFrom.mockImplementation(() => createChainableBuilder(sub));
  mockSubscriptionsUpdate.mockResolvedValue({ id: sub.stripe_subscription_id });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("POST /api/stripe/cancel-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Authentication ────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  // ── Subscription lookup ───────────────────────────────────────────

  it("returns 404 when no active subscription found", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() => createChainableBuilder(null));

    const res = await POST();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("No active subscription found");
  });

  it("queries subscriptions table filtered by user id", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    const builder = createChainableBuilder(null);
    mockAdminFrom.mockReturnValue(builder);

    await POST();

    expect(mockAdminFrom).toHaveBeenCalledWith("subscriptions");
    expect(builder.eq).toHaveBeenCalledWith("user_id", TEST_USER.id);
  });

  // ── Already-cancelling guard ──────────────────────────────────────

  it("returns 400 when subscription already set to cancel", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() =>
      createChainableBuilder({
        ...TEST_SUB_ACTIVE,
        cancel_at_period_end: true,
      }),
    );

    const res = await POST();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Subscription is already set to cancel");
  });

  // ── Success path — active subscription ───────────────────────────

  it("returns 200 with correct body on success", async () => {
    setupHappyPath();

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.cancel_at_period_end).toBe(true);
  });

  it("calls Stripe subscriptions.update with cancel_at_period_end: true", async () => {
    setupHappyPath();

    await POST();

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      TEST_SUB_ACTIVE.stripe_subscription_id,
      { cancel_at_period_end: true },
      expect.objectContaining({
        idempotencyKey: expect.stringContaining(
          `cancel_${TEST_SUB_ACTIVE.stripe_subscription_id}_`,
        ),
      }),
    );
  });

  it("idempotency key starts with cancel_ prefix followed by subscription id", async () => {
    setupHappyPath();

    await POST();

    const [, , options] = mockSubscriptionsUpdate.mock.calls[0] as [
      unknown,
      unknown,
      { idempotencyKey: string },
    ];
    expect(options.idempotencyKey).toMatch(
      /^cancel_sub_active_456_\d+$/,
    );
  });

  // ── Success path — trialing subscription ─────────────────────────

  it("cancels trialing subscriptions as well as active ones", async () => {
    setupHappyPath(TEST_SUB_TRIALING);

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      TEST_SUB_TRIALING.stripe_subscription_id,
      { cancel_at_period_end: true },
      expect.any(Object),
    );
  });

  // ── Supabase DB update after Stripe ──────────────────────────────

  it("updates the subscriptions row in DB after Stripe call", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: TEST_SUB_ACTIVE.stripe_subscription_id,
    });

    const selectBuilder = createChainableBuilder(TEST_SUB_ACTIVE);
    const updateBuilder = createChainableBuilder(null);
    // Capture args passed to update()
    let capturedUpdateData: unknown;
    updateBuilder.update = vi.fn((data: unknown) => {
      capturedUpdateData = data;
      return updateBuilder;
    });

    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? selectBuilder : updateBuilder;
    });

    const res = await POST();
    expect(res.status).toBe(200);

    expect(updateBuilder.update).toHaveBeenCalled();
    expect(capturedUpdateData).toMatchObject({ cancel_at_period_end: true });
    expect(
      (capturedUpdateData as Record<string, unknown>).updated_at,
    ).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
  });

  it("DB update uses stripe_subscription_id as the eq filter", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: TEST_SUB_ACTIVE.stripe_subscription_id,
    });

    const selectBuilder = createChainableBuilder(TEST_SUB_ACTIVE);
    const updateBuilder = createChainableBuilder(null);
    let eqArgs: unknown[];
    updateBuilder.eq = vi.fn((...args: unknown[]) => {
      eqArgs = args;
      return updateBuilder;
    });

    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? selectBuilder : updateBuilder;
    });

    await POST();

    expect(eqArgs!).toEqual([
      "stripe_subscription_id",
      TEST_SUB_ACTIVE.stripe_subscription_id,
    ]);
  });

  // ── Error handling ────────────────────────────────────────────────

  it("returns 500 when Stripe subscriptions.update throws", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockAdminFrom.mockImplementation(() => createChainableBuilder(TEST_SUB_ACTIVE));
    mockSubscriptionsUpdate.mockRejectedValue(
      new Error("Stripe rate limit exceeded"),
    );

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to cancel subscription");
  });

  it("returns 500 when admin subscriptions lookup throws", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    const builder = createChainableBuilder(null);
    builder.maybeSingle = vi.fn(() =>
      Promise.reject(new Error("DB connection error")),
    );
    mockAdminFrom.mockReturnValue(builder);

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to cancel subscription");
  });

  it("returns 500 when admin subscriptions update throws after Stripe succeeds", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockSubscriptionsUpdate.mockResolvedValue({
      id: TEST_SUB_ACTIVE.stripe_subscription_id,
    });

    const selectBuilder = createChainableBuilder(TEST_SUB_ACTIVE);
    const updateBuilder = createChainableBuilder(null);
    updateBuilder.eq = vi.fn(() =>
      Promise.reject(new Error("Supabase update failed")),
    );

    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? selectBuilder : updateBuilder;
    });

    const res = await POST();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to cancel subscription");
  });
});
