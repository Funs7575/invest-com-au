import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/health/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(verbose = false): Request {
  const url = `http://localhost/api/health${verbose ? "?verbose=true" : ""}`;
  return new Request(url, { method: "GET" });
}

const NOW_ISO = new Date().toISOString();

function makeDbSelectChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  // resolve without data for the brokers count-only query
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

function makeHeartbeatChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  const OLD_ENV = process.env;

  // vi.spyOn on globalThis.fetch is hard to type cleanly because lib.dom's
  // `fetch` isn't declared on globalThis directly. Restore via the saved
  // reference instead of MockInstance.mockRestore — same effect, no typing
  // headache.
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...OLD_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      CRON_SECRET: "cron-secret",
      // PR #856 added Stripe/Resend/Anthropic probes to the route. Without
      // these stubs the probes short-circuit to ok:false ("…_API_KEY
      // missing") and the overall status flips to "degraded". The route
      // requires keys >= 10 chars before it actually fetches.
      STRIPE_SECRET_KEY: "sk_test_placeholder",
      RESEND_API_KEY: "re_test_placeholder",
      ANTHROPIC_API_KEY: "sk-ant-placeholder",
    };
    // Intercept the route's outbound fetches so tests never hit the real
    // Stripe/Resend/Anthropic APIs (slow, flaky, and would burn rate limits).
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    process.env = OLD_ENV;
    globalThis.fetch = originalFetch;
  });

  it("returns 200 with status ok when all checks pass", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeDbSelectChain({ error: null });
      return makeHeartbeatChain({ data: { created_at: NOW_ISO }, error: null });
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.status).toBe("ok");
    expect(typeof json.latency_ms).toBe("number");
    expect(json.checks).toBeUndefined();
  });

  it("returns verbose checks when ?verbose=true", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeDbSelectChain({ error: null });
      return makeHeartbeatChain({ data: { created_at: NOW_ISO }, error: null });
    });
    const res = await GET(makeGet(true));
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.checks).toBeDefined();
    const checks = json.checks as Record<string, { ok: boolean }>;
    expect(checks.database).toBeDefined();
    expect(checks.cron_freshness).toBeDefined();
  });

  it("returns 503 when database query errors", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return makeDbSelectChain({ error: { message: "connection refused" } });
      return makeHeartbeatChain({ data: { created_at: NOW_ISO }, error: null });
    });
    const res = await GET(makeGet(true));
    expect(res.status).toBe(503);
    const json = await res.json() as Record<string, unknown>;
    expect(json.status).toBe("degraded");
    const checks = json.checks as Record<string, { ok: boolean }>;
    expect(checks.database.ok).toBe(false);
  });

  it("returns 503 when cron heartbeat is stale (>10 min old)", async () => {
    const staleDate = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeDbSelectChain({ error: null });
      return makeHeartbeatChain({ data: { created_at: staleDate }, error: null });
    });
    const res = await GET(makeGet(true));
    expect(res.status).toBe(503);
    const json = await res.json() as Record<string, unknown>;
    expect(json.status).toBe("degraded");
    const checks = json.checks as Record<string, { ok: boolean }>;
    expect(checks.cron_freshness.ok).toBe(false);
  });

  it("treats missing heartbeat row as ok (new deploy)", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeDbSelectChain({ error: null });
      return makeHeartbeatChain({ data: null, error: null });
    });
    const res = await GET(makeGet(true));
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const checks = json.checks as Record<string, { ok: boolean }>;
    expect(checks.cron_freshness.ok).toBe(true);
  });

  it("returns 503 when heartbeat query errors", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeDbSelectChain({ error: null });
      return makeHeartbeatChain({ data: null, error: { message: "timeout" } });
    });
    const res = await GET(makeGet(true));
    expect(res.status).toBe(503);
    const json = await res.json() as Record<string, unknown>;
    expect(json.status).toBe("degraded");
    const checks = json.checks as Record<string, { ok: boolean }>;
    expect(checks.cron_freshness.ok).toBe(false);
  });

  it("reports env degraded when required env vars are missing", async () => {
    delete process.env.CRON_SECRET;
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeDbSelectChain({ error: null });
      return makeHeartbeatChain({ data: { created_at: NOW_ISO }, error: null });
    });
    const res = await GET(makeGet(true));
    expect(res.status).toBe(503);
    const json = await res.json() as Record<string, unknown>;
    const checks = json.checks as Record<string, { ok: boolean; error?: string }>;
    expect(checks.env.ok).toBe(false);
    expect(checks.env.error).toContain("CRON_SECRET");
  });

  it("fresh heartbeat (just now) is not stale", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeDbSelectChain({ error: null });
      return makeHeartbeatChain({ data: { created_at: new Date().toISOString() }, error: null });
    });
    const res = await GET(makeGet(true));
    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const checks = json.checks as Record<string, { ok: boolean }>;
    expect(checks.cron_freshness.ok).toBe(true);
  });
});
