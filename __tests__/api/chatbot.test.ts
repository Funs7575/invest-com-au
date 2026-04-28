import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
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

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chatbot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
