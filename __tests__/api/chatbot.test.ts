import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  // Deterministic, IP-derived key so the IP-limiter test can hold the bucket
  // across requests that rotate session_id.
  ipKey: (req: { headers: Headers }) =>
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "test-ip",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockRespondToMessage = vi.fn();
vi.mock("@/lib/chatbot", () => ({
  respondToMessage: (...args: unknown[]) => mockRespondToMessage(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/chatbot/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const CHAT_RESULT = {
  provider: "claude" as const,
  model: "claude-3-5-haiku",
  reply: "Based on our data, CommSec offers competitive brokerage fees.",
  retrieved: [{ document_type: "broker", document_id: "commsec", title: "CommSec", body_excerpt: "...", score: 0.92 }],
  flagged: false,
  flaggedReason: null,
  tokensIn: 120,
  tokensOut: 80,
};

function makeConversationSelectChain(result: { data: unknown[]; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.limit = vi.fn(() => Promise.resolve(result));
  return c;
}

function makeInsertChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/chatbot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 400 when session_id is missing", async () => {
    const res = await POST(makePost({ message: "Hello" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/session_id|message/i);
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(makePost({ session_id: "sess-abc" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/session_id|message/i);
  });

  it("returns 400 when message exceeds 2000 characters", async () => {
    const res = await POST(makePost({ session_id: "sess-abc", message: "x".repeat(2001) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too long/i);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ session_id: "sess-abc", message: "hello" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many/i);
  });

  it("checks an IP-keyed bucket so the cap survives session_id rotation (wallet-DoS guard)", async () => {
    // Model the limiter as two independent buckets. The per-session bucket is
    // keyed on the client-supplied session_id (and so resets when an attacker
    // rotates it); the IP bucket is keyed on the request IP and persists across
    // requests from the same IP regardless of session. The IP bucket starts
    // depleted, so even a fresh session_id from the same IP must be rejected.
    const sessionBuckets = new Map<string, number>();
    let ipTokens = 0; // IP bucket already exhausted for this IP
    mockIsAllowed.mockImplementation(
      async (scope: string, key: string) => {
        if (scope === "chatbot_ip") {
          if (ipTokens < 1) return false;
          ipTokens -= 1;
          return true;
        }
        // per-session bucket: each distinct session gets a fresh allowance
        const remaining = sessionBuckets.get(key) ?? 20;
        if (remaining < 1) return false;
        sessionBuckets.set(key, remaining - 1);
        return true;
      },
    );

    const ip = { "x-forwarded-for": "203.0.113.7" };

    // 1st request: brand-new session_id, but the IP bucket is empty → 429.
    const res1 = await POST(makePost({ session_id: "sess-1", message: "hi" }, ip));
    expect(res1.status).toBe(429);

    // 2nd request: DIFFERENT session_id (rotated, as an attacker would) from the
    // SAME IP. The per-session bucket is fresh, but the IP bucket still holds →
    // still 429. This is the property that closes the provider-bill DoS.
    const res2 = await POST(makePost({ session_id: "sess-2", message: "hi" }, ip));
    expect(res2.status).toBe(429);

    // The IP-keyed bucket was consulted for both requests.
    const ipCalls = mockIsAllowed.mock.calls.filter((c) => c[0] === "chatbot_ip");
    expect(ipCalls.length).toBe(2);
    expect(ipCalls.every((c) => c[1] === "203.0.113.7")).toBe(true);
  });

  it("allows when both IP and session buckets have capacity", async () => {
    mockIsAllowed.mockResolvedValue(true);
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationSelectChain({ data: [], error: null });
      return makeInsertChain({ error: null });
    });
    mockRespondToMessage.mockResolvedValue(CHAT_RESULT);

    const res = await POST(
      makePost({ session_id: "sess-ok", message: "hi" }, { "x-forwarded-for": "198.51.100.4" }),
    );
    expect(res.status).toBe(200);
    // Both buckets were checked, IP first.
    const scopes = mockIsAllowed.mock.calls.map((c) => c[0]);
    expect(scopes).toContain("chatbot_ip");
    expect(scopes).toContain("chatbot");
  });

  it("returns 200 with reply on success", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationSelectChain({ data: [], error: null });
      return makeInsertChain({ error: null });
    });
    mockRespondToMessage.mockResolvedValue(CHAT_RESULT);

    const res = await POST(makePost({ session_id: "sess-abc", message: "Tell me about CommSec" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe(CHAT_RESULT.reply);
    expect(json.retrieved).toHaveLength(1);
    expect(json.flagged).toBe(false);
    expect(json.provider).toBe("claude");
  });

  it("passes prior conversation history to respondToMessage", async () => {
    const priorTurns = [
      { role: "user", content: "What is SMSF?" },
      { role: "assistant", content: "SMSF stands for..." },
    ];
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeConversationSelectChain({ data: priorTurns, error: null });
      return makeInsertChain({ error: null });
    });
    mockRespondToMessage.mockResolvedValue(CHAT_RESULT);

    await POST(makePost({ session_id: "sess-abc", message: "Tell me more" }));

    const [, , , conversationArg] = mockRespondToMessage.mock.calls[0] as [unknown, unknown, unknown, unknown[]];
    expect(conversationArg).toHaveLength(2);
  });

  it("passes user_key to respondToMessage when provided", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationSelectChain({ data: [], error: null });
      return makeInsertChain({ error: null });
    });
    mockRespondToMessage.mockResolvedValue(CHAT_RESULT);

    await POST(makePost({ session_id: "sess-abc", message: "Hello", user_key: "uk-999" }));
    const [, , userKeyArg] = mockRespondToMessage.mock.calls[0] as [unknown, unknown, string];
    expect(userKeyArg).toBe("uk-999");
  });

  it("still returns 200 when conversation insert fails (fire-and-forget)", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationSelectChain({ data: [], error: null });
      return makeInsertChain({ error: { message: "insert failed" } });
    });
    mockRespondToMessage.mockResolvedValue(CHAT_RESULT);

    const res = await POST(makePost({ session_id: "sess-abc", message: "hello" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe(CHAT_RESULT.reply);
  });

  it("surfaces flagged:true when respondToMessage flags the reply", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeConversationSelectChain({ data: [], error: null });
      return makeInsertChain({ error: null });
    });
    mockRespondToMessage.mockResolvedValue({
      ...CHAT_RESULT,
      flagged: true,
      flaggedReason: "Contains financial advice",
    });

    const res = await POST(makePost({ session_id: "sess-abc", message: "should I invest?" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.flagged).toBe(true);
    expect(json.flaggedReason).toBe("Contains financial advice");
  });

  it("returns 400 when request body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/chatbot", {
      method: "POST",
      body: "{ bad json }",
    });
    // Invalid JSON is caught by .catch(() => ({})) in the route — returns 400
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
