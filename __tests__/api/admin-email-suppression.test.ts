import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// FIN_NOTEBOOK item 19 — API route coverage push (admin-email-suppression).
// Targets the admin guard + the three verbs (GET/POST/DELETE) on the new
// /api/admin/email-suppression route shipped in this PR.

const { mockRequireAdmin, mockSuppress, mockUnsuppress, mockAdminQuery } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockSuppress: vi.fn(),
  mockUnsuppress: vi.fn(),
  mockAdminQuery: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/email-suppression", () => ({
  suppress: (...args: unknown[]) => mockSuppress(...args),
  unsuppress: (...args: unknown[]) => mockUnsuppress(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      // Mirror supabase-js builder: every method returns `this` AND the
      // builder is thenable. The route does `query = query.ilike(...)`
      // after the initial chain, so .limit() must keep returning a
      // chainable object — not a bare Promise — or .ilike is missing.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {};
      chain.select = vi.fn(() => chain);
      chain.order = vi.fn(() => chain);
      chain.ilike = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.limit = vi.fn(() => chain);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chain.then = (resolve: (v: any) => any) =>
        Promise.resolve(mockAdminQuery(table)).then(resolve);
      return chain;
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { GET, POST, DELETE } from "@/app/api/admin/email-suppression/route";

function makeReq(method: string, body?: unknown, search = ""): NextRequest {
  return new NextRequest(`http://localhost/api/admin/email-suppression${search}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockSuppress.mockReset();
  mockUnsuppress.mockReset();
  mockAdminQuery.mockReset();
});

describe("admin-email-suppression GET", () => {
  it("returns 401 when admin guard denies", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: new Response("Unauthorized", { status: 401 }),
    });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns rows + total on success", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "fin@invest.com.au", userId: "u-1" });
    mockAdminQuery.mockReturnValueOnce({
      data: [
        { id: "1", contact_email: "spam@example.com", reason: "hard_bounce", suppressed_at: "2026-05-18T00:00:00Z", metadata: {} },
      ],
      error: null,
      count: 1,
    });
    const res = await GET(makeReq("GET", undefined, "?q=spam"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: unknown[]; total: number };
    expect(body.total).toBe(1);
    expect(body.rows).toHaveLength(1);
  });

  it("returns 500 on DB error", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "fin@invest.com.au", userId: "u-1" });
    mockAdminQuery.mockReturnValueOnce({ data: null, error: { message: "db blew up" }, count: null });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
  });
});

describe("admin-email-suppression POST", () => {
  it("rejects invalid email", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "fin@invest.com.au", userId: "u-1" });
    const res = await POST(makeReq("POST", { email: "not-an-email", reason: "admin" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid reason", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "fin@invest.com.au", userId: "u-1" });
    const res = await POST(makeReq("POST", { email: "user@example.com", reason: "not-a-reason" }));
    expect(res.status).toBe(400);
  });

  it("calls suppress() and returns insert info", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "fin@invest.com.au", userId: "u-1" });
    mockSuppress.mockResolvedValueOnce({ inserted: true, reason: "manual_unsubscribe" });
    const res = await POST(makeReq("POST", { email: "user@example.com", reason: "manual_unsubscribe" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; inserted: boolean };
    expect(body.ok).toBe(true);
    expect(body.inserted).toBe(true);
    expect(mockSuppress).toHaveBeenCalledWith(
      "user@example.com",
      "manual_unsubscribe",
      expect.objectContaining({ metadata: expect.objectContaining({ by_admin: "fin@invest.com.au" }) }),
    );
  });
});

describe("admin-email-suppression DELETE", () => {
  it("requires ?email param", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "fin@invest.com.au", userId: "u-1" });
    const res = await DELETE(makeReq("DELETE"));
    expect(res.status).toBe(400);
  });

  it("calls unsuppress() and returns removed=true", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "fin@invest.com.au", userId: "u-1" });
    mockUnsuppress.mockResolvedValueOnce({ removed: true });
    const res = await DELETE(makeReq("DELETE", undefined, "?email=user%40example.com"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; removed: boolean };
    expect(body.removed).toBe(true);
    expect(mockUnsuppress).toHaveBeenCalledWith("user@example.com");
  });
});
