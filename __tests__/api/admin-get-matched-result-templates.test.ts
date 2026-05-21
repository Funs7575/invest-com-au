/**
 * Tests for GET/PUT/DELETE /api/admin/get-matched/result-templates
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
  b.single = vi.fn(() => Promise.resolve({ data: { id: 1, route: "compare" }, error: null }));
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, PUT, DELETE } from "@/app/api/admin/get-matched/result-templates/route";

const VALID_TEMPLATE_BODY = {
  route: "compare",
  headline: "Compare the best platforms",
  why_text: "We match you to platforms that suit your needs based on your answers.",
  primary_cta: { label: "Compare now", href: "/compare/brokers" },
};

function makeReq(method: string, body?: unknown, searchParams?: string): NextRequest {
  const url = `http://localhost/api/admin/get-matched/result-templates${searchParams ? `?${searchParams}` : ""}`;
  return new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("/api/admin/get-matched/result-templates", () => {
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

    it("returns 200 with templates list", async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [{ id: 1, route: "compare" }], error: null }));
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("templates");
    });
  });

  describe("PUT", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await PUT(makeReq("PUT", VALID_TEMPLATE_BODY));
      expect(res.status).toBe(401);
    });

    it("returns 400 on invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api/admin/get-matched/result-templates", {
        method: "PUT",
        body: "bad-json",
        headers: { "content-type": "application/json" },
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when required fields missing", async () => {
      const res = await PUT(makeReq("PUT", { route: "compare" }));
      expect(res.status).toBe(400);
    });

    it("returns 200 on valid new template", async () => {
      const res = await PUT(makeReq("PUT", VALID_TEMPLATE_BODY));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("template");
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
