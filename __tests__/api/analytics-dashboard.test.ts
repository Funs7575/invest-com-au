import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const mockAdminRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: mockAdminRpc })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

import { GET } from "@/app/api/analytics-dashboard/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const CRON_SECRET = "test-cron-secret";

function makeGet(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/analytics-dashboard", { headers });
}

function makeAuthedGet(): NextRequest {
  return makeGet({ Authorization: `Bearer ${CRON_SECRET}` });
}

/** Count builder — used for all the `.select("id", { count, head }).gte().eq()` calls. */
function makeCountBuilder(count: number, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ count, error })),
    // For the first batch (no .gte() chained): eq-less termination
    then: undefined as unknown,
  };
}

/** RPC builder — returns { data, error }. */
function makeRpcBuilder(data: unknown = null) {
  return vi.fn(() =>
    Promise.resolve({ data, error: null, count: null, status: 200, statusText: "ok" }),
  );
}

/**
 * Count builder that handles all three chaining patterns the analytics route uses:
 * 1. .select(...)                   → terminal (no chain, directly awaited)
 * 2. .select(...).gte(...)          → gte is terminal
 * 3. .select(...).gte(...).eq(...)  → eq is terminal
 *
 * The builder is thenable so `await builder` works for patterns 1 and 2.
 * .eq() returns a Promise for pattern 3.
 */
function makeCountBuilderThenable(count: number) {
  const resolve = { count, error: null };
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve(resolve)),
    then: vi.fn((cb: (v: typeof resolve) => void, _rej?: unknown) => {
      cb(resolve);
      return Promise.resolve(resolve);
    }),
  };
  return builder;
}

function setupMocks(overrides: { count?: number } = {}) {
  const count = overrides.count ?? 42;
  mockAdminFrom.mockReturnValue(makeCountBuilderThenable(count));
  mockAdminRpc.mockImplementation(makeRpcBuilder([]));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/analytics-dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no authorization", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it("returns 401 when Bearer token does not match CRON_SECRET", async () => {
    const res = await GET(makeGet({ Authorization: "Bearer wrong-token" }));
    expect(res.status).toBe(401);
  });

  it("returns dashboard data when authenticated with CRON_SECRET", async () => {
    setupMocks();
    const res = await GET(makeAuthedGet());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.events.total).toBe(42);
    expect(data.generated_at).toBeDefined();
  });

  it("includes all expected top-level keys in response", async () => {
    setupMocks();
    const res = await GET(makeAuthedGet());
    const data = await res.json();
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("top_pages");
    expect(data).toHaveProperty("top_broker_clicks");
    expect(data).toHaveProperty("top_events");
    expect(data).toHaveProperty("daily_events");
    expect(data).toHaveProperty("daily_clicks");
    expect(data).toHaveProperty("device_breakdown");
  });

  it("returns empty arrays for RPC results when RPCs fail", async () => {
    mockAdminFrom.mockReturnValue(makeCountBuilderThenable(0));
    mockAdminRpc.mockImplementation(() =>
      Promise.resolve({ data: null, error: { message: "not found" }, count: null, status: 500, statusText: "error" }),
    );

    const res = await GET(makeAuthedGet());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.top_pages).toEqual([]);
    expect(data.top_broker_clicks).toEqual([]);
  });

  it("returns 0 counts when DB returns null count", async () => {
    const resolve = { count: null as null, error: null };
    const nullCountBuilder: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      eq: vi.fn(() => Promise.resolve(resolve)),
      then: vi.fn((cb: (v: typeof resolve) => void) => { cb(resolve); return Promise.resolve(resolve); }),
    };
    mockAdminFrom.mockReturnValue(nullCountBuilder);
    mockAdminRpc.mockImplementation(makeRpcBuilder([]));

    const res = await GET(makeAuthedGet());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.events.total).toBe(0);
    expect(data.summary.clicks.today).toBe(0);
  });
});
