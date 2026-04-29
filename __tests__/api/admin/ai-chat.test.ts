import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks (must be before route import) ────────────────────────────────────

const mockAuth = { getUser: vi.fn() };
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

const mockPreCheckCaps = vi.fn();
const mockRecordUsage = vi.fn();
const mockCapRejection = vi.fn();
const mockLoadAdminConfig = vi.fn();

vi.mock("@/lib/ai-cost-caps", () => ({
  loadAdminAgentConfig: (...a: unknown[]) => mockLoadAdminConfig(...a),
  preCheckCaps: (...a: unknown[]) => mockPreCheckCaps(...a),
  recordUsage: (...a: unknown[]) => mockRecordUsage(...a),
  capRejectionPayload: (...a: unknown[]) => mockCapRejection(...a),
  isCapsOverridden: vi.fn(() => false),
}));

vi.mock("@/lib/ai-cost-alerts", () => ({
  sendCap80Alert: vi.fn(async () => {}),
}));

const mockMessagesCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: (...a: unknown[]) => mockMessagesCreate(...a) },
  })),
}));

import { POST } from "@/app/api/admin/ai-chat/route";

// ── Helpers ─────────────────────────────────────────────────────────────────

const ADMIN_CAPS_CFG = {
  route: "admin-agent",
  subjectType: "email",
  perSubjectMicros: 50_000_000,
  globalMicros: 200_000_000,
  label: "Admin AI",
};

const CAPS_ALLOWED = { allowed: true, subjectMicros: 0, globalMicros: 0 };

function makePost(messages: unknown[] = []): NextRequest {
  return new NextRequest("http://localhost/api/admin/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

/** Collect all SSE data lines from the response body. */
async function collectSSE(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text();
  const parsed: Record<string, unknown>[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      try { parsed.push(JSON.parse(line.slice(6))); } catch { /* skip */ }
    }
  }
  return parsed;
}

/**
 * Build an async-iterable that yields Anthropic SSE-style raw events.
 * Simplest happy path: message_start → content_block_start(text) →
 * content_block_delta(text_delta) → content_block_stop → message_delta(end_turn).
 */
function makeEndTurnStream(text = "Here is your answer.") {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: "message_start", message: { usage: { input_tokens: 200 } } };
      yield { type: "content_block_start", index: 0, content_block: { type: "text" } };
      yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } };
      yield { type: "content_block_stop", index: 0 };
      yield { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 50 } };
    },
  };
}

/**
 * One tool-use iteration followed by an end_turn iteration.
 * first call → tool_use block; second call → end_turn text.
 */
