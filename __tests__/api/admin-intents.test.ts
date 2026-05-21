/**
 * Tests for GET/PUT /api/admin/intents
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not",
    "or", "order", "limit", "range", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(() => Promise.resolve({ data: { id: 1, slug: "start_investing" }, error: null }));
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, PUT } from "@/app/api/admin/intents/route";

const VALID_INTENT_BODY = {
  slug: "start_investing",
  label: "Start Investing",
  default_route: "compare",
};

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/intents", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("/api/admin/intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true, email: "admin@invest.com.au", userId: "u1",
    });
    mockFrom.mockReturnValue(makeBuilder());
  });

  describe("GET", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns 200 with intents list", async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [{ id: 1, slug: "start_investing" }], error: null }));
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("intents");
    });
  });

  describe("PUT", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await PUT(makeReq("PUT", VALID_INTENT_BODY));
      expect(res.status).toBe(401);
    });

    it("returns 400 on invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api/admin/intents", {
        method: "PUT",
        body: "bad-json",
        headers: { "content-type": "application/json" },
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when required fields missing", async () => {
      const res = await PUT(makeReq("PUT", { slug: "start_investing" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when slug is not a valid enum value", async () => {
      const res = await PUT(makeReq("PUT", {
        slug: "invalid_slug",
        label: "Invalid",
        default_route: "compare",
      }));
      expect(res.status).toBe(400);
    });

    it("returns 200 on valid new intent (upsert)", async () => {
      const res = await PUT(makeReq("PUT", VALID_INTENT_BODY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("intent");
    });

    it("returns 200 on valid update (with id)", async () => {
      const res = await PUT(makeReq("PUT", { ...VALID_INTENT_BODY, id: 1 }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("intent");
    });
  });
});
