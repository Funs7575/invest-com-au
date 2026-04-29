import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/push/send/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_KEY = "test-admin-key";

function makePost(body: unknown, adminKey?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (adminKey !== undefined) headers["x-admin-key"] = adminKey;
  return new NextRequest("http://localhost/api/push/send", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  topic: "deals",
  title: "Hot new deal!",
  body: "Check out this exclusive offer.",
  url: "https://invest.com.au/deals",
};

const SUBSCRIPTIONS = [
  { endpoint: "https://fcm.push.example/notify", keys_p256dh: "key1", keys_auth: "auth1" },
];

function setupFromMock(opts: {
  recentSends?: { id: string }[];
  subscriptions?: typeof SUBSCRIPTIONS;
} = {}) {
  const { recentSends = [], subscriptions = SUBSCRIPTIONS } = opts;

  mockFrom.mockImplementation((table: string) => {
    if (table === "push_send_log") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: recentSends }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === "push_subscriptions") {
      return {
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockResolvedValue({ data: subscriptions }),
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/push/send", () => {
  const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_KEY = ADMIN_KEY;
    process.env.VAPID_PUBLIC_KEY = "pubkey123";
    process.env.VAPID_PRIVATE_KEY = "privkey456";
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockResolvedValue(new Response("", { status: 201 }));
    setupFromMock();
  });

  it("returns 401 when x-admin-key is missing", async () => {
    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when x-admin-key is wrong", async () => {
    const res = await POST(makePost(VALID_BODY, "bad-key"));
    expect(res.status).toBe(401);
  });

  it("accepts auth via Authorization header Bearer", async () => {
    setupFromMock({ recentSends: [], subscriptions: [] });
    const req = new NextRequest("http://localhost/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${ADMIN_KEY}`,
      },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid topic", async () => {
    const res = await POST(makePost({ ...VALID_BODY, topic: "invalid_topic" }, ADMIN_KEY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid topic/);
  });

  it("returns 400 when required fields (title/body/url) are missing", async () => {
    const res = await POST(makePost({ topic: "deals" }, ADMIN_KEY));
    expect(res.status).toBe(400);
  });

  it("returns 429 when a push for the same topic was sent within the last hour", async () => {
    setupFromMock({ recentSends: [{ id: "recent-1" }] });
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(429);
  });

  it("returns 500 when VAPID keys are not configured", async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(500);
  });

  it("returns 200 with sent=0 when no subscribers for the topic", async () => {
    setupFromMock({ subscriptions: [] });
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(0);
    expect(json.message).toMatch(/No subscribers/);
  });

  it("returns 200 with sent count when push succeeds", async () => {
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.sent).toBe(1);
    expect(json.failed).toBe(0);
  });

  it("cleans up stale endpoints that return 410", async () => {
    mockFetch.mockResolvedValueOnce(new Response("", { status: 410 }));

    let deleteCalledWith: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === "push_send_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "push_subscriptions") {
        return {
          select: vi.fn().mockReturnThis(),
          contains: vi.fn().mockResolvedValue({ data: SUBSCRIPTIONS }),
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockImplementation((_, endpoints: string[]) => {
            deleteCalledWith = endpoints;
            return Promise.resolve({ error: null });
          }),
        };
      }
      return {};
    });

    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(200);
    expect(deleteCalledWith).toContain("https://fcm.push.example/notify");
  });

  it("returns 500 on internal error", async () => {
    mockFrom.mockImplementation(() => { throw new Error("DB gone"); });
    const res = await POST(makePost(VALID_BODY, ADMIN_KEY));
    expect(res.status).toBe(500);
  });
});
