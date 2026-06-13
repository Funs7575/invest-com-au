/**
 * Tests for lib/decision-kit/respondents.ts — matrix composition with missing
 * metrics, ordering, and fail-soft scorecard read/write.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockProSelect,
  mockBatchResponseTimes,
  mockGetOutcomeBadge,
  mockScorecardUpsert,
  mockScorecardSelect,
} = vi.hoisted(() => ({
  mockProSelect: vi.fn(),
  mockBatchResponseTimes: vi.fn(),
  mockGetOutcomeBadge: vi.fn(),
  mockScorecardUpsert: vi.fn(),
  mockScorecardSelect: vi.fn(),
}));

// Admin client router: dispatch by table name.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "professionals") {
        return { select: () => ({ in: mockProSelect }) };
      }
      if (table === "respondent_scorecards") {
        return {
          upsert: mockScorecardUpsert,
          select: () => ({ eq: () => ({ eq: mockScorecardSelect }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/advisor-response-time", () => ({
  batchAdvisorResponseTimes: (...a: unknown[]) => mockBatchResponseTimes(...a),
}));

vi.mock("@/lib/outcomes/profile-display", () => ({
  getProviderOutcomeBadge: (...a: unknown[]) => mockGetOutcomeBadge(...a),
}));

import {
  composeRespondentRows,
  listScorecards,
  upsertScorecard,
  normaliseOwnerKey,
} from "@/lib/decision-kit/respondents";

function proRow(id: number, over: Record<string, unknown> = {}) {
  return {
    id,
    slug: `pro-${id}`,
    name: `Pro ${id}`,
    firm_name: null,
    photo_url: null,
    type: "financial_planner",
    specialties: ["Retirement"],
    location_display: "Sydney, NSW",
    meeting_types: ["in-person", "video"],
    verified: true,
    booking_enabled: false,
    booking_link: null,
    accepting_new_clients: true,
    afsl_number: "123456",
    registration_number: null,
    verified_at: null,
    created_at: "2020-01-01T00:00:00Z",
    years_experience: 10,
    bio: "A long enough bio to count for transparency scoring purposes.",
    qualifications: [{ name: "CFP" }],
    education: [],
    memberships: [],
    fee_structure: "Fixed fee",
    fee_description: null,
    linkedin_url: null,
    website: "https://example.com",
    languages: ["English"],
    rating: 4.5,
    review_count: 12,
    ...over,
  };
}

describe("normaliseOwnerKey", () => {
  it("lowercases and trims", () => {
    expect(normaliseOwnerKey("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
  it("handles null/undefined", () => {
    expect(normaliseOwnerKey(null)).toBe("");
    expect(normaliseOwnerKey(undefined)).toBe("");
  });
});

describe("composeRespondentRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchResponseTimes.mockResolvedValue(new Map());
    mockGetOutcomeBadge.mockResolvedValue(null);
  });

  it("returns [] for empty inputs without querying", async () => {
    const rows = await composeRespondentRows([]);
    expect(rows).toEqual([]);
    expect(mockProSelect).not.toHaveBeenCalled();
  });

  it("composes a row with a computed trust score and honest gaps for missing metrics", async () => {
    mockProSelect.mockResolvedValue({ data: [proRow(1)], error: null });
    const rows = await composeRespondentRows([
      { professionalId: 1, amountCents: 50000, bidId: 9 },
    ]);
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.professionalId).toBe(1);
    expect(r.amountCents).toBe(50000);
    expect(r.trust.overall).toBeGreaterThan(0);
    expect(r.trust.overall).toBeLessThanOrEqual(100);
    // No response-time / outcome data provided → honest nulls.
    expect(r.responseTime).toBeNull();
    expect(r.outcome).toBeNull();
    expect(r.specialties).toEqual(["Retirement"]);
  });

  it("preserves the caller's input ordering", async () => {
    mockProSelect.mockResolvedValue({ data: [proRow(1), proRow(2)], error: null });
    const rows = await composeRespondentRows([
      { professionalId: 2, amountCents: 100, bidId: 1 },
      { professionalId: 1, amountCents: 200, bidId: 2 },
    ]);
    expect(rows.map((r) => r.professionalId)).toEqual([2, 1]);
  });

  it("drops inputs whose professional row is missing", async () => {
    mockProSelect.mockResolvedValue({ data: [proRow(1)], error: null });
    const rows = await composeRespondentRows([
      { professionalId: 1, amountCents: null, bidId: null },
      { professionalId: 999, amountCents: null, bidId: null },
    ]);
    expect(rows.map((r) => r.professionalId)).toEqual([1]);
  });

  it("attaches response-time and outcome signals when present", async () => {
    mockProSelect.mockResolvedValue({ data: [proRow(1)], error: null });
    mockBatchResponseTimes.mockResolvedValue(
      new Map([[1, { median_hours: 3, sample_size: 5 }]]),
    );
    mockGetOutcomeBadge.mockResolvedValue({
      completion_rate_pct: 85,
      outcomes_submitted: 4,
      avg_rating: 4.6,
    });
    const rows = await composeRespondentRows([
      { professionalId: 1, amountCents: null, bidId: null },
    ]);
    expect(rows[0]!.responseTime).toEqual({ median_hours: 3, sample_size: 5 });
    expect(rows[0]!.outcome?.completion_rate_pct).toBe(85);
  });

  it("fails soft to [] when the professionals query errors", async () => {
    mockProSelect.mockResolvedValue({ data: null, error: { message: "boom" } });
    const rows = await composeRespondentRows([
      { professionalId: 1, amountCents: null, bidId: null },
    ]);
    expect(rows).toEqual([]);
  });

  it("still composes when response-time batch throws", async () => {
    mockProSelect.mockResolvedValue({ data: [proRow(1)], error: null });
    mockBatchResponseTimes.mockRejectedValue(new Error("rt down"));
    const rows = await composeRespondentRows([
      { professionalId: 1, amountCents: null, bidId: null },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.responseTime).toBeNull();
  });
});

describe("listScorecards (fail-soft)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns [] for an empty owner key without querying", async () => {
    const out = await listScorecards("", 1);
    expect(out).toEqual([]);
    expect(mockScorecardSelect).not.toHaveBeenCalled();
  });

  it("maps rows and sanitises criteria", async () => {
    mockScorecardSelect.mockResolvedValue({
      data: [
        {
          professional_id: 1,
          criteria: { clarity: 4, bogus: 9 },
          notes: "ok",
          overall: null,
          updated_at: "2026-06-12T00:00:00Z",
        },
      ],
      error: null,
    });
    const out = await listScorecards("a@b.com", 7);
    expect(out).toHaveLength(1);
    expect(out[0]!.criteria).toEqual({ clarity: 4 });
    expect(out[0]!.notes).toBe("ok");
  });

  it("returns [] when the table is missing (42P01)", async () => {
    mockScorecardSelect.mockResolvedValue({
      data: null,
      error: { code: "42P01", message: 'relation "respondent_scorecards" does not exist' },
    });
    const out = await listScorecards("a@b.com", 7);
    expect(out).toEqual([]);
  });
});

describe("upsertScorecard (fail-soft)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ok on a successful upsert", async () => {
    mockScorecardUpsert.mockResolvedValue({ error: null });
    const res = await upsertScorecard({
      ownerKey: "a@b.com",
      briefId: 1,
      professionalId: 2,
      criteria: { clarity: 4 },
      notes: null,
      overall: null,
    });
    expect(res).toEqual({ ok: true, saved: true });
  });

  it("returns table_missing on 42P01", async () => {
    mockScorecardUpsert.mockResolvedValue({
      error: { code: "42P01", message: "does not exist" },
    });
    const res = await upsertScorecard({
      ownerKey: "a@b.com",
      briefId: 1,
      professionalId: 2,
      criteria: {},
      notes: null,
      overall: null,
    });
    expect(res).toEqual({ ok: false, reason: "table_missing" });
  });

  it("returns error on other DB failures", async () => {
    mockScorecardUpsert.mockResolvedValue({
      error: { code: "23505", message: "some other error" },
    });
    const res = await upsertScorecard({
      ownerKey: "a@b.com",
      briefId: 1,
      professionalId: 2,
      criteria: {},
      notes: null,
      overall: null,
    });
    expect(res).toEqual({ ok: false, reason: "error" });
  });
});
