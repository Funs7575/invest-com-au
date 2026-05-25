import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks (avoid vi.mock() hoisting TDZ) ─────────────────────────────

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

import { GET, POST } from "@/app/api/firm-portal/jobs/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FIRM_PRO = {
  id: "pro-1",
  firm_id: "firm-1",
  is_firm_admin: true,
  status: "active",
};

const JOBS = [
  {
    id: 1,
    title: "Senior Advisor",
    location: "Sydney NSW",
    type: "full_time",
    status: "active",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
];

const VALID_JOB_BODY = {
  title: "Financial Advisor",
  location: "Melbourne VIC",
  type: "full_time",
  description: "We are looking for an experienced financial advisor to join our team.",
};

// ── Mock setup helper ─────────────────────────────────────────────────────────

function setupAdminMocks({
  firmPro = FIRM_PRO as Record<string, unknown> | null,
  jobs = JOBS as unknown[],
  jobsError = null as { message: string } | null,
  insertResult = { id: 42, ...VALID_JOB_BODY, status: "draft", created_at: "2026-05-24T00:00:00Z" } as unknown,
  insertError = null as { message: string } | null,
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);

    if (table === "professionals") {
      // resolveFirmAdmin: .select().eq().in().maybeSingle()
      b.maybeSingle = vi.fn().mockResolvedValue({ data: firmPro, error: null });
    } else if (table === "job_posts") {
      // GET handler: .select().eq().order() → await resolves via then
      b.then = vi.fn((cb: (v: unknown) => void) => {
        cb({ data: jobsError ? null : jobs, error: jobsError });
        return Promise.resolve();
      });
      // POST handler: .insert().select().single()
      b.single = vi.fn().mockResolvedValue({
        data: insertError ? null : insertResult,
        error: insertError,
      });
    }

    return b;
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/firm-portal/jobs", () => {
  function makeGetReq(): NextRequest {
    return new NextRequest("http://localhost/api/firm-portal/jobs", {
      method: "GET",
      headers: { "x-forwarded-for": "5.6.7.8" },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupAdminMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await GET(makeGetReq())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await GET(makeGetReq())).status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    setupAdminMocks({ firmPro: null });
    expect((await GET(makeGetReq())).status).toBe(403);
  });

  it("returns 403 when professional has no firm_id", async () => {
    setupAdminMocks({ firmPro: { ...FIRM_PRO, firm_id: null } });
    expect((await GET(makeGetReq())).status).toBe(403);
  });

  it("returns 500 on DB error fetching jobs", async () => {
    setupAdminMocks({ jobsError: { message: "connection refused" } });
    expect((await GET(makeGetReq())).status).toBe(500);
  });

  it("returns job list for authenticated firm admin", async () => {
    setupAdminMocks({ jobs: JOBS });
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0].title).toBe("Senior Advisor");
  });

  it("returns empty jobs array when firm has no posts", async () => {
    setupAdminMocks({ jobs: [] });
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobs).toEqual([]);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/firm-portal/jobs", () => {
  function makePost(body: Record<string, unknown>): NextRequest {
    return makeRequest("/api/firm-portal/jobs", body);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    setupAdminMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await POST(makePost(VALID_JOB_BODY))).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await POST(makePost(VALID_JOB_BODY))).status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    setupAdminMocks({ firmPro: null });
    expect((await POST(makePost(VALID_JOB_BODY))).status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePost({ title: "Advisor" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid employment type", async () => {
    const res = await POST(makePost({ ...VALID_JOB_BODY, type: "gig_economy" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is too short", async () => {
    const res = await POST(makePost({ ...VALID_JOB_BODY, description: "Short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short", async () => {
    const res = await POST(makePost({ ...VALID_JOB_BODY, title: "A" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB insert error", async () => {
    setupAdminMocks({ insertError: { message: "unique constraint violation" } });
    const res = await POST(makePost(VALID_JOB_BODY));
    expect(res.status).toBe(500);
  });

  it("creates job post and returns 201 on success", async () => {
    const res = await POST(makePost(VALID_JOB_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.job).toBeDefined();
    expect(json.job.id).toBe(42);
  });

  it("defaults status to draft when not provided", async () => {
    setupAdminMocks({
      insertResult: { ...VALID_JOB_BODY, id: 1, status: "draft", created_at: "2026-05-24T00:00:00Z" },
    });
    const res = await POST(makePost(VALID_JOB_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.job.status).toBe("draft");
  });

  it("accepts explicit active status in body", async () => {
    setupAdminMocks({
      insertResult: { ...VALID_JOB_BODY, id: 2, status: "active", created_at: "2026-05-24T00:00:00Z" },
    });
    const res = await POST(makePost({ ...VALID_JOB_BODY, status: "active" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.job.status).toBe("active");
  });
});
