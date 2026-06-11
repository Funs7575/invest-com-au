import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(async () => 42 as number | null),
}));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(async () => false),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

interface BuilderResult {
  data?: unknown;
  error?: unknown;
  count?: number | null;
}

function makeBuilder(result: BuilderResult = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) =>
    Promise.resolve(cb({ data: null, error: null, count: null, ...result }));
  return b;
}

const mockAdminFrom = vi.fn((_table: string) => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET, POST } from "@/app/api/advisor-auth/standing-orders/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/advisor-auth/standing-orders", {
    method: body === undefined ? "GET" : "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/advisor-auth/standing-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockIsFlagEnabled.mockResolvedValue(false);
    mockAdminFrom.mockImplementation(() => makeBuilder({ data: [], error: null, count: 0 }));
  });

  it("GET returns 401 without an advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("GET returns orders with execution flag state", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orders).toEqual([]);
    expect(json.execution_enabled).toBe(false);
    expect(json.max_orders).toBeGreaterThan(0);
  });

  it("POST returns 401 without an advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(401);
  });

  it("POST returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(429);
  });

  it("POST rejects an unknown template", async () => {
    const res = await POST(makeReq({ brief_templates: ["not_a_template"] }));
    expect(res.status).toBe(400);
  });

  it("POST rejects an out-of-range weekly cap", async () => {
    const res = await POST(makeReq({ weekly_accept_cap: 99 }));
    expect(res.status).toBe(400);
  });

  it("POST enforces the per-adviser order limit", async () => {
    mockAdminFrom.mockImplementation(() => makeBuilder({ data: [], error: null, count: 5 }));
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/up to 5/);
  });

  it("POST creates an order with defaults", async () => {
    const created = {
      id: 11,
      professional_id: 42,
      status: "active",
      brief_templates: [],
      states: [],
      budget_bands: [],
      max_credits_per_accept: 10,
      weekly_accept_cap: 3,
    };
    mockAdminFrom.mockImplementation(() =>
      makeBuilder({ data: created, error: null, count: 0 }),
    );
    const res = await POST(makeReq({ states: ["NSW"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.order.id).toBe(11);
  });
});
