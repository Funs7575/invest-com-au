import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockGetUser = vi.fn();
const mockRpc = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

// Stable handle to the Anthropic messages.create mock. `new Anthropic()` runs
// at module load, so the factory must close over a hoisted fn we can script.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(() => ({ messages: { create: mockCreate } })),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: vi.fn(async () => true),
}));

vi.mock("@/lib/ai-cost-caps", () => ({
  loadAdminAgentConfig: vi.fn(() => ({
    label: "admin-ai",
    subjectType: "user",
    perSubjectMicros: 1_000_000,
    globalMicros: 10_000_000,
  })),
  preCheckCaps: vi.fn(async () => ({ allowed: true })),
  recordUsage: vi.fn(async () => ({ crossed80Subject: false, subjectMicros: 0 })),
  capRejectionPayload: vi.fn(() => ({ body: { error: "cap exceeded" }, status: 429, headers: {} })),
}));

vi.mock("@/lib/ai-cost-alerts", () => ({
  sendCap80Alert: vi.fn(async () => {}),
}));

vi.mock("@/lib/compliance", () => ({
  filterFactualOutput: vi.fn(() => ({ ok: true })),
}));

import { POST } from "@/app/api/admin/ai-chat/route";
import { isFlagEnabled } from "@/lib/feature-flags";
import { preCheckCaps, recordUsage, capRejectionPayload } from "@/lib/ai-cost-caps";
import { sendCap80Alert } from "@/lib/ai-cost-alerts";
import { filterFactualOutput } from "@/lib/compliance";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/ai-chat", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

// ── Anthropic streaming-event builders ───────────────────────────────────────
// The route consumes `for await (const event of response)` from a stream:true
// call. These helpers produce single-use async iterables matching the SDK's
// event shape the route reads (message_start, content_block_*, message_delta).

interface StreamEvent {
  type: string;
  [k: string]: unknown;
}
function streamOf(events: StreamEvent[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e;
    },
  };
}

function toolUseTurn(tools: { name: string; id: string; input: object }[]) {
  const events: StreamEvent[] = [{ type: "message_start", message: { usage: { input_tokens: 10 } } }];
  tools.forEach((t, i) => {
    events.push({ type: "content_block_start", index: i, content_block: { type: "tool_use", id: t.id, name: t.name, input: {} } });
    events.push({ type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: JSON.stringify(t.input) } });
    events.push({ type: "content_block_stop", index: i });
  });
  events.push({ type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 20 } });
  return streamOf(events);
}

