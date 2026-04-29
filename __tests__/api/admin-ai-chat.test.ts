import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// vi.hoisted so mockMessagesCreate exists before the vi.mock factory runs
// (Anthropic is constructed at module init so the factory is called early).
const { mockMessagesCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: vi.fn(() => Promise.resolve({ data: 0 })),
  })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
}));

const mockPreCheckCaps = vi.fn();
const mockRecordUsage = vi.fn();
const mockCapRejectionPayload = vi.fn();
vi.mock("@/lib/ai-cost-caps", () => ({
  loadAdminAgentConfig: vi.fn(() => ({ maxDailyUsdPerUser: 5, maxDailyUsdGlobal: 50, alertAtPct: 80 })),
  preCheckCaps: (...a: unknown[]) => mockPreCheckCaps(...a),
  recordUsage: (...a: unknown[]) => mockRecordUsage(...a),
  capRejectionPayload: (...a: unknown[]) => mockCapRejectionPayload(...a),
}));

vi.mock("@/lib/ai-cost-alerts", () => ({
  sendCap80Alert: vi.fn(),
}));

import { POST } from "@/app/api/admin/ai-chat/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN = { email: "admin@test.com" };
const NON_ADMIN = { email: "user@other.com" };

function makePost(messages: unknown[]): NextRequest {
  return new NextRequest("http://localhost/api/admin/ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
}

function authAs(email: string | null) {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: null,
  });
}

// Creates an async iterable that yields the given SSE events, simulating the
// Anthropic streaming SDK response for an end_turn conversation turn.
function makeStreamEvents(extraEvents: object[] = []) {
  const events = [
    { type: "message_start", message: { usage: { input_tokens: 10 } } },
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    },
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "Hello, here is your answer." },
    },
    { type: "content_block_stop", index: 0 },
    {
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 15 },
    },
    ...extraEvents,
  ];

  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i < events.length) return { value: events[i++], done: false };
          return { value: undefined, done: true };
        },
      };
    },
  };
}

async function readSseEvents(res: Response): Promise<object[]> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  return raw
    .split("\n\n")
    .filter((s) => s.trim().startsWith("data: "))
    .map((s) => JSON.parse(s.trim().slice("data: ".length)));
}

function makeChain(result: unknown) {
  const self: Record<string, (...a: unknown[]) => unknown> = {};
  ["select", "eq", "update", "insert", "upsert", "order", "limit", "gte", "lt", "filter", "head"].forEach((k) => {
    self[k] = () => self;
  });
  self["single"] = () => Promise.resolve(result);
  self["maybeSingle"] = () => Promise.resolve(result);
  self["then"] = (cb: (v: unknown) => unknown) =>
    Promise.resolve(result).then(cb as Parameters<Promise<unknown>["then"]>[0]);
  return self;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/ai-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockPreCheckCaps.mockResolvedValue({ allowed: true });
    mockRecordUsage.mockResolvedValue({ crossed80Subject: false, crossed80Global: false });
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null, count: 0 }));
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns 401 when unauthenticated", async () => {
    authAs(null);
    const res = await POST(makePost([{ role: "user", content: "hello" }]));
    expect(res.status).toBe(401);
  });

  it("returns 401 when non-admin email", async () => {
    authAs(NON_ADMIN.email);
    const res = await POST(makePost([{ role: "user", content: "hello" }]));
    expect(res.status).toBe(401);
  });

  it("returns 500 when ANTHROPIC_API_KEY not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    authAs(ADMIN.email);
    const res = await POST(makePost([{ role: "user", content: "hello" }]));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns cost-cap rejection when preCheckCaps denies", async () => {
    authAs(ADMIN.email);
    mockPreCheckCaps.mockResolvedValue({ allowed: false, reason: "daily_cap_exceeded" });
    mockCapRejectionPayload.mockReturnValue({
      body: { error: "Daily cap exceeded", retryAfter: 86400 },
      status: 429,
      headers: { "Retry-After": "86400" },
    });
    const res = await POST(makePost([{ role: "user", content: "hello" }]));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/cap/i);
  });

  it("streams SSE events for a successful end_turn response", async () => {
    authAs(ADMIN.email);
    mockMessagesCreate.mockReturnValue(makeStreamEvents());
    const res = await POST(makePost([{ role: "user", content: "How many brokers?" }]));
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = await readSseEvents(res);
    expect(events.some((e) => (e as { type: string }).type === "text")).toBe(true);
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("records token usage after successful stream", async () => {
    authAs(ADMIN.email);
    mockMessagesCreate.mockReturnValue(makeStreamEvents());
    const res = await POST(makePost([{ role: "user", content: "ping" }]));
    // consume the stream to let the async controller finish
    await readSseEvents(res);
    // recordUsage is called once after the loop
    expect(mockRecordUsage).toHaveBeenCalledOnce();
    const [usageArg] = mockRecordUsage.mock.calls[0] as [{ subjectId: string; tokensIn: number; tokensOut: number }];
    expect(usageArg.subjectId).toBe("admin@test.com");
    expect(usageArg.tokensIn).toBe(10);
    expect(usageArg.tokensOut).toBe(15);
  });

  it("streams tool_start and tool_done events when tool_use stop_reason", async () => {
    authAs(ADMIN.email);

    // First iteration: tool_use stop_reason with get_site_stats tool call
    const iteration1Events = [
      { type: "message_start", message: { usage: { input_tokens: 20 } } },
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "tool_use", id: "tool1", name: "get_site_stats" },
      },
      { type: "content_block_stop", index: 0 },
      {
        type: "message_delta",
        delta: { stop_reason: "tool_use" },
        usage: { output_tokens: 5 },
      },
    ];

    // Second iteration: end_turn with the tool result incorporated
    const iteration2Events = [
      { type: "message_start", message: { usage: { input_tokens: 30 } } },
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
      {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "You have 15 active brokers." },
      },
      { type: "content_block_stop", index: 0 },
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 10 },
      },
    ];

    let callCount = 0;
    mockMessagesCreate.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? {
          [Symbol.asyncIterator]() {
            let i = 0;
            return {
              async next() {
                if (i < iteration1Events.length) return { value: iteration1Events[i++], done: false };
                return { value: undefined, done: true };
              },
            };
          },
        }
        : {
          [Symbol.asyncIterator]() {
            let i = 0;
            return {
              async next() {
                if (i < iteration2Events.length) return { value: iteration2Events[i++], done: false };
                return { value: undefined, done: true };
              },
            };
          },
        };
    });

    // Mock DB calls for get_site_stats
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null, count: 15 }));

    const res = await POST(makePost([{ role: "user", content: "How many brokers do we have?" }]));
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const events = await readSseEvents(res);
    const eventTypes = events.map((e) => (e as { type: string }).type);

    expect(eventTypes).toContain("tool_start");
    expect(eventTypes).toContain("tool_running");
    expect(eventTypes).toContain("tool_done");
    expect(eventTypes).toContain("text");
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
  });
});
