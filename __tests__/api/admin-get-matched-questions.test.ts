/**
 * Tests for GET/PUT/DELETE /api/admin/get-matched/questions
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
  b.single = vi.fn(() => Promise.resolve({ data: { id: 1, slug: "test-q" }, error: null }));
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// api-schemas needs real exports — don't mock it
import { GET, PUT, DELETE } from "@/app/api/admin/get-matched/questions/route";

function makeReq(method: string, body?: unknown, searchParams?: string): NextRequest {
  const url = `http://localhost/api/admin/get-matched/questions${searchParams ? `?${searchParams}` : ""}`;
  return new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("/api/admin/get-matched/questions", () => {
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

    it("returns 200 with questions list", async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [{ id: 1, slug: "q1" }], error: null }));
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("questions");
    });
  });

  describe("PUT", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await PUT(makeReq("PUT", {
        slug: "test-q", kind: "select", prompt: "What?", maps_to: "intent",
      }));
      expect(res.status).toBe(401);
    });

    it("returns 400 on invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api/admin/get-matched/questions", {
        method: "PUT",
        body: "bad-json",
        headers: { "content-type": "application/json" },
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when required fields missing", async () => {
      const res = await PUT(makeReq("PUT", { slug: "x" }));
      expect(res.status).toBe(400);
    });

    it("returns 200 on valid new question", async () => {
      const res = await PUT(makeReq("PUT", {
        slug: "test-question",
        kind: "select",
        prompt: "Test question?",
        maps_to: "intent",
      }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("question");
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await DELETE(makeReq("DELETE", undefined, "id=5"));
      expect(res.status).toBe(401);
    });

    it("returns 400 when id is not a finite number (NaN)", async () => {
      // Number("abc") = NaN which is not finite
      const res = await DELETE(makeReq("DELETE", undefined, "id=abc"));
      expect(res.status).toBe(400);
    });

    it("returns 200 on valid delete", async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
      const res = await DELETE(makeReq("DELETE", undefined, "id=5"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
