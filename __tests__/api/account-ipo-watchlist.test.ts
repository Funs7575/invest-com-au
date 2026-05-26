import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockIsRateLimited: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST, DELETE } from "@/app/api/account/ipo-watchlist/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/ipo-watchlist", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeDeleteChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.delete = vi.fn(() => chain);
  let eqCount = 0;
  chain.eq = vi.fn(() => {
    eqCount++;
    if (eqCount >= 3) return Promise.resolve(result);
    return chain;
  });
  return chain;
}

const VALID_POST = { ipo_id: 42, alert_type: "listing" };
const VALID_DELETE = { ipo_id: 42, alert_type: "listing" };

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/account/ipo-watchlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's watchlist", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const rows = [
      { id: 1, ipo_id: 42, alert_type: "listing", created_at: "2026-01-01T00:00:00Z", ipo_offers: { asx_code: "GYG", company_name: "Guzman y Gomez", status: "listed" } },
    ];
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: rows, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.watchlist).toHaveLength(1);
    expect(body.watchlist[0]?.ipo_id).toBe(42);
  });

  it("returns empty array when user has no watchlist entries", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: [], error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.watchlist).toEqual([]);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/account/ipo-watchlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeReq("POST", VALID_POST);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when alert_type is invalid", async () => {
    const req = makeReq("POST", { ipo_id: 42, alert_type: "invalid" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when ipo_id is missing", async () => {
    const req = makeReq("POST", { alert_type: "listing" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when ipo_id is non-integer", async () => {
    const req = makeReq("POST", { ipo_id: "abc", alert_type: "listing" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 on successful insert", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(false);
    const inserted = { id: 10, ipo_id: 42, alert_type: "listing", created_at: "2026-01-01T00:00:00Z" };
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: inserted, error: null }));
    const req = makeReq("POST", VALID_POST);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ipo_id).toBe(42);
  });

  it("returns 409 when already watching", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(false);
    mockFrom.mockReturnValueOnce(
      makeInsertChain({ data: null, error: { code: "23505", message: "unique violation" } }),
    );
    const req = makeReq("POST", VALID_POST);
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 404 when IPO does not exist", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(false);
    mockFrom.mockReturnValueOnce(
      makeInsertChain({ data: null, error: { code: "23503", message: "foreign key violation" } }),
    );
    const req = makeReq("POST", VALID_POST);
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(true);
    const req = makeReq("POST", VALID_POST);
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/account/ipo-watchlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeReq("DELETE", VALID_DELETE);
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is missing ipo_id", async () => {
    const req = makeReq("DELETE", { alert_type: "listing" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful delete", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: null }));
    const req = makeReq("DELETE", VALID_DELETE);
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
