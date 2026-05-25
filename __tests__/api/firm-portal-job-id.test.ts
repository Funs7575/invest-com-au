import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockGetUser, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn().mockResolvedValue(false),
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { PATCH, DELETE } from "@/app/api/firm-portal/jobs/[id]/route";
import { GET as GET_APPS } from "@/app/api/firm-portal/jobs/[id]/applications/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIRM_PRO = {
  firm_id: "firm-1",
  is_firm_admin: true,
  status: "active",
};

const OWNED_JOB = { id: "job-uuid-1" };

const UPDATED_JOB = {
  id: "job-uuid-1",
  title: "Updated Advisor",
  location: "Brisbane QLD",
  type: "full_time",
  description: "Updated description that is long enough.",
  status: "active",
  updated_at: "2026-05-24T00:00:00Z",
};

const APPLICATIONS = [
  {
    id: 1,
    applicant_name: "Bob Jones",
    applicant_email: "bob@example.com",
    message: "Interested.",
    created_at: "2026-05-24T00:00:00Z",
  },
];

// ── Mock setup helper ─────────────────────────────────────────────────────────

function setupMocks({
  firmPro = FIRM_PRO as Record<string, unknown> | null,
  ownsJob = true,
  updatedJob = UPDATED_JOB as unknown,
  updateError = null as { message: string } | null,
  archiveError = null as { message: string } | null,
  applications = APPLICATIONS as unknown[],
  appsError = null as { message: string } | null,
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);

    if (table === "professionals") {
      b.maybeSingle = vi.fn().mockResolvedValue({ data: firmPro, error: null });
    } else if (table === "job_posts") {
      // ownership check (assertOwnership) → maybeSingle
      b.maybeSingle = vi.fn().mockResolvedValue({
        data: ownsJob ? OWNED_JOB : null,
        error: null,
      });
      // PATCH update → single
      b.single = vi.fn().mockResolvedValue({
        data: updateError ? null : updatedJob,
        error: updateError,
      });
      // DELETE archive → awaited chain (then)
      b.then = vi.fn((cb: (v: unknown) => void) => {
        cb({ data: null, error: archiveError });
        return Promise.resolve();
      });
    } else if (table === "job_applications") {
      b.then = vi.fn((cb: (v: unknown) => void) => {
        cb({ data: appsError ? null : applications, error: appsError });
        return Promise.resolve();
      });
    }

    return b;
  });
}

// ── Route context helper ──────────────────────────────────────────────────────

function makeCtx(id = "job-uuid-1") {
  return { params: Promise.resolve({ id }) };
}

// ── PATCH /api/firm-portal/jobs/[id] ─────────────────────────────────────────

describe("PATCH /api/firm-portal/jobs/[id]", () => {
  const VALID_PATCH = { title: "Updated Advisor" };

  function makePatch(body: Record<string, unknown>): NextRequest {
    return makeRequest("/api/firm-portal/jobs/job-uuid-1", body, { method: "PATCH" });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await PATCH(makePatch(VALID_PATCH), makeCtx())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await PATCH(makePatch(VALID_PATCH), makeCtx())).status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    setupMocks({ firmPro: null });
    expect((await PATCH(makePatch(VALID_PATCH), makeCtx())).status).toBe(403);
  });

  it("returns 404 when job is not owned by the firm", async () => {
    setupMocks({ ownsJob: false });
    expect((await PATCH(makePatch(VALID_PATCH), makeCtx())).status).toBe(404);
  });

  it("returns 400 for invalid employment type", async () => {
    const res = await PATCH(makePatch({ type: "gig_economy" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB update error", async () => {
    setupMocks({ updateError: { message: "constraint violation" } });
    expect((await PATCH(makePatch(VALID_PATCH), makeCtx())).status).toBe(500);
  });

  it("returns 200 with updated job on success", async () => {
    const res = await PATCH(makePatch(VALID_PATCH), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.job).toBeDefined();
    expect(json.job.id).toBe("job-uuid-1");
  });
});

// ── DELETE /api/firm-portal/jobs/[id] ────────────────────────────────────────

describe("DELETE /api/firm-portal/jobs/[id]", () => {
  function makeDelete(): NextRequest {
    return new NextRequest("http://localhost/api/firm-portal/jobs/job-uuid-1", {
      method: "DELETE",
      headers: { "x-forwarded-for": "5.6.7.8" },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await DELETE(makeDelete(), makeCtx())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await DELETE(makeDelete(), makeCtx())).status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    setupMocks({ firmPro: null });
    expect((await DELETE(makeDelete(), makeCtx())).status).toBe(403);
  });

  it("returns 404 when job is not owned by the firm", async () => {
    setupMocks({ ownsJob: false });
    expect((await DELETE(makeDelete(), makeCtx())).status).toBe(404);
  });

  it("returns 500 on DB archive error", async () => {
    setupMocks({ archiveError: { message: "write failed" } });
    expect((await DELETE(makeDelete(), makeCtx())).status).toBe(500);
  });

  it("returns 200 with ok:true on successful archive", async () => {
    const res = await DELETE(makeDelete(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ── GET /api/firm-portal/jobs/[id]/applications ───────────────────────────────

describe("GET /api/firm-portal/jobs/[id]/applications", () => {
  function makeGet(): NextRequest {
    return new NextRequest(
      "http://localhost/api/firm-portal/jobs/job-uuid-1/applications",
      {
        method: "GET",
        headers: { "x-forwarded-for": "5.6.7.8" },
      },
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await GET_APPS(makeGet(), makeCtx())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await GET_APPS(makeGet(), makeCtx())).status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    setupMocks({ firmPro: null });
    expect((await GET_APPS(makeGet(), makeCtx())).status).toBe(403);
  });

  it("returns 404 when job is not owned by the firm", async () => {
    setupMocks({ ownsJob: false });
    expect((await GET_APPS(makeGet(), makeCtx())).status).toBe(404);
  });

  it("returns 500 on DB error fetching applications", async () => {
    setupMocks({ appsError: { message: "connection refused" } });
    expect((await GET_APPS(makeGet(), makeCtx())).status).toBe(500);
  });

  it("returns 200 with applications list on success", async () => {
    const res = await GET_APPS(makeGet(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.applications).toHaveLength(1);
    expect(json.applications[0]?.applicant_name).toBe("Bob Jones");
  });

  it("returns 200 with empty array when no applications", async () => {
    setupMocks({ applications: [] });
    const res = await GET_APPS(makeGet(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.applications).toEqual([]);
  });
});
