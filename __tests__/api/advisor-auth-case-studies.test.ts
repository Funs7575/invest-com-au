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

import { GET, POST } from "@/app/api/advisor-auth/case-studies/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/case-studies", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/case-studies", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

const VALID_BODY = {
  title: "Helped a couple retire early",
  situation:
    "A married couple in their late 40s wanted to retire by 60 with confidence.",
  approach:
    "We modelled their super, restructured contributions, and built a glidepath.",
  outcome: "They are now on track to retire at 58 with a sustainable income.",
};

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

function baseBeforeEach() {
  vi.clearAllMocks();
  resetCalls();
  mockAdminFrom.mockReset();
  mockAdminFrom.mockImplementation((table: string) =>
    createChainableBuilder(table, supabaseCalls),
  );
  mockRequireAdvisorSession.mockResolvedValue(null);
  (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/case-studies", () => {
  beforeEach(baseBeforeEach);

  it("returns 401 when not authenticated", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns the advisor's case studies", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_case_studies") {
        b.order = vi.fn(() =>
          Promise.resolve({
            data: [{ id: 1, title: "A" }, { id: 2, title: "B" }],
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect((await res.json()).caseStudies).toHaveLength(2);
  });

  it("returns an empty array when there are none", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_case_studies") {
        b.order = vi.fn(() => Promise.resolve({ data: null, error: null }));
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect((await res.json()).caseStudies).toEqual([]);
  });

  it("returns 500 when the query errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_case_studies") {
        b.order = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "db error" } }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});

describe("POST /api/advisor-auth/case-studies", () => {
  beforeEach(baseBeforeEach);

  it("returns 400 on invalid JSON body", async () => {
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid JSON body/);
  });

  it("returns 400 when a required field is too short", async () => {
    // withValidatedBody validates before the handler runs.
    const res = await POST(makePost({ ...VALID_BODY, title: "no" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/title/);
  });

  it("returns 401 when not authenticated (valid body)", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("creates a case study and returns 201", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_case_studies") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 11, ...VALID_BODY, status: "published" },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    expect((await res.json()).caseStudy.id).toBe(11);
  });

  it("returns 500 when the insert errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_case_studies") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "db error" } }),
        );
      }
      return b;
    });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
