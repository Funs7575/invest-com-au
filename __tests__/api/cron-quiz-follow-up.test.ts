import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/email-templates", () => ({
  quizFollowUp1Email: vi.fn(() => "<p>email 1</p>"),
  quizFollowUp2Email: vi.fn(() => "<p>email 2</p>"),
  quizFollowUp3Email: vi.fn(() => "<p>email 3</p>"),
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range",
    "single", "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

vi.mock("@/lib/autopilot", () => ({
  checkAutopilotGate: vi.fn().mockResolvedValue(null),
  _resetAutopilotCache: vi.fn(),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/quiz-follow-up/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/quiz-follow-up", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/quiz-follow-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports edge runtime and maxDuration = 60", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 when no quiz leads found", async () => {
    // mockFrom returns { data: [], error: null } → leads is [] → returns early
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(0);
  });
});
