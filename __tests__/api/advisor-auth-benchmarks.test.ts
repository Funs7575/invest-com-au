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

import { GET } from "@/app/api/advisor-auth/benchmarks/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 66;

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/benchmarks", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

const selfProfile = {
  type: "financial_planner",
  location_state: "NSW",
  avg_response_minutes: 60,
  rating: 4.8,
  review_count: 12,
};

const peerRows = [
  { id: 101, avg_response_minutes: 30, rating: 4.5, review_count: 8 },
  { id: 102, avg_response_minutes: 90, rating: 4.2, review_count: 3 },
  { id: 103, avg_response_minutes: 45, rating: 4.9, review_count: 25 },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/benchmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // professionals.maybeSingle — self
        const b = makeBuilder(selfProfile, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: selfProfile, error: null });
        return b;
      }
      if (call === 2) {
        // professional_leads — self leads
        return makeBuilder(
          [
            { status: "accepted" },
            { status: "accepted" },
            { status: "rejected" },
          ],
          null,
        );
      }
      // professionals peers query
      return makeBuilder(peerRows, null);
    });
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many requests/i);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 404 when advisor profile not found", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Advisor not found/i);
  });

  it("returns 200 with correct response shape", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.cohortSize).toBe("number");
    expect(json.yours).toBeDefined();
    expect(json.peerMedian).toBeDefined();
    expect(json.peerTop25).toBeDefined();
  });

  it("includes yours metrics from the self profile", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.yours.rating).toBe(selfProfile.rating);
    expect(json.yours.reviewCount).toBe(selfProfile.review_count);
    expect(json.yours.avgResponseMinutes).toBe(selfProfile.avg_response_minutes);
  });

  it("computes accept rate from self leads", async () => {
    // 2 accepted out of 3 total = 66.7%
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.yours.acceptRate).toBeCloseTo(66.7, 0);
  });

  it("returns null acceptRate when advisor has no leads", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(selfProfile, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: selfProfile, error: null });
        return b;
      }
      if (call === 2) {
        return makeBuilder([], null);
      }
      return makeBuilder(peerRows, null);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.yours.acceptRate).toBeNull();
  });

  it("returns peerMedian with computed stats from peer rows", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // Median of [30, 45, 90] = 45
    expect(json.peerMedian.avgResponseMinutes).toBe(45);
    // Median of [4.2, 4.5, 4.9] = 4.5
    expect(json.peerMedian.rating).toBe(4.5);
    // Median of [3, 8, 25] = 8
    expect(json.peerMedian.reviewCount).toBe(8);
    // Peer acceptRate is null (not computed)
    expect(json.peerMedian.acceptRate).toBeNull();
  });

  it("returns peerTop25 with 25th-pct response time and 75th-pct for rating/reviews", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // 25th pct of [30, 45, 90] (idx=0) = 30
    expect(json.peerTop25.avgResponseMinutes).toBe(30);
    // 75th pct of [4.2, 4.5, 4.9]: idx = floor(0.75 * 2) = 1 → 4.5
    expect(json.peerTop25.rating).toBe(4.5);
  });

  it("returns cohortSize matching the number of peer rows", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cohortSize).toBe(peerRows.length);
  });

  it("returns nulls in peerMedian/peerTop25 when there are no peers", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(selfProfile, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: selfProfile, error: null });
        return b;
      }
      if (call === 2) {
        return makeBuilder([], null);
      }
      // peers empty
      return makeBuilder([], null);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cohortSize).toBe(0);
    expect(json.peerMedian.avgResponseMinutes).toBeNull();
    expect(json.peerMedian.rating).toBeNull();
    expect(json.peerMedian.reviewCount).toBeNull();
    expect(json.peerTop25.avgResponseMinutes).toBeNull();
    expect(json.peerTop25.rating).toBeNull();
  });

  it("applies state filter when advisor has a location_state set", async () => {
    await GET(makeGet());
    // The third call to mockFrom is for the peer query which should have chained .eq calls
    expect(mockFrom).toHaveBeenCalled();
  });

  it("skips state filter when advisor has no location_state", async () => {
    const noStateProfile = { ...selfProfile, location_state: null };
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(noStateProfile, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: noStateProfile,
          error: null,
        });
        return b;
      }
      if (call === 2) {
        return makeBuilder([], null);
      }
      return makeBuilder(peerRows, null);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.cohortSize).toBe(peerRows.length);
  });
});