function textTurn(text: string, stopReason = "end_turn") {
  return streamOf([
    { type: "message_start", message: { usage: { input_tokens: 5 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: stopReason }, usage: { output_tokens: 8 } },
  ]);
}

/** Drain the SSE ReadableStream body to a string. */
async function readSse(res: Response): Promise<string> {
  return await res.text();
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("/api/admin/ai-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
    mockFrom.mockImplementation(() => makeBuilder());
    // clearAllMocks() wipes call data but NOT implementations set via
    // mockResolvedValue in individual tests, so restore the defaults each run
    // (otherwise e.g. the flag-off test's `false` leaks into later tests).
    vi.mocked(isFlagEnabled).mockResolvedValue(true);
    vi.mocked(preCheckCaps).mockResolvedValue({ allowed: true } as never);
    vi.mocked(capRejectionPayload).mockReturnValue({ body: { error: "cap exceeded" }, status: 429, headers: {} } as never);
    vi.mocked(recordUsage).mockResolvedValue({ crossed80Subject: false, subjectMicros: 0 } as never);
    vi.mocked(filterFactualOutput).mockReturnValue({ ok: true } as never);
    vi.mocked(sendCap80Alert).mockResolvedValue(undefined as never);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Guard clauses ──────────────────────────────────────────────────────────

  it("denies unauthenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it("denies non-admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 503 when ai_generation flag is off", async () => {
    const { isFlagEnabled } = await import("@/lib/feature-flags");
    vi.mocked(isFlagEnabled).mockResolvedValue(false);
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(503);
  });

  it("returns 500 when ANTHROPIC_API_KEY is not configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(makeReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns the cap-rejection payload when preCheckCaps denies", async () => {
    const { preCheckCaps, capRejectionPayload } = await import("@/lib/ai-cost-caps");
    vi.mocked(preCheckCaps).mockResolvedValue({ allowed: false } as never);
    vi.mocked(capRejectionPayload).mockReturnValue({ body: { error: "daily cap" }, status: 429, headers: {} } as never);
    const res = await POST(makeReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/cap/i);
  });

  // ── Streaming happy path ─────────────────────────────────────────────────────

  it("streams a text reply and closes on end_turn", async () => {
    mockCreate.mockResolvedValueOnce(textTurn("Here are your site stats."));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "stats?" }] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const sse = await readSse(res);
    expect(sse).toContain("Here are your site stats.");
    expect(sse).toContain('"type":"done"');
  });

  it("records token usage after a completed turn", async () => {
    const { recordUsage } = await import("@/lib/ai-cost-caps");
    mockCreate.mockResolvedValueOnce(textTurn("done"));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "hi" }] }));
    await readSse(res);
    await flush();
    expect(vi.mocked(recordUsage)).toHaveBeenCalledWith(
      expect.objectContaining({ subjectId: "admin@invest.com.au", tokensIn: 5 }),
    );
  });

  it("fires the 80% cap alert when recordUsage reports the threshold crossed", async () => {
    const { recordUsage } = await import("@/lib/ai-cost-caps");
    const { sendCap80Alert } = await import("@/lib/ai-cost-alerts");
    vi.mocked(recordUsage).mockResolvedValue({ crossed80Subject: true, subjectMicros: 900_000 } as never);
    mockCreate.mockResolvedValueOnce(textTurn("done"));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "hi" }] }));
    await readSse(res);
    await flush();
    expect(vi.mocked(sendCap80Alert)).toHaveBeenCalled();
  });

  it("emits a filter_warning (warn-only) when the factual filter rejects the final text", async () => {
    const { filterFactualOutput } = await import("@/lib/compliance");
    vi.mocked(filterFactualOutput).mockReturnValue({
      ok: false,
      reason: "personal-advice",
      rejectedSpans: [{ rule: "personal-advice-phrase", text: "you should buy", start: 0, end: 14 }],
    } as never);
    mockCreate.mockResolvedValueOnce(textTurn("you should buy CBA"));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "advice?" }] }));
    const sse = await readSse(res);
    expect(sse).toContain("filter_warning");
    expect(sse).toContain('"type":"done"');
  });

  // ── Agentic tool loop → executeTool ──────────────────────────────────────────

  it("runs a read tool (get_site_stats) then completes on the next turn", async () => {
    mockCreate
      .mockResolvedValueOnce(toolUseTurn([{ name: "get_site_stats", id: "t1", input: {} }]))
      .mockResolvedValueOnce(textTurn("All healthy."));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "site stats" }] }));
    const sse = await readSse(res);
    expect(sse).toContain('"type":"tool_start"');
    expect(sse).toContain("get_site_stats");
    expect(sse).toContain('"type":"tool_running"');
    expect(sse).toContain('"type":"tool_done"');
    expect(sse).toContain("All healthy.");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("runs multiple read tools in a single assistant turn", async () => {
    mockCreate
      .mockResolvedValueOnce(
        toolUseTurn([
          { name: "query_table", id: "q1", input: { table: "brokers", select: "*", filters: [{ column: "status", operator: "eq", value: "active" }], order_by: "created_at", limit: 5 } },
          { name: "get_pending_moderation", id: "q2", input: {} },
          { name: "get_recent_activity", id: "q3", input: { hours: 12 } },
        ]),
      )
      .mockResolvedValueOnce(textTurn("Summary ready."));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "overview" }] }));
    const sse = await readSse(res);
    expect(sse).toContain("query_table");
    expect(sse).toContain("get_pending_moderation");
    expect(sse).toContain("get_recent_activity");
    expect(sse).toContain("Summary ready.");
  });

  it("query_table rejects a table that is not allow-listed (branch still executes cleanly)", async () => {
    mockCreate
      .mockResolvedValueOnce(toolUseTurn([{ name: "query_table", id: "q1", input: { table: "secret_admin_table" } }]))
      .mockResolvedValueOnce(textTurn("Can't read that."));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "read secret" }] }));
    const sse = await readSse(res);
    expect(sse).toContain('"type":"tool_done"');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("runs write tools (approve / update_broker / publish / toggle / subscriber)", async () => {
    mockCreate
      .mockResolvedValueOnce(
        toolUseTurn([
          { name: "approve_moderation_item", id: "w1", input: { type: "advisor_article", id: "a1", action: "approve" } },
          { name: "update_broker", id: "w2", input: { broker_slug: "stake", updates: { status: "active", asx_fee_value: 3 } } },
          { name: "publish_article", id: "w3", input: { id: "art1", type: "article", action: "publish" } },
          { name: "toggle_autopilot", id: "w4", input: { automation_id: "master", enabled: true } },
          { name: "manage_subscriber", id: "w5", input: { email: "x@y.com", action: "get_info" } },
        ]),
      )
      .mockResolvedValueOnce(textTurn("Actions applied."));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "do admin tasks" }] }));
    const sse = await readSse(res);
    expect(sse).toContain("approve_moderation_item");
    expect(sse).toContain("update_broker");
    expect(sse).toContain("publish_article");
    expect(sse).toContain("toggle_autopilot");
    expect(sse).toContain("manage_subscriber");
    expect(sse).toContain("Actions applied.");
  });

  it("handles an unsubscribe + resubscribe subscriber action", async () => {
    mockCreate
      .mockResolvedValueOnce(
        toolUseTurn([
          { name: "manage_subscriber", id: "s1", input: { email: "a@b.com", action: "unsubscribe" } },
          { name: "manage_subscriber", id: "s2", input: { email: "a@b.com", action: "resubscribe" } },
        ]),
      )
      .mockResolvedValueOnce(textTurn("Done."));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "manage sub" }] }));
    const sse = await readSse(res);
    expect(sse).toContain('"type":"tool_done"');
    expect(sse).toContain("Done.");
  });

  // ── Error paths ──────────────────────────────────────────────────────────────

  it("surfaces a friendly message on Anthropic billing errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Your credit balance is too low"));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "hi" }] }));
    const sse = await readSse(res);
    expect(sse).toContain('"type":"error"');
    expect(sse).toContain("credits exhausted");
  });

  it("surfaces generic stream errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("network blip"));
    const res = await POST(makeReq({ messages: [{ role: "user", content: "hi" }] }));
    const sse = await readSse(res);
    expect(sse).toContain('"type":"error"');
    expect(sse).toContain("network blip");
  });

  it("returns 500 when the request body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/admin/ai-chat", {
      method: "POST",
      body: "not json{",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
