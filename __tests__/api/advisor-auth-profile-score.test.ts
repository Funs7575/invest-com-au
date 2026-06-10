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

function makeBuilder(data: unknown = null, error: unknown = null, count: number | null = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown; count: number | null }) => unknown) =>
      Promise.resolve(r({ data, error, count })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter", "contains", "overlaps",
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

import { GET } from "@/app/api/advisor-auth/profile-score/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 7;

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/profile-score", {
    method: "GET",
  });
}

const fullProfile = {
  photo_url: "https://cdn.example.com/photo.jpg",
  bio: "A".repeat(110),
  specialties: ["SMSF", "Retirement"],
  booking_link: "https://cal.com/advisor",
  review_count: 10,
  rating: 4.5,
  website: "https://advisor.com.au",
  afsl_number: "123456",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/profile-score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many requests/i);
  });

  it("returns 404 when advisor profile not found", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      // professionals → maybeSingle null; services and certs → count 0
      if (call === 1) return makeBuilder(null, null);
      return makeBuilder(null, null, 0);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Advisor not found/i);
  });

  it("returns full 100 score for a complete profile", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) return makeBuilder(fullProfile, null);
      // services count = 2, certs count = 1
      if (call === 2) return makeBuilder(null, null, 2);
      return makeBuilder(null, null, 1);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.score).toBe(100);
    expect(json.maxScore).toBe(100);
    expect(Array.isArray(json.breakdown)).toBe(true);
    expect(json.breakdown).toHaveLength(10);
    expect(json.breakdown.every((b: { earned: boolean }) => b.earned)).toBe(true);
  });

  it("returns score 0 for an empty profile", async () => {
    const emptyProfile = {
      photo_url: null,
      bio: null,
      specialties: null,
      booking_link: null,
      review_count: 0,
      rating: 0,
      website: null,
      afsl_number: null,
    };
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) return makeBuilder(emptyProfile, null);
      return makeBuilder(null, null, 0);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.score).toBe(0);
    expect(json.breakdown.every((b: { earned: boolean }) => !b.earned)).toBe(true);
  });

  it("excludes ui-avatars placeholder from photo score", async () => {
    const profile = { ...fullProfile, photo_url: "https://ui-avatars.com/api/?name=Test" };
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) return makeBuilder(profile, null);
      if (call === 2) return makeBuilder(null, null, 2);
      return makeBuilder(null, null, 1);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // photo_url is a placeholder — 15 pts not earned
    expect(json.score).toBe(85);
    const photoItem = json.breakdown.find((b: { label: string }) => b.label === "Profile photo");
    expect(photoItem?.earned).toBe(false);
  });

  it("earns bio points only when bio > 100 chars", async () => {
    const shortBio = { ...fullProfile, bio: "Short bio" };
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) return makeBuilder(shortBio, null);
      if (call === 2) return makeBuilder(null, null, 1);
      return makeBuilder(null, null, 1);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    const bioItem = json.breakdown.find((b: { label: string }) => b.label === "Bio (100+ characters)");
    expect(bioItem?.earned).toBe(false);
  });

  it("returns each breakdown item with label, points, earned, tip fields", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) return makeBuilder(fullProfile, null);
      if (call === 2) return makeBuilder(null, null, 1);
      return makeBuilder(null, null, 1);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    for (const item of json.breakdown) {
      expect(typeof item.label).toBe("string");
      expect(typeof item.points).toBe("number");
      expect(typeof item.earned).toBe("boolean");
      expect(typeof item.tip).toBe("string");
    }
  });

  it("earns review points only when review_count >= 5", async () => {
    const fewReviews = { ...fullProfile, review_count: 4 };
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) return makeBuilder(fewReviews, null);
      if (call === 2) return makeBuilder(null, null, 1);
      return makeBuilder(null, null, 1);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    const reviewItem = json.breakdown.find((b: { label: string }) => b.label === "5+ reviews");
    expect(reviewItem?.earned).toBe(false);
  });
});
