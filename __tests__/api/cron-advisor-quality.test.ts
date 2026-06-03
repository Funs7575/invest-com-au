import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

// Cron route tests don't exercise consumer webhook dispatch (it has its own
// tests + queries api_consumer_webhooks, a table these route mocks don't model).
vi.mock("@/lib/consumer-webhook-dispatch", () => ({
  fireConsumerWebhook: vi.fn().mockResolvedValue(undefined),
}));

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

import { GET, maxDuration } from "@/app/api/cron/advisor-quality/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/advisor-quality", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/advisor-quality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // stub global fetch to prevent real network calls
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.restoreAllMocks();
  });

  it("exports maxDuration config", () => {
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

  it("returns 200 on success with empty data", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
