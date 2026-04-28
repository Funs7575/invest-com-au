import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "127.0.0.1",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

// Anthropic streaming mock
const _mockStreamOn = vi.fn();
const _mockStreamFinalMessage = vi.fn();
const mockMessagesStream = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: (...args: unknown[]) => mockMessagesStream(...args) },
  })),
}));

import { POST, GET, DELETE } from "@/app/api/concierge/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/concierge", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeGet(sessionId: string, ip = "1.2.3.4"): NextRequest {
  return new NextRequest(`http://localhost/api/concierge?session_id=${sessionId}`, {
    headers: { "x-forwarded-for": ip },
  });
}

function makeDelete(sessionId: string, ip = "1.2.3.4"): NextRequest {
  return new NextRequest(`http://localhost/api/concierge?session_id=${sessionId}`, {
    method: "DELETE",
    headers: { "x-forwarded-for": ip },
  });
}

function makeStreamResponse(textChunks: string[]) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const emitter = {
    on: vi.fn((event: string, fn: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(fn);
      // Immediately emit text events
      if (event === "text") {
        for (const chunk of textChunks) fn(chunk);
      }
      return emitter;
    }),
    finalMessage: vi.fn().mockResolvedValue({
      usage: { input_tokens: 50, output_tokens: 30 },
    }),
  };
  return emitter;
}

function makeInsert(result: { error: unknown } = { error: null }) {
  return { insert: vi.fn().mockResolvedValue(result) };
}

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.limit = vi.fn(() => Promise.resolve(result));
  c.delete = vi.fn(() => c);
  return c;
}

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/concierge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    process.env.ANTHROPIC_API_KEY = "sk-test";
    mockAdminFrom.mockReturnValue(makeInsert());
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ message: "hello" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for empty message", async () => {
    const res = await POST(makePost({ message: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid message/i);
  });

  it("returns 400 for message exceeding 4000 chars", async () => {
    const res = await POST(makePost({ message: "x".repeat(4001) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/concierge", {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4" },
      body: "{ bad json }",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(makePost({ message: "hello" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/ANTHROPIC_API_KEY/i);
  });

  it("returns SSE stream on success", async () => {
    const stream = makeStreamResponse(["Hello ", "world"]);
    mockMessagesStream.mockReturnValue(stream);

    const res = await POST(makePost({ message: "What brokers do you recommend?" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("returns stream with session_id event first", async () => {
    const stream = makeStreamResponse(["Hi"]);
    mockMessagesStream.mockReturnValue(stream);

    const res = await POST(makePost({ message: "hello", session_id: "valid-session-123" }));
    expect(res.status).toBe(200);

    // Collect SSE chunks
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    // First event should be session type
    expect(text).toContain('"type":"session"');
    expect(text).toContain('"session_id"');
  });

  it("persists user message to chatbot_conversations", async () => {
    const stream = makeStreamResponse(["ok"]);
    mockMessagesStream.mockReturnValue(stream);

    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    mockAdminFrom.mockReturnValue({ insert: insertSpy });

    await POST(makePost({ message: "Tell me about SMSF" }));

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", content: "Tell me about SMSF" })
    );
  });

  it("trims history to last 10 turns when building messages", async () => {
    const stream = makeStreamResponse(["ok"]);
    mockMessagesStream.mockReturnValue(stream);

    const longHistory = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turn ${i}`,
    }));

    await POST(makePost({ message: "final", history: longHistory }));

    const streamCall = mockMessagesStream.mock.calls[0][0] as { messages: unknown[] };
    // Should have trimmed history (10) + current user message (1) = 11
    expect(streamCall.messages.length).toBe(11);
  });

  it("handles stream error gracefully (still sends error SSE event)", async () => {
    const errorStream = {
      on: vi.fn((_event: string) => {
        return errorStream;
      }),
      finalMessage: vi.fn().mockRejectedValue(new Error("Anthropic error")),
    };
    mockMessagesStream.mockReturnValue(errorStream);

    const res = await POST(makePost({ message: "hello" }));
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    expect(text).toContain('"type":"error"');
  });
});

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/concierge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns empty messages for invalid session_id format", async () => {
    const res = await GET(makeGet("bad id!"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages).toEqual([]);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet("valid-session-1234567"));
    expect(res.status).toBe(429);
  });

  it("returns messages from DB ordered oldest-first", async () => {
    const dbMessages = [
      { role: "assistant", content: "Hi there", created_at: "2026-01-02T00:00:00Z" },
      { role: "user", content: "Hello", created_at: "2026-01-01T00:00:00Z" },
    ];
    mockAdminFrom.mockReturnValue(makeSelectChain({ data: dbMessages, error: null }));

    const res = await GET(makeGet("valid-session-1234567"));
    expect(res.status).toBe(200);
    const json = await res.json();
    // route fetches DESC by created_at then reverses → oldest-first.
    // Older row in dbMessages is the user message at 2026-01-01, so it
    // lands at index 0 in the response.
    expect(json.messages).toHaveLength(2);
    expect(json.messages[0]).toEqual({ role: "user", content: "Hello" });
    expect(json.messages[1]).toEqual({ role: "assistant", content: "Hi there" });
  });

  it("returns empty messages on DB error", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain({ data: null, error: { message: "db error" } }));
    const res = await GET(makeGet("valid-session-1234567"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.messages).toEqual([]);
  });
});

// ── DELETE tests ───────────────────────────────────────────────────────────────

describe("DELETE /api/concierge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 400 for invalid session_id format", async () => {
    const res = await DELETE(makeDelete("bad!"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await DELETE(makeDelete("valid-session-1234567"));
    expect(res.status).toBe(429);
  });

  it("returns ok:true on successful deletion", async () => {
    const deleteChain: Record<string, unknown> = {};
    deleteChain.delete = vi.fn(() => deleteChain);
    deleteChain.eq = vi.fn(() => Promise.resolve({ error: null }));
    mockAdminFrom.mockReturnValue(deleteChain);

    const res = await DELETE(makeDelete("valid-session-1234567"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 500 on DB error", async () => {
    const deleteChain: Record<string, unknown> = {};
    deleteChain.delete = vi.fn(() => deleteChain);
    deleteChain.eq = vi.fn(() => Promise.resolve({ error: { message: "db error" } }));
    mockAdminFrom.mockReturnValue(deleteChain);

    const res = await DELETE(makeDelete("valid-session-1234567"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
