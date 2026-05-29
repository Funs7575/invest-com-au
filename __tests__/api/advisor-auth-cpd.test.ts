import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockGetCpdSummary } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
  mockGetCpdSummary: vi.fn<(id: number) => Promise<{
    earned: number;
    target: number;
    remaining: number;
    year: string;
    cpd_year: number;
    breakdown: {
      technical: number;
      conduct: number;
      client_care: number;
      regulatory: number;
    };
    courses: unknown[];
  }>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
}));

vi.mock("@/lib/course-certificates", () => ({
  getCpdSummary: (...args: unknown[]) => mockGetCpdSummary(...(args as [number])),
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

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/cpd/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Constants ─────────────────────────────────────────────────────────────────

const ADVISOR_ID = 22;

const MOCK_CPD_SUMMARY = {
  earned: 12.5,
  target: 40,
  remaining: 27.5,
  year: "2025-26",
  cpd_year: 2026,
  breakdown: {
    technical: 8,
    conduct: 4.5,
    client_care: 0,
    regulatory: 0,
  },
  courses: [
    {
      course_id: "course-1",
      course_title: "Ethics in Finance",
      hours_earned: 4.5,
      cpd_category: "conduct",
      completed_at: "2026-01-15T00:00:00Z",
      certificate_number: "INV-2026-00001",
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/cpd", {
    method: "GET",
    headers: { "x-forwarded-for": "3.4.5.6" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/cpd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockGetCpdSummary.mockResolvedValue(MOCK_CPD_SUMMARY);
  });

  // ── 429 rate limiting ─────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many requests/i);
  });

  // ── 401 unauthenticated ───────────────────────────────────────────────────

  it("returns 401 when advisor session is not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 200 returns CPD summary ───────────────────────────────────────────────

  it("returns 200 with full CPD summary", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.earned).toBe(12.5);
    expect(json.target).toBe(40);
    expect(json.remaining).toBe(27.5);
    expect(json.year).toBe("2025-26");
    expect(json.cpd_year).toBe(2026);
  });

  // ── 200 breakdown and courses included ───────────────────────────────────

  it("returns breakdown and courses in the summary", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.breakdown).toMatchObject({ technical: 8, conduct: 4.5 });
    expect(json.courses).toHaveLength(1);
    expect(json.courses[0]).toMatchObject({ course_title: "Ethics in Finance" });
  });

  // ── getCpdSummary called with correct advisor id ──────────────────────────

  it("calls getCpdSummary with the authenticated advisor's professional_id", async () => {
    await GET(makeGet());
    expect(mockGetCpdSummary).toHaveBeenCalledWith(ADVISOR_ID);
  });

  // ── 500 on getCpdSummary throw ────────────────────────────────────────────

  it("returns 500 when getCpdSummary throws an error", async () => {
    mockGetCpdSummary.mockRejectedValue(new Error("DB timeout"));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch cpd summary/i);
  });

  // ── 200 with zero earned (fresh year) ────────────────────────────────────

  it("returns 200 with earned:0 at start of CPD year", async () => {
    mockGetCpdSummary.mockResolvedValue({
      earned: 0,
      target: 40,
      remaining: 40,
      year: "2025-26",
      cpd_year: 2026,
      breakdown: { technical: 0, conduct: 0, client_care: 0, regulatory: 0 },
      courses: [],
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.earned).toBe(0);
    expect(json.remaining).toBe(40);
    expect(json.courses).toEqual([]);
  });
});
