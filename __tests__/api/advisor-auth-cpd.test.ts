import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

// vi.hoisted() — vi.mock factories are hoisted; the captured fns must be too.
const { mockRequireAdvisorSession, mockGetCpdSummary } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
  mockGetCpdSummary: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/course-certificates", () => ({
  getCpdSummary: mockGetCpdSummary,
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

import { GET } from "@/app/api/advisor-auth/cpd/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/cpd", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

const SAMPLE_SUMMARY = {
  earned: 12,
  target: 40,
  remaining: 28,
  year: "2025-26",
  cpd_year: 2025,
  breakdown: { technical: 6, conduct: 2, client_care: 2, regulatory: 2 },
  courses: [],
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/cpd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetCpdSummary.mockResolvedValue(SAMPLE_SUMMARY);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns the CPD summary for the authenticated advisor", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(SAMPLE_SUMMARY);
    expect(mockGetCpdSummary).toHaveBeenCalledWith(42);
  });

  it("returns 500 when the summary lookup throws", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetCpdSummary.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});
