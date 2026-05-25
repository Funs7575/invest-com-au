import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockRequireCronAuth,
  mockReadRecentBrokerSnapshots,
  mockComputeFeeIndex,
  mockUpsertFeeIndexSnapshot,
  mockUtcDay,
} = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn().mockReturnValue(null),
  mockReadRecentBrokerSnapshots: vi.fn().mockResolvedValue([]),
  mockComputeFeeIndex: vi.fn(),
  mockUpsertFeeIndexSnapshot: vi.fn().mockResolvedValue({ ok: true }),
  mockUtcDay: vi.fn().mockReturnValue("2026-05-24"),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => mockRequireCronAuth(...a),
}));

vi.mock("@/lib/fee-index", () => ({
  readRecentBrokerSnapshots: (...a: unknown[]) => mockReadRecentBrokerSnapshots(...a),
  computeFeeIndex: (...a: unknown[]) => mockComputeFeeIndex(...a),
  upsertFeeIndexSnapshot: (...a: unknown[]) => mockUpsertFeeIndexSnapshot(...a),
  utcDay: (...a: unknown[]) => mockUtcDay(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { GET } from "@/app/api/cron/fee-index/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COMPUTATION_ZERO = {
  period: "2026-05-24",
  brokerCount: 0,
  asxFee: { mean: null, median: null, sample: 0 },
  usFee: { mean: null, median: null, sample: 0 },
  fxSpread: { mean: null, median: null, sample: 0 },
};

const COMPUTATION_WITH_BROKERS = {
  period: "2026-05-24",
  brokerCount: 3,
  asxFee: { mean: 9.5, median: 9.95, sample: 3 },
  usFee: { mean: 0, median: 0, sample: 3 },
  fxSpread: { mean: 0.006, median: 0.006, sample: 3 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/cron/fee-index", {
    method: "GET",
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/cron/fee-index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockReadRecentBrokerSnapshots.mockResolvedValue([]);
    mockComputeFeeIndex.mockReturnValue(COMPUTATION_WITH_BROKERS);
    mockUpsertFeeIndexSnapshot.mockResolvedValue({ ok: true });
    mockUtcDay.mockReturnValue("2026-05-24");
  });

  it("returns 401 when cron auth fails", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    expect((await GET(makeGet())).status).toBe(401);
  });

  it("returns 200 with persisted:false when no broker snapshots exist", async () => {
    mockComputeFeeIndex.mockReturnValueOnce(COMPUTATION_ZERO);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.brokerCount).toBe(0);
    expect(json.persisted).toBe(false);
    expect(mockUpsertFeeIndexSnapshot).not.toHaveBeenCalled();
  });

  it("returns 500 when upsert fails", async () => {
    mockUpsertFeeIndexSnapshot.mockResolvedValueOnce({
      ok: false,
      error: "unique constraint violation",
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 200 with broker stats on success", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.persisted).toBe(true);
    expect(json.brokerCount).toBe(3);
    expect(json.period).toBe("2026-05-24");
  });
});
