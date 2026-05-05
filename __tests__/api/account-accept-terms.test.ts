import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockGetUser = vi.fn();

let insertError: { message: string; code?: string } | null = null;
const insertCalls: Record<string, unknown>[] = [];

const mockFrom = vi.fn(() => ({
  insert: async (row: Record<string, unknown>) => {
    insertCalls.push(row);
    return { data: null, error: insertError };
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { POST } from "@/app/api/account/accept-terms/route";

function makeReq(body: Record<string, unknown> | string): NextRequest {
  const isString = typeof body === "string";
  return new NextRequest("http://localhost/api/account/accept-terms", {
    method: "POST",
    body: isString ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

describe("POST /api/account/accept-terms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(
      makeReq({ tos_version: "2026-01-01", privacy_version: "2026-01-01" }),
    );
    expect(res.status).toBe(401);
    expect(insertCalls).toHaveLength(0);
  });

  it("returns 400 when tos_version missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const res = await POST(makeReq({ privacy_version: "2026-01-01" }));
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it("returns 400 when privacy_version missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const res = await POST(makeReq({ tos_version: "2026-01-01" }));
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it("returns 400 when both versions missing (body also unparseable)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const res = await POST(makeReq("not json"));
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it("records acceptance with IP + user-agent + version pair", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const res = await POST(
      makeReq({ tos_version: "2026-01-01", privacy_version: "2026-02-15" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toEqual({
      user_id: "u1",
      tos_version: "2026-01-01",
      privacy_version: "2026-02-15",
      ip_address: "1.2.3.4",
      user_agent: "Mozilla/5.0 Test",
    });
  });

  it("rejects oversized version strings (>50 chars) with 400", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const long = "x".repeat(500);
    const res = await POST(makeReq({ tos_version: long, privacy_version: long }));
    expect(res.status).toBe(400);
    expect(insertCalls).toHaveLength(0);
  });

  it("treats a duplicate-row error (23505) as success (idempotent)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    insertError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const res = await POST(
      makeReq({ tos_version: "2026-01-01", privacy_version: "2026-01-01" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("returns 500 on non-23505 DB errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    insertError = { code: "40001", message: "serialization failure" };
    const res = await POST(
      makeReq({ tos_version: "2026-01-01", privacy_version: "2026-01-01" }),
    );
    expect(res.status).toBe(500);
  });
});
