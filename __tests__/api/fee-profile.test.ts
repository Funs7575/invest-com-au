import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSupabaseFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  }),
}));

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST } from "@/app/api/fee-profile/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-xyz" };
const FEE_PROFILE = {
  user_id: USER.id,
  asx_trades_per_month: 4,
  us_trades_per_month: 0,
  avg_trade_size: 5000,
  portfolio_value: 100000,
  current_broker_slug: "commsec",
  updated_at: "2026-04-01T00:00:00Z",
};

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/fee-profile");
}

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/fee-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function maybySingleChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

function subChain(result: { data: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

function upsertChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.upsert = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── Tests: GET ────────────────────────────────────────────────────────────────

describe("GET /api/fee-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: USER } });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns profile when found", async () => {
    mockSupabaseFrom.mockReturnValue(maybySingleChain({ data: FEE_PROFILE }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toMatchObject({ asx_trades_per_month: 4 });
  });

  it("returns null profile when no record exists", async () => {
    mockSupabaseFrom.mockReturnValue(maybySingleChain({ data: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toBeNull();
  });

  it("returns 500 when supabase throws", async () => {
    mockGetUser.mockRejectedValue(new Error("DB error"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/fee-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({}));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({}));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no Pro subscription", async () => {
    mockSupabaseFrom.mockReturnValue(subChain({ data: null }));
    const res = await POST(makePost({ asx_trades_per_month: 5 }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/pro subscription/i);
  });

  it("returns 200 and upserts profile for Pro subscriber", async () => {
    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return subChain({ data: { status: "active" } });
      return upsertChain({ error: null });
    });
    const res = await POST(makePost({ asx_trades_per_month: 10, avg_trade_size: 3000 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("clamps asx_trades_per_month to 0–999", async () => {
    let callCount = 0;
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return subChain({ data: { status: "active" } });
      return { upsert: upsertMock };
    });
    await POST(makePost({ asx_trades_per_month: 9999, avg_trade_size: 0 }));
    const upsertArg = upsertMock.mock.calls[0]![0] as { asx_trades_per_month: number };
    expect(upsertArg.asx_trades_per_month).toBe(999);
  });

  it("defaults asx_trades_per_month to 4 when absent", async () => {
    let callCount = 0;
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return subChain({ data: { status: "active" } });
      return { upsert: upsertMock };
    });
    await POST(makePost({}));
    const upsertArg = upsertMock.mock.calls[0]![0] as { asx_trades_per_month: number };
    expect(upsertArg.asx_trades_per_month).toBe(4);
  });

  it("truncates current_broker_slug to 100 chars", async () => {
    let callCount = 0;
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return subChain({ data: { status: "active" } });
      return { upsert: upsertMock };
    });
    const longSlug = "a".repeat(200);
    await POST(makePost({ current_broker_slug: longSlug }));
    const upsertArg = upsertMock.mock.calls[0]![0] as { current_broker_slug: string };
    expect(upsertArg.current_broker_slug!.length).toBe(100);
  });

  it("sets current_broker_slug to null when not a string", async () => {
    let callCount = 0;
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return subChain({ data: { status: "active" } });
      return { upsert: upsertMock };
    });
    await POST(makePost({ current_broker_slug: 123 }));
    const upsertArg = upsertMock.mock.calls[0]![0] as { current_broker_slug: unknown };
    expect(upsertArg.current_broker_slug).toBeNull();
  });

  it("returns 500 when upsert fails", async () => {
    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return subChain({ data: { status: "active" } });
      return upsertChain({ error: { message: "DB constraint" } });
    });
    const res = await POST(makePost({}));
    expect(res.status).toBe(500);
  });
});