function makeToolThenEndStream() {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount === 1) {
      return {
        [Symbol.asyncIterator]: async function* () {
          yield { type: "message_start", message: { usage: { input_tokens: 300 } } };
          yield {
            type: "content_block_start", index: 0,
            content_block: { type: "tool_use", name: "get_site_stats", id: "tool-1" },
          };
          yield { type: "content_block_stop", index: 0 };
          yield { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 80 } };
        },
      };
    }
    // second iteration: end_turn
    return makeEndTurnStream("Done — 42 active brokers.");
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/admin/ai-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockLoadAdminConfig.mockReturnValue(ADMIN_CAPS_CFG);
    mockPreCheckCaps.mockResolvedValue(CAPS_ALLOWED);
    mockRecordUsage.mockResolvedValue({
      subjectMicros: 0, globalMicros: 0, crossed80Subject: false, crossed80Global: false,
    });
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it("returns 401 when auth.getUser returns an error", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: new Error("jwt expired") });
    const res = await POST(makePost());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when authenticated user is not in ADMIN_EMAILS", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "hacker@evil.com" } }, error: null,
    });
    const res = await POST(makePost());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  // ── Missing API key ───────────────────────────────────────────────────────

  it("returns 500 when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });
    const res = await POST(makePost());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("ANTHROPIC_API_KEY");
  });

  // ── Cost cap ─────────────────────────────────────────────────────────────

  it("returns cap rejection response when preCheckCaps denies", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });
    mockPreCheckCaps.mockResolvedValue({ allowed: false, subjectMicros: 50_000_000, globalMicros: 0 });
    mockCapRejection.mockReturnValue({
      status: 429,
      headers: { "X-Cap-Rejected": "1" },
      body: { error: "Daily admin AI limit reached" },
    });

    const res = await POST(makePost());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Daily admin AI limit reached");
  });

  // ── SSE streaming ─────────────────────────────────────────────────────────

  it("returns SSE text/event-stream content-type on success", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });
    mockMessagesCreate.mockReturnValue(makeEndTurnStream());

    const res = await POST(makePost([{ role: "user", content: "hi" }]));
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.status).toBe(200);
  });

  it("emits text + done SSE events for end_turn response", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });
    mockMessagesCreate.mockReturnValue(makeEndTurnStream("Hello admin!"));

    const res = await POST(makePost([{ role: "user", content: "hello" }]));
    const events = await collectSSE(res);

    const textEvents = events.filter(e => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
    expect((textEvents[0] as { delta: string }).delta).toContain("Hello admin!");
    expect(events.at(-1)).toMatchObject({ type: "done" });
  });

  it("executes tool and continues loop for tool_use stop_reason", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });

    const factory = makeToolThenEndStream();
    mockMessagesCreate.mockImplementation(factory);

    // DB mock for get_site_stats — simplest approach: make every from() chain resolve OK
    const countChain = { count: 5, data: [], error: null };
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue(countChain),
          head: vi.fn().mockResolvedValue(countChain),
        }),
        gte: vi.fn().mockResolvedValue(countChain),
        head: vi.fn().mockResolvedValue(countChain),
        limit: vi.fn().mockResolvedValue(countChain),
      }),
      rpc: vi.fn().mockResolvedValue(countChain),
    });

    // createAdminClient needs rpc too (used directly in get_site_stats)
    const { createAdminClient } = await import("@/lib/supabase/admin");
    vi.mocked(createAdminClient).mockReturnValue({
      from: mockAdminFrom,
      rpc: vi.fn().mockResolvedValue({ data: 3, error: null }),
    } as ReturnType<typeof createAdminClient>);

    const res = await POST(makePost([{ role: "user", content: "stats" }]));
    expect(res.status).toBe(200);

    // Drain stream FIRST — the agentic loop runs lazily inside the ReadableStream
    const events = await collectSSE(res);

    // After draining, both iterations should have run
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    const types = events.map(e => e.type);
    expect(types).toContain("tool_start");
    expect(types).toContain("done");
  });

  // ── Error paths ───────────────────────────────────────────────────────────

  it("sends billing error SSE event when Anthropic returns credit-balance error", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });
    mockMessagesCreate.mockImplementation(() => {
      const err = new Error("Your credit balance is too low to complete this request.");
      (err as { status?: number }).status = 402;
      throw err;
    });

    const res = await POST(makePost([{ role: "user", content: "test" }]));
    expect(res.status).toBe(200); // SSE always 200
    const events = await collectSSE(res);
    const errorEvent = events.find(e => e.type === "error") as { message?: string } | undefined;
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.message).toContain("Anthropic API credits exhausted");
  });

  it("sends generic error SSE event on unexpected stream failure", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });
    mockMessagesCreate.mockImplementation(() => {
      throw new Error("Network timeout");
    });

    const res = await POST(makePost([{ role: "user", content: "test" }]));
    expect(res.status).toBe(200);
    const events = await collectSSE(res);
    const errorEvent = events.find(e => e.type === "error") as { message?: string } | undefined;
    expect(errorEvent?.message).toContain("Network timeout");
  });

  // ── Usage recording ───────────────────────────────────────────────────────

  it("calls recordUsage with accumulated token counts after stream completes", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });
    mockMessagesCreate.mockReturnValue(makeEndTurnStream());

    const res = await POST(makePost([{ role: "user", content: "hi" }]));
    await collectSSE(res); // drain stream so finally block runs

    expect(mockRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: "admin@invest.com.au",
        tokensIn: 200,
        tokensOut: 50,
      })
    );
  });

  it("passes subjectId as lowercase email to preCheckCaps", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "Admin@Invest.com.au" } }, error: null,
    });
    // ADMIN_EMAILS mock contains lowercase; uppercase input must be downcased
    // Re-mock admin to accept uppercase-email user
    vi.mocked(await import("@/lib/admin")).ADMIN_EMAILS.push("admin@invest.com.au");
    mockMessagesCreate.mockReturnValue(makeEndTurnStream());

    await POST(makePost());
    expect(mockPreCheckCaps).toHaveBeenCalledWith(
      "admin@invest.com.au",
      expect.any(Object)
    );
  });

  // ── query_table allowlist ─────────────────────────────────────────────────

  it("executeTool rejects disallowed table in query_table", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } }, error: null,
    });

    // First call: tool_use for query_table with disallowed table
    let callCount = 0;
    mockMessagesCreate.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          [Symbol.asyncIterator]: async function* () {
            yield { type: "message_start", message: { usage: { input_tokens: 100 } } };
            yield {
              type: "content_block_start", index: 0,
              content_block: { type: "tool_use", name: "query_table", id: "tool-q" },
            };
            yield {
              type: "content_block_delta", index: 0,
              delta: { type: "input_json_delta", partial_json: JSON.stringify({ table: "admin_secrets" }) },
            };
            yield { type: "content_block_stop", index: 0 };
            yield { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 30 } };
          },
        };
      }
      return makeEndTurnStream("Got table error");
    });

    const res = await POST(makePost([{ role: "user", content: "get secrets" }]));
    expect(res.status).toBe(200);

    // Drain stream first — second messages.create runs lazily inside the ReadableStream
    await collectSSE(res);

    // Second messages.create should receive a tool_result with an error message
    const secondCall = mockMessagesCreate.mock.calls[1]?.[0];
    const lastUserMsg = secondCall?.messages?.at(-1);
    const toolResult = Array.isArray(lastUserMsg?.content) ? lastUserMsg.content[0] : null;
    expect(toolResult?.content).toContain("not accessible");
  });
});
