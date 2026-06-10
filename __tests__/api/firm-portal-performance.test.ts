import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const {
  mockIsAllowed,
  mockRequireAdvisorSession,
  mockResolveFirmAdminContext,
  mockGetFirmPerformanceSummary,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true),
  mockRequireAdvisorSession: vi.fn<
    (...args: unknown[]) => Promise<number | null>
  >(async () => 42),
  mockResolveFirmAdminContext: vi.fn<
    (...args: unknown[]) => Promise<{ firmId: number; advisorId: number } | null>
  >(async () => ({ firmId: 7, advisorId: 42 })),
  mockGetFirmPerformanceSummary: vi.fn<
    (...args: unknown[]) => Promise<Record<string, unknown> | null>
  >(async () => ({ members: [], leaderboard: [] })),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (_req: unknown) => "ip:test",
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/firm-billing", () => ({
  resolveFirmAdminContext: (...args: unknown[]) => mockResolveFirmAdminContext(...args),
}));

vi.mock("@/lib/firm-performance", () => ({
  getFirmPerformanceSummary: (...args: unknown[]) => mockGetFirmPerformanceSummary(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/firm-portal/performance", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET } from "@/app/api/firm-portal/performance/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/firm-portal/performance
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/firm-portal/performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockResolveFirmAdminContext.mockResolvedValue({ firmId: 7, advisorId: 42 });
    mockGetFirmPerformanceSummary.mockResolvedValue({ members: [], leaderboard: [] });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("returns 401 when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    mockResolveFirmAdminContext.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/firm admin/i);
  });

  it("returns 500 when getFirmPerformanceSummary returns null", async () => {
    mockGetFirmPerformanceSummary.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to load performance/i);
  });

  it("returns 200 with summary on success", async () => {
    const summary = {
      members: [
        { professionalId: 10, name: "Alice", views30d: 100, enquiries30d: 5 },
        { professionalId: 11, name: "Bob", views30d: 80, enquiries30d: 3 },
      ],
      leaderboard: [{ rank: 1, professionalId: 10 }],
    };
    mockGetFirmPerformanceSummary.mockResolvedValue(summary);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toEqual(summary);
    expect(body.summary.members).toHaveLength(2);
  });

  it("calls getFirmPerformanceSummary with the correct firmId", async () => {
    mockResolveFirmAdminContext.mockResolvedValue({ firmId: 99, advisorId: 42 });
    await GET(makeReq());
    expect(mockGetFirmPerformanceSummary).toHaveBeenCalledWith(99);
  });

  it("calls resolveFirmAdminContext with the professionalId from session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(55);
    mockResolveFirmAdminContext.mockResolvedValue({ firmId: 7, advisorId: 55 });
    await GET(makeReq());
    expect(mockResolveFirmAdminContext).toHaveBeenCalledWith(55);
  });

  it("checks rate limit before any auth", async () => {
    // Rate limited — advisor session should never be called
    mockIsAllowed.mockResolvedValue(false);
    await GET(makeReq());
    expect(mockRequireAdvisorSession).not.toHaveBeenCalled();
  });

  it("does not call getFirmPerformanceSummary when not a firm admin", async () => {
    mockResolveFirmAdminContext.mockResolvedValue(null);
    await GET(makeReq());
    expect(mockGetFirmPerformanceSummary).not.toHaveBeenCalled();
  });
});
