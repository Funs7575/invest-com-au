import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatResponseTimeLabel } from "@/lib/advisor-response-time";

// ── formatResponseTimeLabel (pure function — no mocks needed) ─────────────────

describe("formatResponseTimeLabel", () => {
  it("returns null when stats is null", () => {
    expect(formatResponseTimeLabel(null)).toBeNull();
  });

  it("returns null when stats is undefined", () => {
    expect(formatResponseTimeLabel(undefined)).toBeNull();
  });

  it("returns null when median_hours is null", () => {
    expect(formatResponseTimeLabel({ median_hours: null, sample_size: 10 })).toBeNull();
  });

  it("returns null when sample_size < 3 (insufficient data)", () => {
    expect(formatResponseTimeLabel({ median_hours: 2, sample_size: 2 })).toBeNull();
  });

  it("returns null when sample_size is exactly 3 but median_hours is null", () => {
    expect(formatResponseTimeLabel({ median_hours: null, sample_size: 3 })).toBeNull();
  });

  it("returns 'within 1h' label for < 1h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 0.5, sample_size: 5 })).toBe(
      "Usually responds within 1h",
    );
  });

  it("returns 'within 1h' label for 0h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 0, sample_size: 5 })).toBe(
      "Usually responds within 1h",
    );
  });

  it("returns 'within 4h' label for 1h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 1, sample_size: 5 })).toBe(
      "Usually responds within 4h",
    );
  });

  it("returns 'within 4h' label for 3.9h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 3.9, sample_size: 10 })).toBe(
      "Usually responds within 4h",
    );
  });

  it("returns 'within 12h' label for 4h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 4, sample_size: 5 })).toBe(
      "Usually responds within 12h",
    );
  });

  it("returns 'within 12h' label for 11.9h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 11.9, sample_size: 5 })).toBe(
      "Usually responds within 12h",
    );
  });

  it("returns 'within 24h' label for 12h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 12, sample_size: 5 })).toBe(
      "Usually responds within 24h",
    );
  });

  it("returns 'within 24h' label for 23.9h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 23.9, sample_size: 5 })).toBe(
      "Usually responds within 24h",
    );
  });

  it("returns '2 days' label for 24h median", () => {
    expect(formatResponseTimeLabel({ median_hours: 24, sample_size: 5 })).toBe(
      "Usually responds within 2 days",
    );
  });

  it("returns '2 days' label for very large median", () => {
    expect(formatResponseTimeLabel({ median_hours: 200, sample_size: 10 })).toBe(
      "Usually responds within 2 days",
    );
  });

  it("is null for exactly sample_size=2 regardless of median", () => {
    expect(formatResponseTimeLabel({ median_hours: 0.1, sample_size: 2 })).toBeNull();
  });

  it("is non-null for sample_size=3 with valid median", () => {
    expect(formatResponseTimeLabel({ median_hours: 2, sample_size: 3 })).not.toBeNull();
  });
});

// ── computeAdvisorResponseTime (Supabase-dependent) ───────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { computeAdvisorResponseTime, batchAdvisorResponseTimes } from "@/lib/advisor-response-time";

function makeChain(data: unknown[] | null, error = null) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.gte = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve({ data, error }));
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe("computeAdvisorResponseTime", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null median and sample_size 0 when no data", async () => {
    makeChain([]);
    const result = await computeAdvisorResponseTime(1);
    expect(result).toEqual({ median_hours: null, sample_size: 0 });
  });

  it("returns null median when data is null", async () => {
    makeChain(null);
    const result = await computeAdvisorResponseTime(1);
    expect(result).toEqual({ median_hours: null, sample_size: 0 });
  });

  it("returns null median when all rows are non-public_job source", async () => {
    makeChain([
      {
        created_at: "2026-01-01T02:00:00Z",
        advisor_auctions: { created_at: "2026-01-01T00:00:00Z", source: "direct_match" },
      },
    ]);
    const result = await computeAdvisorResponseTime(1);
    expect(result).toEqual({ median_hours: null, sample_size: 0 });
  });

  it("computes median_hours from a single public_job bid", async () => {
    // 2-hour gap: bid at T+2h
    const auctionCreated = "2026-01-01T00:00:00Z";
    const bidCreated = "2026-01-01T02:00:00Z";
    makeChain([
      {
        created_at: bidCreated,
        advisor_auctions: { created_at: auctionCreated, source: "public_job" },
      },
    ]);
    const result = await computeAdvisorResponseTime(1);
    expect(result.median_hours).toBe(2);
    expect(result.sample_size).toBe(1);
  });

  it("computes median correctly from multiple bids", async () => {
    // Gaps: 1h, 3h, 5h → sorted median is 3h
    const base = new Date("2026-01-01T00:00:00Z").getTime();
    const row = (ms: number) => ({
      created_at: new Date(base + ms).toISOString(),
      advisor_auctions: { created_at: "2026-01-01T00:00:00Z", source: "public_job" },
    });
    makeChain([row(1 * 3600_000), row(3 * 3600_000), row(5 * 3600_000)]);
    const result = await computeAdvisorResponseTime(1);
    expect(result.median_hours).toBe(3);
    expect(result.sample_size).toBe(3);
  });

  it("skips rows with negative time delta (bid before auction — data anomaly)", async () => {
    makeChain([
      {
        created_at: "2026-01-01T00:00:00Z",
        advisor_auctions: { created_at: "2026-01-01T02:00:00Z", source: "public_job" },
      },
    ]);
    const result = await computeAdvisorResponseTime(1);
    expect(result).toEqual({ median_hours: null, sample_size: 0 });
  });
});

describe("batchAdvisorResponseTimes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty Map when advisorIds is empty (no DB call)", async () => {
    const result = await batchAdvisorResponseTimes([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns an empty Map when DB returns null", async () => {
    makeChain(null);
    const result = await batchAdvisorResponseTimes([1, 2]);
    expect(result.size).toBe(0);
  });

  it("maps each advisor to their median hours", async () => {
    const base = new Date("2026-01-01T00:00:00Z").getTime();
    makeChain([
      {
        advisor_id: 1,
        created_at: new Date(base + 2 * 3600_000).toISOString(),
        advisor_auctions: { created_at: "2026-01-01T00:00:00Z", source: "public_job" },
      },
      {
        advisor_id: 2,
        created_at: new Date(base + 6 * 3600_000).toISOString(),
        advisor_auctions: { created_at: "2026-01-01T00:00:00Z", source: "public_job" },
      },
    ]);
    const result = await batchAdvisorResponseTimes([1, 2]);
    expect(result.get(1)?.median_hours).toBe(2);
    expect(result.get(2)?.median_hours).toBe(6);
  });

  it("skips non-public_job rows", async () => {
    const base = new Date("2026-01-01T00:00:00Z").getTime();
    makeChain([
      {
        advisor_id: 1,
        created_at: new Date(base + 2 * 3600_000).toISOString(),
        advisor_auctions: { created_at: "2026-01-01T00:00:00Z", source: "direct_match" },
      },
    ]);
    const result = await batchAdvisorResponseTimes([1]);
    expect(result.has(1)).toBe(false);
  });
});
