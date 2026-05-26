import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST, DELETE } from "@/app/api/account/verified-products/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/verified-products", {
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
  chain.eq = vi.fn(() => chain);
  // Last eq resolves the chain
  let eqCount = 0;
  chain.eq = vi.fn(() => {
    eqCount++;
    if (eqCount >= 3) return Promise.resolve(result);
    return chain;
  });
  return chain;
}

const VALID_VERIFY = { product_type: "broker", product_ref: "commbank-broking" };

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/account/verified-products", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's verifications", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const rows = [
      { id: 1, product_type: "broker", product_ref: "commbank-broking", verified_at: "2026-01-01T00:00:00Z" },
    ];
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: rows, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { verifications: unknown[] };
    expect(body.verifications).toEqual(rows);
  });

  it("returns empty array when data is null", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: null, error: null }));
    const res = await GET();
    const body = (await res.json()) as { verifications: unknown[] };
    expect(body.verifications).toEqual([]);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/account/verified-products", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", VALID_VERIFY));
    expect(res.status).toBe(401);
  });

  it("creates a verification and returns 201", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const created = { id: 1, ...VALID_VERIFY, verified_at: "2026-05-25T00:00:00Z" };
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: created, error: null }));
    const res = await POST(makeReq("POST", VALID_VERIFY));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { verification: unknown };
    expect(body.verification).toEqual(created);
  });

  it("returns 409 for duplicate verification", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: null, error: { code: "23505", message: "unique violation" } }));
    const res = await POST(makeReq("POST", VALID_VERIFY));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("already_verified");
  });

  it("returns 400 for invalid product_type", async () => {
    const res = await POST(makeReq("POST", { product_type: "stock", product_ref: "cba" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing product_ref", async () => {
    const res = await POST(makeReq("POST", { product_type: "broker" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty product_ref", async () => {
    const res = await POST(makeReq("POST", { product_type: "etf", product_ref: "" }));
    expect(res.status).toBe(400);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/account/verified-products", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE", VALID_VERIFY));
    expect(res.status).toBe(401);
  });

  it("deletes a verification and returns ok", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeDeleteChain({ error: null }));
    const res = await DELETE(makeReq("DELETE", VALID_VERIFY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns 400 for missing product_type", async () => {
    const res = await DELETE(makeReq("DELETE", { product_ref: "commbank-broking" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing product_ref", async () => {
    const res = await DELETE(makeReq("DELETE", { product_type: "broker" }));
    expect(res.status).toBe(400);
  });
});
