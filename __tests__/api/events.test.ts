import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsRateLimited, mockFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "neq", "gte", "lte", "lt", "gt", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

function makeReq(params: Record<string, string> = {}, ip = "1.2.3.4"): NextRequest {
  const url = new URL("http://localhost/api/events");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

const SAMPLE_EVENT = {
  id: 1,
  title: "Market Outlook 2026",
  event_type: "webinar",
  status: "published",
  starts_at: new Date(Date.now() + 86_400_000).toISOString(),
  professional: {
    id: 10,
    name: "Jane Advisor",
    firm_name: "Wealth Co",
    slug: "jane-advisor",
    profile_image_url: null,
    location_state: "NSW",
  },
};

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET } from "@/app/api/events/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/events
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("passes rate-limit key based on IP", async () => {
    await GET(makeReq({}, "8.8.8.8"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("public-events-8.8.8.8", 60, 1);
  });

  it("uses x-real-ip header as fallback when x-forwarded-for is absent", async () => {
    const req = new NextRequest("http://localhost/api/events", {
      method: "GET",
      headers: { "x-real-ip": "3.3.3.3" },
    });
    await GET(req);
    expect(mockIsRateLimited).toHaveBeenCalledWith("public-events-3.3.3.3", 60, 1);
  });

  it("uses 'unknown' when no IP header is present", async () => {
    const req = new NextRequest("http://localhost/api/events", { method: "GET" });
    await GET(req);
    expect(mockIsRateLimited).toHaveBeenCalledWith("public-events-unknown", 60, 1);
  });

  it("returns 500 when DB query fails", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "db down" } }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to fetch events/i);
  });

  it("returns 200 with empty events array when none are published", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
  });

  it("returns 200 with events on success", async () => {
    mockFrom.mockReturnValue(makeChain({ data: [SAMPLE_EVENT], error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].title).toBe("Market Outlook 2026");
    expect(body.events[0].professional.name).toBe("Jane Advisor");
  });

  it("applies event_type filter when provided", async () => {
    const chain = makeChain({ data: [SAMPLE_EVENT], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ event_type: "webinar" }));
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    expect(eqFn).toHaveBeenCalledWith("event_type", "webinar");
  });

  it("applies state filter when provided", async () => {
    const chain = makeChain({ data: [SAMPLE_EVENT], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ state: "NSW" }));
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    expect(eqFn).toHaveBeenCalledWith("professional.location_state", "NSW");
  });

  it("does not apply event_type filter when param is absent", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    // eq is still called for status=published, but not for event_type
    const calls = (eqFn as ReturnType<typeof vi.fn>).mock.calls as [string, string][];
    const eventTypeCalls = calls.filter(([field]) => field === "event_type");
    expect(eventTypeCalls).toHaveLength(0);
  });

  it("always filters by status=published", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    const calls = (eqFn as ReturnType<typeof vi.fn>).mock.calls as [string, string][];
    expect(calls.some(([field, val]) => field === "status" && val === "published")).toBe(true);
  });

  it("returns multiple events in the response", async () => {
    const events = [
      { ...SAMPLE_EVENT, id: 1, title: "Event A" },
      { ...SAMPLE_EVENT, id: 2, title: "Event B" },
    ];
    mockFrom.mockReturnValue(makeChain({ data: events, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(2);
  });
});
