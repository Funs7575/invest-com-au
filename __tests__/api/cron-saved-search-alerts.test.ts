import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockListUsers = vi.fn(async () => ({ data: { users: [] } }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { listUsers: mockListUsers } },
  })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: "e1" })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: string) => s),
}));

vi.mock("@/lib/saved-searches", () => ({
  computeMatchSignature: vi.fn(() => "sig-abc"),
}));

vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(async (_name: string, fn: () => Promise<{ response: unknown }>) => {
    const { response } = await fn();
    return response;
  }),
  wrapCronHandler: vi.fn(
    (_name: string, handler: (req: unknown) => Promise<unknown>) => handler,
  ),
  cleanupCronRunLog: vi.fn(() => Promise.resolve(0)),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/saved-search-alerts/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/saved-search-alerts", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/saved-search-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // Default: empty saved_searches result
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports config", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with processed:0 when no saved searches due", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(body.sent).toBe(0);
  });

  it("returns 500 when saved_searches query errors", async () => {
    mockFrom.mockImplementationOnce(() =>
      makeBuilder({ data: null, error: { message: "DB error" } }),
    );
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });
});
