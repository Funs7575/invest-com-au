/**
 * Tests for the real refresh-loan-rates cron pipeline.
 *
 * Key behaviours:
 *   - requireCronAuth gate
 *   - Freshness report built from most-recent updated_at
 *   - DB fallback (no credentials) → upserts existing rows with new updated_at
 *   - Validation failures are reported without crashing
 *   - DB upsert error returns 500
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

const { mockRequireCronAuth } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

// ─── Supabase mock ─────────────────────────────────────────────────────────────
//
// The route calls createAdminClient() twice per request:
//   Call #1 — in the cron handler (freshness .select().order().limit().maybeSingle())
//              and the final .upsert()
//   Call #2 — inside LoanRateDbAdapter.fetch() (adapter .select().order().limit())
//
// We mock at the LoanRateDbAdapter and the cron handler level rather than trying
// to sequence two createAdminClient() calls in one factory, which is fragile.
// Instead we mock the adapter module directly to return controlled rows.

const { mockAdapterFetch } = vi.hoisted(() => ({
  mockAdapterFetch: vi.fn(),
}));

vi.mock("@/lib/rate-ingest-adapters", () => ({
  selectLoanRateAdapter: vi.fn(() => ({
    adapter: { fetch: mockAdapterFetch },
    credentialed: false,
  })),
}));

// Supabase mock — only used for the cron handler's freshness check + upsert.
let freshnessData: { updated_at: string } | null = { updated_at: "2026-05-18T00:00:00Z" };
let upsertError: { message: string } | null = null;
const mockUpsert = vi.fn();
const mockMaybySingle = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// ─── Import route after mocks ─────────────────────────────────────────────────

import { GET as _GET, runtime, maxDuration } from "@/app/api/cron/refresh-loan-rates/route";
import type { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

const GET = _GET as unknown as (req: NextRequest) => Promise<NextResponse>;

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/refresh-loan-rates") as unknown as NextRequest;
}

const validAdapterRow = {
  lender_slug: "commonwealth-bank",
  lender_name: "Commonwealth Bank",
  rate_pct: 6.49,
  comparison_rate_pct: 6.55,
  max_lvr: 80,
  interest_only: true,
  offset_available: true,
  min_loan_cents: 10_000_000,
  apply_url: "/find-advisor",
};

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  freshnessData = { updated_at: "2026-05-18T00:00:00Z" };
  upsertError = null;

  // Default adapter: returns one valid row
  mockAdapterFetch.mockResolvedValue({
    rows: [validAdapterRow],
    source: "admin_db",
  });

  // Freshness query mock (.select().order().limit().maybeSingle())
  mockMaybySingle.mockResolvedValue({ data: freshnessData, error: null });
  mockUpsert.mockResolvedValue({ error: upsertError });

  // Route calls .from("investment_loan_rates") twice:
  //   1st: freshness — .select().order().limit().maybeSingle()
  //   2nd: upsert — .upsert(...)
  // We need to handle both off the same mockFrom.
  mockFrom.mockImplementation(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: freshnessData, error: null })),
        })),
      })),
    })),
    upsert: vi.fn(() => Promise.resolve({ error: upsertError })),
  }));

  mockRequireCronAuth.mockReturnValue(null);
  process.env.CRON_SECRET = "a-sufficiently-long-test-secret";
  delete process.env.LOAN_RATE_FEED_URL;
  delete process.env.LOAN_RATE_FEED_API_KEY;
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/refresh-loan-rates", () => {
  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 200 with upserted count on happy path", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.upserted).toBe(1);
    expect(json.invalid).toBe(0);
    expect(json.source).toBe("admin_db");
    expect(json.credentialed).toBe(false);
    expect(json.freshness).toBeDefined();
    expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes staleness info in freshness report", async () => {
    freshnessData = { updated_at: "2026-05-01T00:00:00Z" };
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: freshnessData, error: null })),
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    }));
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.freshness.isStale).toBe(true);
    expect(json.freshness.daysSince).toBeGreaterThanOrEqual(7);
  });

  it("includes freshness data from null updated_at (empty table)", async () => {
    freshnessData = null;
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    }));
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.freshness.lastCapturedAt).toBeNull();
    expect(json.freshness.isStale).toBe(true);
  });

  it("returns 200 with note when adapter returns no rows", async () => {
    mockAdapterFetch.mockResolvedValue({ rows: [], source: "admin_db" });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.upserted).toBe(0);
    expect(json.note).toMatch(/no rows/);
  });

  it("returns 500 when all rows fail validation", async () => {
    mockAdapterFetch.mockResolvedValue({
      rows: [{ lender_slug: "INVALID SLUG!", lender_name: "Bad", rate_pct: 999 }],
      source: "admin_db",
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.invalid).toBeGreaterThan(0);
    expect(json.note).toMatch(/validation/);
  });

  it("returns 500 when DB upsert fails", async () => {
    upsertError = { message: "connection refused" };
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: freshnessData, error: null })),
          })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: upsertError })),
    }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("connection refused");
  });

  it("reports partial invalid rows but still upserts valid rows", async () => {
    mockAdapterFetch.mockResolvedValue({
      rows: [
        validAdapterRow,
        { lender_slug: "INVALID!", rate_pct: 999 }, // invalid
      ],
      source: "admin_db",
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.upserted).toBe(1);
    expect(json.invalid).toBe(1);
    expect(json.validationFailures).toHaveLength(1);
  });

  it("upserts with updated_at stamped to now", async () => {
    const capturedUpsertArgs: unknown[] = [];
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: freshnessData, error: null })),
          })),
        })),
      })),
      upsert: vi.fn((rows: unknown) => {
        capturedUpsertArgs.push(rows);
        return Promise.resolve({ error: null });
      }),
    }));

    const before = Date.now();
    await GET(makeReq());
    const after = Date.now();

    expect(capturedUpsertArgs).toHaveLength(1);
    const rows = capturedUpsertArgs[0] as { updated_at: string; lender_slug: string }[];
    expect(rows[0]?.lender_slug).toBe("commonwealth-bank");
    const updatedAt = new Date(rows[0]?.updated_at ?? "").getTime();
    expect(updatedAt).toBeGreaterThanOrEqual(before);
    expect(updatedAt).toBeLessThanOrEqual(after);
  });
});
