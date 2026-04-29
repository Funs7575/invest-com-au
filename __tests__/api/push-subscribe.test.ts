import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown");

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/push/subscribe/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeValidBody(overrides = {}) {
  return {
    subscription: {
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      keys: { p256dh: "key-p256dh", auth: "key-auth" },
    },
    topics: ["fee_changes"],
    ...overrides,
  };
}

function makeUpsertBuilder(error: unknown = null) {
  return {
    upsert: vi.fn(() => Promise.resolve({ error })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/push/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(429);
  });

  it("returns 400 when subscription object is missing endpoint", async () => {
    const res = await POST(makeRequest({ subscription: { keys: { p256dh: "k", auth: "a" } }, topics: ["fee_changes"] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/subscription/i);
  });

  it("returns 400 when subscription keys are missing", async () => {
    const res = await POST(makeRequest({ subscription: { endpoint: "https://fcm.x", keys: {} }, topics: ["fee_changes"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no valid topics provided", async () => {
    const res = await POST(makeRequest(makeValidBody({ topics: ["invalid_topic"] })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/topic/i);
  });

  it("returns 400 when topics array is empty", async () => {
    const res = await POST(makeRequest(makeValidBody({ topics: [] })));
    expect(res.status).toBe(400);
  });

  it("returns 200 with success and filtered topics on valid request", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertBuilder());
    const res = await POST(makeRequest(makeValidBody({ topics: ["fee_changes", "deals", "bad_topic"] })));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.topics).toEqual(["fee_changes", "deals"]);
  });

  it("calls upsert with correct fields", async () => {
    const builder = makeUpsertBuilder();
    mockAdminFrom.mockReturnValue(builder);
    await POST(makeRequest(makeValidBody()));
    expect(mockAdminFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
        keys_p256dh: "key-p256dh",
        keys_auth: "key-auth",
        topics: ["fee_changes"],
      }),
      { onConflict: "endpoint" },
    );
  });

  it("returns 500 when upsert fails", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertBuilder({ message: "DB error" }));
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(500);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
