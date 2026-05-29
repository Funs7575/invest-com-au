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

import { POST, DELETE } from "@/app/api/advisor-auth/certifications/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 55;

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/certifications", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makeDelete(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/certifications", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makeDeleteQuery(certId: number): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auth/certifications?certId=${certId}`,
    { method: "DELETE", headers: { "x-forwarded-for": "1.2.3.4" } },
  );
}

const mockCert = {
  id: 10,
  professional_id: ADVISOR_ID,
  name: "CFP",
  issuer: "FPA Australia",
  credential_id: "CFP-12345",
  issued_at: "2022-01-01",
  expires_at: "2027-01-01",
  cert_url: null,
};

const validPostBody = {
  name: "CFA",
  issuer: "CFA Institute",
};

const certOwnerRow = { professional_id: ADVISOR_ID };

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/certifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(mockCert, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockCert, error: null });
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
    const req = new NextRequest("http://localhost/api/advisor-auth/certifications", {
      method: "POST",
      body: "not-json{{{",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makePost({ issuer: "CFA Institute" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when issuer is missing", async () => {
    const res = await POST(makePost({ name: "CFA" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too short (under 2 chars)", async () => {
    const res = await POST(makePost({ name: "A", issuer: "CFA Institute" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when cert_url is not a valid URL", async () => {
    const res = await POST(makePost({ name: "CFA", issuer: "CFA Institute", cert_url: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("creates certification and returns 201 with certification data", async () => {
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.certification).toBeDefined();
    expect(json.certification.name).toBe("CFP");
  });

  it("creates certification with all optional fields", async () => {
    const fullBody = {
      name: "CFP",
      issuer: "FPA Australia",
      credential_id: "CFP-99999",
      issued_at: "2023-06-01",
      expires_at: "2028-06-01",
      cert_url: "https://verify.cfp.org/12345",
    };
    const res = await POST(makePost(fullBody));
    expect(res.status).toBe(201);
  });

  it("returns 500 when DB insert fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, { message: "insert error" });
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "insert error" },
      });
      return b;
    });
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to add certification/i);
  });
});

// ── Tests: DELETE ─────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/certifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(certOwnerRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: certOwnerRow,
          error: null,
        });
        return b;
      }
      return makeBuilder(null, null);
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await DELETE(makeDelete({ certId: 10 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeDelete({ certId: 10 }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when certId is missing from body", async () => {
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when certId is not a positive integer", async () => {
    const res = await DELETE(makeDelete({ certId: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when cert not found or not owned by advisor", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await DELETE(makeDelete({ certId: 10 }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Certification not found/i);
  });

  it("returns 404 when cert belongs to a different advisor", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder({ professional_id: 8888 }, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { professional_id: 8888 },
        error: null,
      });
      return b;
    });
    const res = await DELETE(makeDelete({ certId: 10 }));
    expect(res.status).toBe(404);
  });

  it("soft-deletes certification and returns 200 success", async () => {
    const res = await DELETE(makeDelete({ certId: 10 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("accepts certId via query param", async () => {
    const res = await DELETE(makeDeleteQuery(10));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB update fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(certOwnerRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: certOwnerRow,
          error: null,
        });
        return b;
      }
      return makeBuilder(null, { message: "update failed" });
    });
    const res = await DELETE(makeDelete({ certId: 10 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to delete certification/i);
  });
});
