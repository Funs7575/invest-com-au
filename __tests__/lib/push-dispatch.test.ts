/**
 * Tests for lib/push-dispatch.ts
 *
 * Covers:
 *   - Multi-subscription delivery (all succeed)
 *   - Partial failure / failed-count tracking
 *   - 410 Gone pruning of stale subscriptions
 *   - 404 Not Found also triggers pruning
 *   - Opt-out (browser_push false / null) skips delivery
 *   - No subscriptions row skips delivery
 *   - Missing VAPID keys skips delivery
 *   - Unexpected DB error is swallowed (fire-and-forget safe)
 *   - Prune DB error is swallowed (result still returned)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { mockMaybeSingle, mockSubsQuery, mockDeleteIn, mockDeleteBuilder } =
  vi.hoisted(() => ({
    mockMaybeSingle: vi.fn(),
    mockSubsQuery: vi.fn(),
    mockDeleteIn: vi.fn(),
    mockDeleteBuilder: vi.fn(),
  }));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { dispatchPushToUser } from "@/lib/push-dispatch";

// ── Constants ──────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-abc";

const SUBS = [
  {
    id: "sub-1",
    endpoint: "https://push.example.com/sub1",
    keys_p256dh: "p256dh-1",
    keys_auth: "auth-1",
  },
  {
    id: "sub-2",
    endpoint: "https://push.example.com/sub2",
    keys_p256dh: "p256dh-2",
    keys_auth: "auth-2",
  },
];

const PAYLOAD = {
  title: "Savings rate alert",
  body: "Your threshold was crossed.",
  url: "/savings-accounts",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a FetchLike that always resolves with the given status */
function mockSender(status: number): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status });
}

/** Build a FetchLike that always rejects with a network error */
function failingSender(): ReturnType<typeof vi.fn> {
  return vi.fn().mockRejectedValue(new Error("network error"));
}

/** Build a FetchLike that resolves with the given status per call index */
function perCallSender(
  responses: Array<{ ok: boolean; status: number }>,
): ReturnType<typeof vi.fn> {
  let i = 0;
  return vi.fn().mockImplementation(() => Promise.resolve(responses[i++]));
}

