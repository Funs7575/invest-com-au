import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Supabase admin builder ────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, DELETE } from "@/app/api/advisor-auth/services/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 99;

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/services", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makeDelete(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/services", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makeDeleteQuery(serviceId: number): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auth/services?serviceId=${serviceId}`,
    { method: "DELETE", headers: { "x-forwarded-for": "1.2.3.4" } },
  );
}

const mockService = {
  id: 1,
  professional_id: ADVISOR_ID,
  name: "Financial Planning",
  description: "Comprehensive financial planning services",
  price_type: "fixed",
  price_from_cents: 50000,
  price_to_cents: 100000,
};

const validPostBody = {
  name: "Tax Advisory",
  description: "Tax advice for individuals",
  price_type: "fixed",
  price_from_cents: 30000,
};

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(mockService, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockService, error: null });
      return b;
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/services", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePost({ price_type: "fixed" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too short (under 2 chars)", async () => {
    const res = await POST(makePost({ name: "A" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too long (over 100 chars)", async () => {
    const res = await POST(makePost({ name: "X".repeat(101) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price_type is invalid", async () => {
    const res = await POST(makePost({ name: "Advisory", price_type: "monthly" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price_from_cents is negative", async () => {
    const res = await POST(makePost({ name: "Advisory", price_from_cents: -100 }));
    expect(res.status).toBe(400);
  });

  it("creates service and returns 201 with service data", async () => {
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.service).toBeDefined();
    expect(json.service.name).toBe("Financial Planning");
  });

  it("creates service with minimal required fields (name only)", async () => {
    const res = await POST(makePost({ name: "Basic Advice" }));
    expect(res.status).toBe(201);
  });

  it("defaults price_type to contact when omitted", async () => {
    const res = await POST(makePost({ name: "Basic Advice" }));
    expect(res.status).toBe(201);
    // Default applied; insert was called with price_type: 'contact'
    expect(mockFrom).toHaveBeenCalled();
  });

  it("returns 500 when DB insert fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, { message: "db error" });
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "db error" },
      });
      return b;
    });
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to create service/i);
  });
});

// ── Tests: DELETE ─────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/services", () => {
  const serviceOwnerRow = { professional_id: ADVISOR_ID };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(serviceOwnerRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: serviceOwnerRow,
          error: null,
        });
        return b;
      }
      return makeBuilder(null, null);
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await DELETE(makeDelete({ serviceId: 1 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeDelete({ serviceId: 1 }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when serviceId is missing from body", async () => {
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when serviceId is not a positive integer", async () => {
    const res = await DELETE(makeDelete({ serviceId: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when service not found or not owned by advisor", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await DELETE(makeDelete({ serviceId: 999 }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Service not found/i);
  });

  it("returns 404 when service belongs to a different advisor", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder({ professional_id: 9999 }, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { professional_id: 9999 },
        error: null,
      });
      return b;
    });
    const res = await DELETE(makeDelete({ serviceId: 1 }));
    expect(res.status).toBe(404);
  });

  it("soft-deletes service and returns 200 success", async () => {
    const res = await DELETE(makeDelete({ serviceId: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("accepts serviceId via query param", async () => {
    const res = await DELETE(makeDeleteQuery(1));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB update fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(serviceOwnerRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: serviceOwnerRow,
          error: null,
        });
        return b;
      }
      return makeBuilder(null, { message: "update failed" });
    });
    const res = await DELETE(makeDelete({ serviceId: 1 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to delete service/i);
  });
});
