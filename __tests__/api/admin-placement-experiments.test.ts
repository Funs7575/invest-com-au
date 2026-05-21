/**
 * Tests for GET/POST/PATCH/DELETE /api/admin/placement-experiments
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
  b.single = vi.fn(() => Promise.resolve({ data: { id: 1, slug: "test-exp" }, error: null }));
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/admin/placement-experiments/route";

const VALID_VARIANTS = [
  { label: "control", broker_slug: "commsec", weight: 5000 },
  { label: "variant-a", broker_slug: "stake", weight: 5000 },
];

const VALID_CREATE_BODY = {
  slug: "test-exp-2024",
  name: "Test Experiment",
  status: "draft",
  variants: VALID_VARIANTS,
};

const VALID_PATCH_BODY = {
  id: 1,
  name: "Updated Name",
};

function makeReq(method: string, body?: unknown, searchParams?: string): NextRequest {
  const url = `http://localhost/api/admin/placement-experiments${searchParams ? `?${searchParams}` : ""}`;
  return new NextRequest(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

describe("/api/admin/placement-experiments", () => {
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
      const res = await GET(makeReq("GET"));
      expect(res.status).toBe(401);
    });

    it("returns 200 with rows on success", async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [{ id: 1, slug: "test" }], error: null }));
      const res = await GET(makeReq("GET"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("rows");
    });

    it("returns 400 when status param is invalid", async () => {
      const res = await GET(makeReq("GET", undefined, "status=invalid"));
      expect(res.status).toBe(400);
    });

    it("filters by status when valid status provided", async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
      const res = await GET(makeReq("GET", undefined, "status=running"));
      expect(res.status).toBe(200);
    });
  });

  describe("POST", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await POST(makeReq("POST", VALID_CREATE_BODY));
      expect(res.status).toBe(401);
    });

    it("returns 400 when body is invalid (withValidatedBody validation)", async () => {
      // Missing required fields — withValidatedBody returns 400
      const res = await POST(makeReq("POST", { slug: "x" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when variant labels are not unique", async () => {
      const duplicateVariants = [
        { label: "control", broker_slug: "commsec", weight: 5000 },
        { label: "control", broker_slug: "stake", weight: 5000 },
      ];
      const res = await POST(makeReq("POST", { ...VALID_CREATE_BODY, variants: duplicateVariants }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("unique");
    });

    it("returns 201 on valid create", async () => {
      const res = await POST(makeReq("POST", VALID_CREATE_BODY));
      expect(res.status).toBe(201);
    });
  });

  describe("PATCH", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await PATCH(makeReq("PATCH", VALID_PATCH_BODY));
      expect(res.status).toBe(401);
    });

    it("returns 400 when body is invalid", async () => {
      const res = await PATCH(makeReq("PATCH", {}));
      expect(res.status).toBe(400);
    });

    it("returns 200 on valid patch", async () => {
      const res = await PATCH(makeReq("PATCH", VALID_PATCH_BODY));
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not admin", async () => {
      mockRequireAdmin.mockResolvedValue({
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      });
      const res = await DELETE(makeReq("DELETE", undefined, "id=1"));
      expect(res.status).toBe(401);
    });

    it("returns 400 when id missing", async () => {
      const res = await DELETE(makeReq("DELETE"));
      expect(res.status).toBe(400);
    });

    it("returns 400 when id is not numeric", async () => {
      const res = await DELETE(makeReq("DELETE", undefined, "id=abc"));
      expect(res.status).toBe(400);
    });

    it("returns 200 on valid delete", async () => {
      mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
      const res = await DELETE(makeReq("DELETE", undefined, "id=1"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});