function setupFrom({
  browserPush = true as boolean | null,
  subs = SUBS as typeof SUBS | null,
  subsError = null as null | { message: string },
  pruneError = null as null | { message: string },
} = {}) {
  mockMaybeSingle.mockResolvedValue({
    data: browserPush !== null ? { browser_push: browserPush } : null,
    error: null,
  });
  mockSubsQuery.mockResolvedValue({
    data: subs,
    error: subsError,
  });
  mockDeleteIn.mockResolvedValue({ error: pruneError });
  mockDeleteBuilder.mockReturnValue({ in: mockDeleteIn });

  mockFrom.mockImplementation((table: string) => {
    if (table === "notification_preferences") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      };
    }
    if (table === "push_subscriptions") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({ then: undefined, ...mockSubsQuery() }),
        delete: mockDeleteBuilder,
      };
    }
    return {};
  });

  // Redefine push_subscriptions eq to return the awaitable directly
  mockFrom.mockImplementation((table: string) => {
    if (table === "notification_preferences") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
      };
    }
    if (table === "push_subscriptions") {
      const subsBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: subs, error: subsError }),
        delete: mockDeleteBuilder,
      };
      return subsBuilder;
    }
    return {};
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("dispatchPushToUser", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      VAPID_PUBLIC_KEY: "vapid-pub",
      VAPID_PRIVATE_KEY: "vapid-priv",
    };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  // ── VAPID guard ──────────────────────────────────────────────────────────────

  it("returns empty result and skips when VAPID_PUBLIC_KEY is missing", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(sender).not.toHaveBeenCalled();
  });

  it("returns empty result and skips when VAPID_PRIVATE_KEY is missing", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(sender).not.toHaveBeenCalled();
  });

  // ── Opt-out guard ────────────────────────────────────────────────────────────

  it("skips delivery when browser_push preference is false", async () => {
    setupFrom({ browserPush: false });
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
  });

  it("skips delivery when no preference row exists (null)", async () => {
    setupFrom({ browserPush: null });
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
  });

  // ── No subscriptions ─────────────────────────────────────────────────────────

  it("skips delivery when user has no push_subscriptions rows", async () => {
    setupFrom({ subs: [] });
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
  });

  it("skips delivery when subscriptions query returns null", async () => {
    setupFrom({ subs: null });
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
  });

  it("returns early and does not throw when subscriptions query errors", async () => {
    setupFrom({ subsError: { message: "db error" } });
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(sender).not.toHaveBeenCalled();
  });

  // ── Successful delivery ──────────────────────────────────────────────────────

  it("sends to all subscriptions and returns correct sent count", async () => {
    setupFrom();
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.stale_removed).toBe(0);
    expect(sender).toHaveBeenCalledTimes(2);
  });

  it("sends the correct payload JSON to each endpoint", async () => {
    setupFrom();
    const sender = mockSender(201);
    await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    const [endpoint, init] = sender.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe(SUBS[0].endpoint);
    const sent = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sent.title).toBe(PAYLOAD.title);
    expect(sent.body).toBe(PAYLOAD.body);
    expect(sent.url).toBe(PAYLOAD.url);
  });

  it("uses custom icon and tag when provided", async () => {
    setupFrom();
    const sender = mockSender(201);
    await dispatchPushToUser(
      USER_ID,
      { ...PAYLOAD, icon: "/custom-icon.png", tag: "my-tag" },
      sender,
    );
    const [, init] = sender.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sent.icon).toBe("/custom-icon.png");
    expect(sent.tag).toBe("my-tag");
  });

  // ── Partial failure ──────────────────────────────────────────────────────────

  it("counts failed deliveries when sender returns non-2xx status", async () => {
    setupFrom();
    const sender = perCallSender([
      { ok: true, status: 201 },
      { ok: false, status: 500 },
    ]);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.stale_removed).toBe(0);
  });

  it("counts failed deliveries when sender rejects with network error", async () => {
    setupFrom();
    const sender = failingSender();
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
  });

  // ── 410 Gone / stale pruning ─────────────────────────────────────────────────

  it("prunes subscription by ID when push server returns 410 Gone", async () => {
    setupFrom();
    const sender = perCallSender([
      { ok: false, status: 410 }, // sub-1 is stale
      { ok: true, status: 201 },
    ]);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.stale_removed).toBe(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    // Verify delete was called with the stale ID
    expect(mockDeleteBuilder).toHaveBeenCalled();
    expect(mockDeleteIn).toHaveBeenCalledWith("id", ["sub-1"]);
  });

  it("prunes subscription when push server returns 404 Not Found", async () => {
    setupFrom();
    const sender = perCallSender([
      { ok: false, status: 404 },
      { ok: false, status: 404 },
    ]);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.stale_removed).toBe(2);
    expect(mockDeleteIn).toHaveBeenCalledWith("id", ["sub-1", "sub-2"]);
  });

  it("does not prune subscription when push server returns 500 (transient error)", async () => {
    setupFrom();
    const sender = mockSender(500);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.stale_removed).toBe(0);
    expect(mockDeleteBuilder).not.toHaveBeenCalled();
  });

  it("swallows prune DB error and still returns result", async () => {
    setupFrom({ pruneError: { message: "constraint violation" } });
    const sender = mockSender(410);
    // Should not throw even when prune fails
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
  });

  // ── Resilience ───────────────────────────────────────────────────────────────

  it("swallows unexpected thrown errors and returns empty result", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("catastrophic db failure");
    });
    const sender = mockSender(201);
    const result = await dispatchPushToUser(USER_ID, PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});
