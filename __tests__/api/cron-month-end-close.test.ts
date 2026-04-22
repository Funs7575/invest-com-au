import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

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

// Unwrap wrapCronHandler so tests can call GET directly without
// also exercising the cron_run_log persistence path.
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

// Shared state across mocks
type PeriodRow = {
  period_start: string;
  period_end: string;
  status: "open" | "closing" | "closed";
};

let existingPeriod: PeriodRow | null = null;
let closeResult:
  | { ok: true; period: PeriodRow; summary: Record<string, unknown> }
  | { ok: false; reason: string } = {
    ok: true,
    period: {
      period_start: "2026-03-01",
      period_end: "2026-03-31",
      status: "closed",
    },
    summary: { revenue_cents: 123456, invoices_count: 12 },
  };

const getPeriodCalls: { start: string; end: string }[] = [];
const closePeriodCalls: {
  start: string;
  end: string;
  closedBy: string;
  notes: string;
}[] = [];

vi.mock("@/lib/financial-periods", () => ({
  previousMonthBounds: vi.fn(() => ({
    start: "2026-03-01",
    end: "2026-03-31",
  })),
  getPeriod: vi.fn(async (start: string, end: string) => {
    getPeriodCalls.push({ start, end });
    return existingPeriod;
  }),
  closePeriod: vi.fn(
    async (input: {
      periodStart: string;
      periodEnd: string;
      closedBy: string;
      notes: string;
    }) => {
      closePeriodCalls.push({
        start: input.periodStart,
        end: input.periodEnd,
        closedBy: input.closedBy,
        notes: input.notes,
      });
      return closeResult;
    },
  ),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/month-end-close/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(
  path = "http://localhost/api/cron/month-end-close",
  headers: Record<string, string> = {},
): NextRequest {
  return new Request(path, { headers }) as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/month-end-close", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existingPeriod = null;
    closeResult = {
      ok: true,
      period: {
        period_start: "2026-03-01",
        period_end: "2026-03-31",
        status: "closed",
      },
      summary: { revenue_cents: 123456, invoices_count: 12 },
    };
    getPeriodCalls.length = 0;
    closePeriodCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("auth short-circuits before touching financial_periods", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(getPeriodCalls).toHaveLength(0);
    expect(closePeriodCalls).toHaveLength(0);
  });

  it("returns already_closed no-op when the prior month is already closed (idempotent)", async () => {
    existingPeriod = {
      period_start: "2026-03-01",
      period_end: "2026-03-31",
      status: "closed",
    };

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      ok: true,
      already_closed: true,
      period: existingPeriod,
    });
    // The expensive close path must NOT run when the period is closed
    expect(closePeriodCalls).toHaveLength(0);
  });

  it("closes the previous month and echoes the summary on success", async () => {
    existingPeriod = null;

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.period).toMatchObject({ status: "closed" });
    expect(json.summary).toEqual({ revenue_cents: 123456, invoices_count: 12 });

    // Correct bounds were queried AND closed
    expect(getPeriodCalls).toEqual([{ start: "2026-03-01", end: "2026-03-31" }]);
    expect(closePeriodCalls).toHaveLength(1);
    expect(closePeriodCalls[0]).toMatchObject({
      start: "2026-03-01",
      end: "2026-03-31",
      notes: "automated month-end close",
    });
    // Default closedBy is the system marker (no x-admin-manual header)
    expect(closePeriodCalls[0]?.closedBy).toBe("system:month-end-close");
  });

  it("honours ?start and ?end query params when both are set (admin-triggered close of a specific period)", async () => {
    existingPeriod = null;

    const res = await GET(
      makeReq(
        "http://localhost/api/cron/month-end-close?start=2026-01-01&end=2026-01-31",
      ),
    );
    expect(res.status).toBe(200);
    expect(getPeriodCalls).toEqual([{ start: "2026-01-01", end: "2026-01-31" }]);
    expect(closePeriodCalls[0]).toMatchObject({
      start: "2026-01-01",
      end: "2026-01-31",
    });
  });

  it("tags the audit row with the admin email when x-admin-manual header is set", async () => {
    existingPeriod = null;

    await GET(
      makeReq("http://localhost/api/cron/month-end-close", {
        "x-admin-manual": "fin@invest.com.au",
      }),
    );

    expect(closePeriodCalls[0]?.closedBy).toBe("fin@invest.com.au");
  });

  it("returns 500 + error message when closePeriod fails", async () => {
    existingPeriod = null;
    closeResult = { ok: false, reason: "financial_audit_write_failed" };

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "financial_audit_write_failed" });
  });
});
