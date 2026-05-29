import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 55),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/advisor-auth/case-studies/route";

// ── Builder helper ────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeGet() {
  return new NextRequest(
    "http://localhost/api/advisor-auth/case-studies",
    {
      method: "GET",
      headers: { "x-forwarded-for": "3.3.3.3" },
    },
  );
}

function makePost(body: unknown) {
  return new NextRequest(
    "http://localhost/api/advisor-auth/case-studies",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "3.3.3.3" },
      body: JSON.stringify(body),
    },
  );
}

const VALID_BODY = {
  title: "Helping a family retire early",
  situation: "A family of four wanted to retire 10 years early with limited super.",
  approach: "We restructured their portfolio and set up a SMSF to maximise returns.",
  outcome: "They retired 8 years ahead of schedule.",
  client_type: "family" as const,
  outcome_type: "retirement_planning" as const,
  status: "published" as const,
};

// ── GET Tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/case-studies — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(55);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });
});

describe("GET /api/advisor-auth/case-studies — DB paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(55);
  });

  it("returns 500 on DB error", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "select boom" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/failed to fetch case studies/i);
  });

  it("returns caseStudies array on success", async () => {
    const rows = [
      {
        id: 1,
        title: "Case A",
        situation: "sit",
        approach: "app",
        outcome: "out",
        client_type: "individual",
        outcome_type: "wealth_growth",
        status: "published",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
      },
    ];
    mockAdminFrom.mockReturnValue(makeBuilder(rows, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as { caseStudies: unknown[] };
    expect(body.caseStudies).toHaveLength(1);
  });

  it("returns empty caseStudies array when DB returns null", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as { caseStudies: unknown[] };
    expect(body.caseStudies).toEqual([]);
  });
});

// ── POST Tests ────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/case-studies — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(55);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/advisor-auth/case-studies — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(55);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/case-studies", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "3.3.3.3" },
      body: "not json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short", async () => {
    const res = await POST(makePost({ ...VALID_BODY, title: "Hi" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when situation is too short", async () => {
    const res = await POST(makePost({ ...VALID_BODY, situation: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when approach is too short", async () => {
    const res = await POST(makePost({ ...VALID_BODY, approach: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when outcome is too short", async () => {
    const res = await POST(makePost({ ...VALID_BODY, outcome: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid client_type enum value", async () => {
    const res = await POST(makePost({ ...VALID_BODY, client_type: "alien" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid outcome_type enum value", async () => {
    const res = await POST(makePost({ ...VALID_BODY, outcome_type: "miracle" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/advisor-auth/case-studies — DB paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(55);
  });

  it("returns 201 with created case study on success", async () => {
    const created = {
      id: 10,
      title: VALID_BODY.title,
      situation: VALID_BODY.situation,
      approach: VALID_BODY.approach,
      outcome: VALID_BODY.outcome,
      client_type: "family",
      outcome_type: "retirement_planning",
      status: "published",
      created_at: "2025-03-01T00:00:00Z",
      updated_at: "2025-03-01T00:00:00Z",
    };
    mockAdminFrom.mockReturnValue(makeBuilder(created, null));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json() as { caseStudy: typeof created };
    expect(body.caseStudy.id).toBe(10);
    expect(body.caseStudy.title).toBe(VALID_BODY.title);
  });

  it("returns 500 when insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "insert boom" }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/failed to create case study/i);
  });

  it("defaults status to 'published' when not provided", async () => {
    const body = { ...VALID_BODY };
    const { status: _s, ...bodyWithoutStatus } = body;
    const created = { id: 11, status: "published", ...bodyWithoutStatus };
    mockAdminFrom.mockReturnValue(makeBuilder(created, null));

    const res = await POST(makePost(bodyWithoutStatus));
    expect(res.status).toBe(201);
  });

  it("accepts 'draft' status", async () => {
    const created = { id: 12, ...VALID_BODY, status: "draft" };
    mockAdminFrom.mockReturnValue(makeBuilder(created, null));

    const res = await POST(makePost({ ...VALID_BODY, status: "draft" }));
    expect(res.status).toBe(201);
    const body = await res.json() as { caseStudy: { status: string } };
    expect(body.caseStudy.status).toBe("draft");
  });
});
