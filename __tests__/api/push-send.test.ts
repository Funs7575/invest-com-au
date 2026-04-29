import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

import { POST } from "@/app/api/push/send/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_KEY = "test-admin-key-xyz";

function makePost(body: unknown, key?: string): NextRequest {
  return new NextRequest("http://localhost/api/push/send", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "x-admin-key": key } : {}),
    },
  });
}

const VALID_BODY = {
  topic: "fee_changes",
  title: "Fee update",
  body: "New brokerage rates available",
  url: "https://invest.com.au/brokers",
};

const SUBSCRIPTIONS = [
  { endpoint: "https://fcm.example.com/sub1", keys_p256dh: "k1", keys_auth: "a1" },
  { endpoint: "https://fcm.example.com/sub2", keys_p256dh: "k2", keys_auth: "a2" },
];

function fromImpl({
  recentSends = [] as unknown[],
  subscriptions = SUBSCRIPTIONS as unknown[],
  insertError = null as unknown,
  deleteError = null as unknown,
} = {}) {
  return vi.fn().mockImplementation((table: string) => {
    if (table === "push_send_log") {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.gte = vi.fn(() => c);
      c.limit = vi.fn().mockResolvedValue({ data: recentSends, error: null });
      c.insert = vi.fn().mockResolvedValue({ error: insertError });
      return c;
    }
    if (table === "push_subscriptions") {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.contains = vi.fn().mockResolvedValue({ data: subscriptions, error: null });
      c.delete = vi.fn(() => c);
      c.in = vi.fn().mockResolvedValue({ error: deleteError });
      return c;
    }
    const c: Record<string, unknown> = {};
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    return c;
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/push/send", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      ADMIN_API_KEY: ADMIN_KEY,
      VAPID_PUBLIC_KEY: "vapid-pub-key",
      VAPID_PRIVATE_KEY: "vapid-priv-key",
    };
    fetchMock.mockResolvedValue(new Response("", { status: 201 }));
    mockAdminFrom.mockImplementation(() => fromImpl()());
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 401 when x-admin-key is absent", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when x-admin-key is wrong", async () => {
    const res = await POST(makePost(VALID_BODY, "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("accepts Bearer auth header as alternative to x-admin-key", async () => {
    mockAdminFrom.mockImplementation(fromImpl());
    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${ADMIN_KEY}`,
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid topic", async () => {
    const res = await POST(makePost({ ...VALID_BODY, topic: "invalid_topic" }, ADMIN_KEY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid topic/i);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makePost({ topic: "deals", body: "x", url: "https://x.com" }, ADMIN_KEY));
    expect(res.status).toBe(400);
  });

  it("returns 429 when topic was sent within the last hour", async () => {
    mockAdminFrom.mockImplementation(fromImpl({ recentSends: [{ id: 1 }] }));
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/rate limited/i);
  });

  it("returns 500 when VAPID keys are not configured", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    mockAdminFrom.mockImplementation(fromImpl({ recentSends: [] }));
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/VAPID/i);
  });

  it("returns 200 with sent:0 when no subscribers exist", async () => {
    mockAdminFrom.mockImplementation(fromImpl({ subscriptions: [] }));
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(0);
  });

  it("returns 200 with correct sent count on successful delivery", async () => {
    mockAdminFrom.mockImplementation(fromImpl());
    fetchMock.mockResolvedValue(new Response("", { status: 201 }));
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(2);
    expect(json.failed).toBe(0);
  });

  it("counts failed deliveries when push endpoint returns error", async () => {
    mockAdminFrom.mockImplementation(fromImpl());
    fetchMock.mockRejectedValue(new Error("network error"));
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.failed).toBe(2);
    expect(json.sent).toBe(0);
  });

  it("removes stale subscriptions (410/404) after delivery failures", async () => {
    const staleEndpoint = "https://fcm.example.com/stale";
    const staleSubscriptions = [{ endpoint: staleEndpoint, keys_p256dh: "k", keys_auth: "a" }];

    const deleteInMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn(() => ({ in: deleteInMock }));

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "push_send_log") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.gte = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = vi.fn().mockResolvedValue({ error: null });
        return c;
      }
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.contains = vi.fn().mockResolvedValue({ data: staleSubscriptions, error: null });
      c.delete = deleteMock;
      return c;
    });

    // Return 410 Gone to signal stale subscription
    fetchMock.mockResolvedValue(new Response("", { status: 410 }));

    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stale_removed).toBe(1);
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteInMock).toHaveBeenCalledWith("endpoint", [staleEndpoint]);
  });

  it("logs the send in push_send_log with correct fields", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "push_send_log") {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.gte = vi.fn(() => c);
        c.limit = vi.fn().mockResolvedValue({ data: [], error: null });
        c.insert = insertMock;
        return c;
      }
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.contains = vi.fn().mockResolvedValue({ data: SUBSCRIPTIONS, error: null });
      c.delete = vi.fn(() => ({ in: vi.fn().mockResolvedValue({ error: null }) }));
      return c;
    });

    fetchMock.mockResolvedValue(new Response("", { status: 201 }));
    await POST(makePost(VALID_BODY, ADMIN_KEY));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "fee_changes", title: "Fee update" })
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("db crash");
    });
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(500);
  });
});
