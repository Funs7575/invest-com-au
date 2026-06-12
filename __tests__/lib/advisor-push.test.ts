/**
 * Tests for lib/advisor-push.ts (Adviser Push Command Centre dispatcher).
 *
 * Covers:
 *   - Flag off ⇒ no send, no DB touch (dormancy)
 *   - Missing VAPID keys ⇒ no send
 *   - Preference off for the event ⇒ that subscription is skipped
 *   - Missing preference key ⇒ fail-open (still sends)
 *   - Happy path delivery to multiple subscriptions + payload shape
 *   - 410 / 404 stale-endpoint pruning
 *   - Subscription fetch error (e.g. column absent) ⇒ swallowed, skipped
 *   - Push send error ⇒ fail-soft (failed counted, never throws)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/vapid-jwt", () => ({
  buildVapidAuthHeader: vi.fn(async () => "vapid t=mock.jwt.sig, k=mock-pub"),
}));

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

const { mockSelectEq2, mockDeleteIn } = vi.hoisted(() => ({
  mockSelectEq2: vi.fn(),
  mockDeleteIn: vi.fn(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { dispatchPushToAdvisor } from "@/lib/advisor-push";

const PRO_ID = 42;
const PAYLOAD = {
  title: "New matching brief",
  body: "SMSF setup · NSW",
  url: "/advisor-portal/briefs",
};

function row(id: string, prefs: Record<string, unknown> | null) {
  return {
    id,
    endpoint: `https://push.example.com/${id}`,
    keys_p256dh: `p-${id}`,
    keys_auth: `a-${id}`,
    notification_prefs: prefs,
  };
}

function mockSender(status: number): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status });
}

function perCallSender(
  responses: Array<{ ok: boolean; status: number }>,
): ReturnType<typeof vi.fn> {
  let i = 0;
  return vi.fn().mockImplementation(() => Promise.resolve(responses[i++]));
}

/**
 * push_subscriptions chain: select(...).eq("owner_kind",..).eq("professional_id",..)
 * → resolves to { data, error }. delete().in(...) → { error }.
 */
function setupFrom({
  subs = [] as ReturnType<typeof row>[] | null,
  subsError = null as null | { message: string },
  pruneError = null as null | { message: string },
} = {}) {
  mockSelectEq2.mockResolvedValue({ data: subs, error: subsError });
  mockDeleteIn.mockResolvedValue({ error: pruneError });

  mockFrom.mockImplementation((table: string) => {
    if (table === "push_subscriptions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ eq: mockSelectEq2 }),
        }),
        delete: vi.fn().mockReturnValue({ in: mockDeleteIn }),
      };
    }
    return {};
  });
}

describe("dispatchPushToAdvisor", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" };
    mockIsFlagEnabled.mockResolvedValue(true);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("no-ops when the advisor_push flag is off (dormant) — no DB touch, no send", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const sender = mockSender(201);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("evaluates the flag with the advisor segment", async () => {
    setupFrom({ subs: [] });
    await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, mockSender(201));
    expect(mockIsFlagEnabled).toHaveBeenCalledWith("advisor_push", { segment: "advisor" });
  });

  it("skips when VAPID keys are missing", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const sender = mockSender(201);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(sender).not.toHaveBeenCalled();
  });

  it("skips a subscription whose preference for the event is false", async () => {
    setupFrom({ subs: [row("s1", { new_brief: false })] });
    const sender = mockSender(201);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
  });

  it("fail-opens when the preference key is absent (still sends)", async () => {
    setupFrom({ subs: [row("s1", { new_message: false })] }); // unrelated key
    const sender = mockSender(201);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.sent).toBe(1);
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it("delivers to all enabled subscriptions and sends the expected payload + tag", async () => {
    setupFrom({ subs: [row("s1", null), row("s2", { new_brief: true })] });
    const sender = mockSender(201);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(sender).toHaveBeenCalledTimes(2);

    const [, init] = sender.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      title: "New matching brief",
      body: "SMSF setup · NSW",
      url: "/advisor-portal/briefs",
      tag: "advisor-new_brief", // default tag derived from the event
    });
    expect(init.headers).toMatchObject({ Authorization: "vapid t=mock.jwt.sig, k=mock-pub" });
  });

  it("uses an explicit payload tag when provided", async () => {
    setupFrom({ subs: [row("s1", null)] });
    const sender = mockSender(201);
    await dispatchPushToAdvisor(
      PRO_ID,
      "new_brief",
      { ...PAYLOAD, tag: "advisor-new_brief-99" },
      sender,
    );
    const [, init] = sender.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).tag).toBe("advisor-new_brief-99");
  });

  it("prunes stale endpoints on 410 Gone", async () => {
    setupFrom({ subs: [row("s1", null), row("s2", null)] });
    const sender = perCallSender([
      { ok: false, status: 410 },
      { ok: true, status: 201 },
    ]);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.stale_removed).toBe(1);
    expect(mockDeleteIn).toHaveBeenCalledWith("id", ["s1"]);
  });

  it("prunes on 404 Not Found too", async () => {
    setupFrom({ subs: [row("s1", null)] });
    const sender = mockSender(404);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.failed).toBe(1);
    expect(result.stale_removed).toBe(1);
    expect(mockDeleteIn).toHaveBeenCalledWith("id", ["s1"]);
  });

  it("does NOT prune on a transient 500 (failed, not stale)", async () => {
    setupFrom({ subs: [row("s1", null)] });
    const sender = mockSender(500);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.failed).toBe(1);
    expect(result.stale_removed).toBe(0);
    expect(mockDeleteIn).not.toHaveBeenCalled();
  });

  it("swallows a subscription-fetch error (e.g. column absent) and skips", async () => {
    setupFrom({ subs: null, subsError: { message: "column does not exist" } });
    const sender = mockSender(201);
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.sent).toBe(0);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
  });

  it("is fail-soft when the push send rejects (never throws)", async () => {
    setupFrom({ subs: [row("s1", null)] });
    const sender = vi.fn().mockRejectedValue(new Error("network error"));
    const result = await dispatchPushToAdvisor(PRO_ID, "new_brief", PAYLOAD, sender);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("reports skipped_no_sub when the advisor has no subscriptions", async () => {
    setupFrom({ subs: [] });
    const sender = mockSender(201);
    const result = await dispatchPushToAdvisor(PRO_ID, "sla_warning", PAYLOAD, sender);
    expect(result.skipped_no_sub).toBe(true);
    expect(sender).not.toHaveBeenCalled();
  });
});
