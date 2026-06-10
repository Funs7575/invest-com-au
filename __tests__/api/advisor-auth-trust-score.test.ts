import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 77),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/trust-score/route";

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

type ProfRow = {
  id: number;
  verified: boolean | null;
  afsl_number: string | null;
  registration_number: string | null;
  verified_at: string | null;
  created_at: string | null;
  years_experience: number | null;
  bio: string | null;
  photo_url: string | null;
  qualifications: unknown[] | null;
  education: unknown[] | null;
  memberships: unknown[] | null;
  fee_structure: string | null;
  fee_description: string | null;
  linkedin_url: string | null;
  website: string | null;
  languages: unknown[] | null;
  rating: number | null;
  review_count: number | null;
  trust_score_overall: number | null;
  trust_score_updated_at: string | null;
  trust_score_version: number | null;
};

const EMPTY_ROW: ProfRow = {
  id: 77,
  verified: null,
  afsl_number: null,
  registration_number: null,
  verified_at: null,
  created_at: null,
  years_experience: null,
  bio: null,
  photo_url: null,
  qualifications: null,
  education: null,
  memberships: null,
  fee_structure: null,
  fee_description: null,
  linkedin_url: null,
  website: null,
  languages: null,
  rating: null,
  review_count: null,
  trust_score_overall: null,
  trust_score_updated_at: null,
  trust_score_version: null,
};

const FULL_ROW: ProfRow = {
  ...EMPTY_ROW,
  verified: true,
  afsl_number: "123456",
  registration_number: "AR-789",
  verified_at: new Date(Date.now() - 30 * 86400000).toISOString(), // 30 days ago (recent)
  created_at: new Date(Date.now() - 15 * 365 * 86400000).toISOString(), // 15 years ago
  years_experience: 15,
  bio: "I am a highly experienced financial advisor with decades of expertise.",
  photo_url: "https://example.com/photo.jpg",
  qualifications: [{ name: "CFP" }],
  education: [{ degree: "BCom" }],
  memberships: [{ org: "FPA" }],
  fee_structure: "fee-for-service",
  fee_description: "Flat fee for comprehensive advice.",
  linkedin_url: "https://linkedin.com/in/advisor",
  website: "https://advisor.com",
  languages: ["English", "Mandarin"],
  rating: 4.8,
  review_count: 25,
  trust_score_overall: 95,
  trust_score_updated_at: "2025-01-01T00:00:00Z",
  trust_score_version: 2,
};

function makeGet() {
  return new NextRequest(
    "http://localhost/api/advisor-auth/trust-score",
    { method: "GET" },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/trust-score — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(77);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/unauthorized/i);
  });
});

describe("GET /api/advisor-auth/trust-score — DB error + not found", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(77);
  });

  it("returns 404 when professional row is not found (null data)", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("not_found");
  });

  it("returns 404 when DB returns an error", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "row not found" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(404);
  });
});

describe("GET /api/advisor-auth/trust-score — success: score structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(77);
  });

  it("returns score object with required shape", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(FULL_ROW, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      score: {
        overall: number;
        label: string;
        labelColor: string;
        dimensions: unknown[];
        computedAt: string;
      };
      cached_overall: number | null;
      cached_updated_at: string | null;
      cached_version: number;
    };

    expect(typeof body.score.overall).toBe("number");
    expect(body.score.overall).toBeGreaterThanOrEqual(0);
    expect(body.score.overall).toBeLessThanOrEqual(100);
    expect(typeof body.score.label).toBe("string");
    expect(typeof body.score.labelColor).toBe("string");
    expect(Array.isArray(body.score.dimensions)).toBe(true);
    expect(body.score.dimensions).toHaveLength(4);
    expect(typeof body.score.computedAt).toBe("string");

    expect(body.cached_overall).toBe(95);
    expect(body.cached_updated_at).toBe("2025-01-01T00:00:00Z");
    expect(body.cached_version).toBe(2);
  });

  it("returns null for cached fields when they are null in DB", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(EMPTY_ROW, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      cached_overall: unknown;
      cached_updated_at: unknown;
      cached_version: number;
    };
    expect(body.cached_overall).toBeNull();
    expect(body.cached_updated_at).toBeNull();
    expect(body.cached_version).toBe(0);
  });

  it("computes a high overall score for a fully-populated profile", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(FULL_ROW, null));
    const res = await GET(makeGet());
    const body = await res.json() as { score: { overall: number; label: string } };
    // Full profile with verification, 15yr experience, all fields, 25 reviews → should be high
    expect(body.score.overall).toBeGreaterThan(80);
    expect(body.score.label).toBe("Strong");
  });

  it("computes a low overall score for a bare profile", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(EMPTY_ROW, null));
    const res = await GET(makeGet());
    const body = await res.json() as { score: { overall: number; label: string } };
    // No signals → should be low
    expect(body.score.overall).toBeLessThan(50);
  });

  it("returns 4 dimension keys: verification, track_record, transparency, client_feedback", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(EMPTY_ROW, null));
    const res = await GET(makeGet());
    const body = await res.json() as {
      score: { dimensions: Array<{ key: string }> };
    };
    const keys = body.score.dimensions.map((d) => d.key);
    expect(keys).toContain("verification");
    expect(keys).toContain("track_record");
    expect(keys).toContain("transparency");
    expect(keys).toContain("client_feedback");
  });

  it("score is always fresh (computed, not relying on cached_overall)", async () => {
    // Provide a row with cached_overall=10 but full profile that scores much higher
    const rowWithStaleCache: ProfRow = {
      ...FULL_ROW,
      trust_score_overall: 10, // stale low score
    };
    mockAdminFrom.mockReturnValue(makeBuilder(rowWithStaleCache, null));
    const res = await GET(makeGet());
    const body = await res.json() as {
      score: { overall: number };
      cached_overall: number | null;
    };
    // Fresh computed score should differ from the stale cache
    expect(body.score.overall).toBeGreaterThan(80);
    expect(body.cached_overall).toBe(10); // stale value echoed as-is
    expect(body.score.overall).not.toBe(body.cached_overall);
  });
});
