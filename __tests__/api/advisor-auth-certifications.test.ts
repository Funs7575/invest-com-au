import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

// vi.hoisted() — vi.mock factories are hoisted; the captured fn must be too.
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { POST, DELETE } from "@/app/api/advisor-auth/certifications/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/certifications", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makeDelete(body: unknown, query = ""): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auth/certifications${query ? `?${query}` : ""}`,
    {
      method: "DELETE",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    },
  );
}

const VALID_CERT = { name: "CFP", issuer: "FAAA" };

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/certifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockRequireAdvisorSession.mockResolvedValue(null);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await POST(makePost(VALID_CERT));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await POST(makePost(VALID_CERT));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid JSON body/);
  });

  it("returns 400 when issuer is missing", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    const res = await POST(makePost({ name: "CFP" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when cert_url is not a valid URL", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    const res = await POST(makePost({ ...VALID_CERT, cert_url: "not-a-url" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/cert_url/);
  });

  it("creates a certification and returns 201", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_certifications") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 9, professional_id: 42, name: "CFP" },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(
      makePost({ ...VALID_CERT, cert_url: "https://example.com/cert" }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).certification.id).toBe(9);
  });

  it("returns 500 when the insert errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_certifications") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "db error" } }),
        );
      }
      return b;
    });

    const res = await POST(makePost(VALID_CERT));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/advisor-auth/certifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockRequireAdvisorSession.mockResolvedValue(null);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await DELETE(makeDelete({ certId: 5 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid certId in the query string", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    const res = await DELETE(makeDelete({}, "certId=abc"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid certId/);
  });

  it("returns 400 for an invalid body when no query param is present", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    const res = await DELETE(makeDelete({ certId: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the certification is not owned by the advisor", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_certifications") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { professional_id: 99 }, error: null }),
        );
      }
      return b;
    });

    const res = await DELETE(makeDelete({ certId: 5 }));
    expect(res.status).toBe(404);
  });

  it("soft-deletes an owned certification and returns success", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_certifications") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { professional_id: 42 }, error: null }),
        );
        b.update = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "update", args: [] });
          return {
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          };
        });
      }
      return b;
    });

    const res = await DELETE(makeDelete({}, "certId=5"));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("returns 500 when the soft-delete update errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_certifications") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { professional_id: 42 }, error: null }),
        );
        b.update = vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: "db error" } }),
          ),
        }));
      }
      return b;
    });

    const res = await DELETE(makeDelete({ certId: 5 }));
    expect(res.status).toBe(500);
  });
});
