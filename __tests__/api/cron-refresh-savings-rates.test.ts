/**
 * Tests for the refresh-savings-rates cron pipeline.
 *
 * Key behaviours:
 *   - requireCronAuth gate
 *   - Freshness report built from most-recent captured_at
 *   - DB fallback (no credentials) → inserts existing rows with new captured_at
 *   - Validation failures are reported without crashing
 *   - DB insert error returns 500
 *   - Empty adapter result returns graceful 200
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

// ─── Supabase mock ────────────────────────────────────────────────────────────

// The route calls supabase in 3 places:
//   1. maybeSingle() — freshness check (most recent captured_at)
//   2. SavingsRateDbAdapter.fetch() — select snapshots
//   3. insert() — write new snapshots

let freshnessData: { captured_at: string } | null = { captured_at: "2026-05-22T00:00:00Z" };

let adapterRows: Record<string, unknown>[] = [
  {
    broker_id: 1,
    product_kind: "savings_account",
    rate_bps: 525,
    intro_rate_bps: null,
    intro_term_months: null,
    min_balance_cents: 0,
    max_balance_cents: null,
    term_months: null,
    source: "manual",
    notes: "",
  },
];
let adapterError: { message: string } | null = null;
let insertError: { message: string } | null = null;

const mockMaybySingle = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import route after mocks ─────────────────────────────────────────────────

vi.mock("@/lib/consumer-webhook-dispatch", () => ({
  fireConsumerWebhook: vi.fn(),
}));

import { GET as _GET, runtime, maxDuration } from "@/app/api/cron/refresh-savings-rates/route";
import type { NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

const GET = _GET as unknown as (req: NextRequest) => Promise<NextResponse>;

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/refresh-savings-rates") as unknown as NextRequest;
}

// ─── Test setup ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  freshnessData = { captured_at: "2026-05-22T00:00:00Z" };
  adapterRows = [
    {
      broker_id: 1,
      product_kind: "savings_account",
      rate_bps: 525,
      intro_rate_bps: null,
      intro_term_months: null,
      min_balance_cents: 0,
      max_balance_cents: null,
      term_months: null,
      source: "manual",
      notes: "",
    },
  ];
  adapterError = null;
  insertError = null;
  mockRequireCronAuth.mockReturnValue(null);
  process.env.CRON_SECRET = "a-sufficiently-long-test-secret";
  delete process.env.SAVINGS_RATE_FEED_URL;
  delete process.env.SAVINGS_RATE_FEED_API_KEY;

  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    callCount++;
    if (callCount === 1 && table === "savings_rate_snapshots") {
      // Freshness query
      mockMaybySingle.mockResolvedValue({ data: freshnessData, error: null });
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({ maybeSingle: mockMaybySingle })),
          })),
        })),
      };
    }
    if (callCount === 2 && table === "savings_rate_snapshots") {
      // Adapter select
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: adapterRows, error: adapterError })),
          })),
        })),
      };
    }
    if (callCount === 3 && table === "savings_rate_snapshots") {
      // Insert
      mockInsert.mockResolvedValue({ error: insertError });
      return { insert: mockInsert };
    }
    // Fallback
    return {
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({ maybeSingle: vi.fn(() => ({ data: null, error: null })) })),
        })),
      })),
    };
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/refresh-savings-rates", () => {
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

  it("returns 200 with inserted count on happy path", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.inserted).toBe(1);
    expect(json.invalid).toBe(0);
    expect(json.source).toBe("admin_db");
    expect(json.credentialed).toBe(false);
    expect(json.freshness).toBeDefined();
    expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("marks data stale when captured_at is > 3 days old", async () => {
    freshnessData = { captured_at: "2026-05-01T00:00:00Z" }; // 24+ days ago
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.freshness.isStale).toBe(true);
    expect(json.freshness.daysSince).toBeGreaterThanOrEqual(3);
  });

  it("reports fresh when captured_at is within 3 days", async () => {
    // Within 2 days
    const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    freshnessData = { captured_at: recent };
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.freshness.isStale).toBe(false);
  });

  it("returns 200 with note when adapter returns no rows", async () => {
    adapterRows = [];
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.inserted).toBe(0);
    expect(json.note).toMatch(/no rows/);
  });

  it("returns 500 when all rows fail validation", async () => {
    adapterRows = [{ broker_id: -1, product_kind: "savings_account", rate_bps: 999 }];
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.invalid).toBeGreaterThan(0);
    expect(json.note).toMatch(/validation/);
  });

  it("returns 500 when DB insert fails", async () => {
    insertError = { message: "relation does not exist" };
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("relation does not exist");
  });

  it("reports partial invalid rows but still inserts valid rows", async () => {
    adapterRows = [
      {
        broker_id: 1,
        product_kind: "savings_account",
        rate_bps: 525,
        intro_rate_bps: null,
        intro_term_months: null,
        min_balance_cents: 0,
        max_balance_cents: null,
        term_months: null,
        source: "manual",
        notes: "",
      },
      // Invalid: intro_rate_bps without intro_term_months
      {
        broker_id: 2,
        product_kind: "savings_account",
        rate_bps: 400,
        intro_rate_bps: 500,
        // missing intro_term_months
      },
    ];
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.inserted).toBe(1);
    expect(json.invalid).toBe(1);
    expect(json.validationFailures).toHaveLength(1);
  });

  it("inserts rows with captured_at stamped to now", async () => {
    const before = Date.now();
    const res = await GET(makeReq());
    const after = Date.now();
    expect(res.status).toBe(200);

    // Check that insert was called with a captured_at in our window
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          captured_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          broker_id: 1,
          product_kind: "savings_account",
          rate_bps: 525,
        }),
      ]),
    );

    const [rows] = mockInsert.mock.calls[0] as [{ captured_at: string }[]];
    const insertedAt = new Date(rows[0]!.captured_at).getTime();
    expect(insertedAt).toBeGreaterThanOrEqual(before);
    expect(insertedAt).toBeLessThanOrEqual(after);
  });

  it("sets source=manual when adapter source is admin_db", async () => {
    await GET(makeReq());
    const [rows] = mockInsert.mock.calls[0] as [{ source: string }[]];
    expect(rows[0]?.source).toBe("manual");
  });
});
