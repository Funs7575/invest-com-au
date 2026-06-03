import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks (must be before any imports that touch the mocked modules) ─────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

const mockGetUser = vi.fn<
  () => Promise<{ data: { user: { id: string } | null } }>
>();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Track per-table responses so tests can control them independently.
const tableResponses: Record<
  string,
  { data?: unknown; error?: unknown }
> = {};

const makeChain = (table: string) => {
  const res = () =>
    tableResponses[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "lt",
    "lte",
    "gte",
    "is",
    "in",
    "not",
    "or",
    "order",
    "limit",
    "single",
    "like",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  // maybeSingle resolves the chain
  chain["maybeSingle"] = vi.fn(() =>
    Promise.resolve({ data: res().data ?? null, error: res().error ?? null }),
  );
  // Allow awaiting the chain directly (for update/insert without .single())
  chain["then"] = (resolve: (v: { data: unknown; error: unknown; count?: unknown }) => unknown) =>
    Promise.resolve(
      resolve({ data: res().data ?? null, error: res().error ?? null }),
    );
  chain["catch"] = () => chain;
  return chain;
};

const mockAdminFrom = vi.fn((table: string) => makeChain(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

const mockIssueCertificate = vi.fn<
  () => Promise<{ id: string; cpd_hours: number | null } | null>
>();

vi.mock("@/lib/course-certificates", () => ({
  issueCertificate: () => mockIssueCertificate(),
}));

// ─── Route under test ─────────────────────────────────────────────────────────

import { POST } from "@/app/api/courses/[slug]/complete/route";
import { isRateLimited } from "@/lib/rate-limit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  body?: Record<string, unknown>,
  ip = "1.2.3.4",
): NextRequest {
  return new NextRequest(
    "http://localhost/api/courses/course-abc/complete",
    {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
    },
  );
}

// Route segment is [slug] (shared path position with [slug]/reviews); the
// handler aliases it back to courseId. The value is still a course UUID.
const PARAMS = { params: Promise.resolve({ slug: "course-abc" }) };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/courses/[slug]/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the default admin.from implementation after any per-test override
    // (clearAllMocks clears mockImplementation set in individual tests).
    mockAdminFrom.mockImplementation((table: string) => makeChain(table));
    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    // Default: not rate-limited
    vi.mocked(isRateLimited).mockResolvedValue(false);
    // Default: active enrollment (not yet completed)
    tableResponses["course_enrollments"] = {
      data: { id: "enroll-1", status: "in_progress", completed_at: null },
      error: null,
    };
    // Default: course exists
    tableResponses["courses"] = {
      data: {
        slug: "intro-to-investing",
        is_cpd_eligible: false,
        cpd_hours: null,
      },
      error: null,
    };
    tableResponses["course_certificates"] = {
      data: null,
      error: null,
    };
    // Default: enrollment update succeeds (chain resolves with no error)
    mockIssueCertificate.mockResolvedValue({
      id: "cert-1",
      cpd_hours: 2,
    });
  });

  // ── 401 unauthenticated ────────────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/not authenticated/i);
  });

  // ── 429 rate limited ───────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  // ── 403 not enrolled ──────────────────────────────────────────────────────

  it("returns 403 when user is not enrolled in the course", async () => {
    tableResponses["course_enrollments"] = { data: null, error: null };

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/not enrolled/i);
  });

  // ── 500 enrollment DB error ───────────────────────────────────────────────

  it("returns 500 when fetching enrollment fails with a DB error", async () => {
    tableResponses["course_enrollments"] = {
      data: null,
      error: { message: "connection timeout" },
    };

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to verify enrollment/i);
  });

  // ── Idempotency: already completed ────────────────────────────────────────

  it("returns 200 with existing certificate when course already completed", async () => {
    tableResponses["course_enrollments"] = {
      data: {
        id: "enroll-1",
        status: "completed",
        completed_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    };
    tableResponses["course_certificates"] = {
      data: { id: "cert-existing", cpd_hours: 1 },
      error: null,
    };
    tableResponses["courses"] = {
      data: { is_cpd_eligible: true },
      error: null,
    };

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.certificate_id).toBe("cert-existing");
    expect(body.cpd_hours_earned).toBe(1);
    expect(body.is_cpd_eligible).toBe(true);
  });

  // ── 404 course not found ──────────────────────────────────────────────────

  it("returns 404 when course row does not exist", async () => {
    tableResponses["courses"] = { data: null, error: null };

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/course not found/i);
  });

  // ── 500 enrollment update error ───────────────────────────────────────────

  it("returns 500 when marking enrollment completed fails", async () => {
    // Override the admin `from` to return an error on update for enrollments
    mockAdminFrom.mockImplementation((table: string) => {
      const chain = makeChain(table);
      if (table === "course_enrollments") {
        // maybeSingle → active enrollment
        chain["maybeSingle"] = vi.fn(() =>
          Promise.resolve({
            data: { id: "enroll-1", status: "in_progress", completed_at: null },
            error: null,
          }),
        );
        // update().eq() → error
        const updateChain: Record<string, unknown> = {};
        for (const m of ["eq", "neq", "match"]) {
          updateChain[m] = vi.fn(() => updateChain);
        }
        updateChain["then"] = (resolve: (v: { data: unknown; error: unknown; count?: unknown }) => unknown) =>
          Promise.resolve(
            resolve({ data: null, error: { message: "update failed" } }),
          );
        updateChain["catch"] = () => updateChain;
        chain["update"] = vi.fn(() => updateChain);
      }
      if (table === "courses") {
        chain["maybeSingle"] = vi.fn(() =>
          Promise.resolve({
            data: {
              slug: "intro-to-investing",
              is_cpd_eligible: false,
              cpd_hours: null,
            },
            error: null,
          }),
        );
      }
      return chain;
    });

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to mark course as complete/i);
  });

  // ── 201 happy path ────────────────────────────────────────────────────────

  it("returns 201 with certificate_id and cpd_hours on success", async () => {
    mockIssueCertificate.mockResolvedValue({
      id: "cert-new",
      cpd_hours: 2,
    });
    tableResponses["courses"] = {
      data: {
        slug: "intro-to-investing",
        is_cpd_eligible: true,
        cpd_hours: 2,
      },
      error: null,
    };

    const res = await POST(makeRequest(), PARAMS);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.certificate_id).toBe("cert-new");
    expect(body.cpd_hours_earned).toBe(2);
    expect(body.is_cpd_eligible).toBe(true);
  });

  // ── Partial success: issueCertificate returns null ────────────────────────

  it("returns 200 with null certificate_id when issueCertificate returns null", async () => {
    mockIssueCertificate.mockResolvedValue(null);

    const res = await POST(makeRequest(), PARAMS);

    // Enrollment was marked complete, cert issuance failed gracefully
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.certificate_id).toBeNull();
    expect(body.cpd_hours_earned).toBeNull();
  });
});
