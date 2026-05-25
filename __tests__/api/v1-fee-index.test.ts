import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockReadFeeIndex = vi.fn();
const mockComputeTrend = vi.fn();

vi.mock("@/lib/fee-index", () => ({
  readFeeIndex: (...args: unknown[]) => mockReadFeeIndex(...args),
  computeTrend: (...args: unknown[]) => mockComputeTrend(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockValidateApiKey = vi.fn();
const mockLogApiRequest = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
  logApiRequest: (...args: unknown[]) => mockLogApiRequest(...args),
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

import { GET, OPTIONS } from "@/app/api/v1/fee-index/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-3", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeSnapshot(period = "2026-05-24", overrides = {}) {
  return {
    period,
    computed_at: `${period}T02:15:00Z`,
    broker_count: 22,
    asx_fee_sample: 20,
    us_fee_sample: 18,
    fx_spread_sample: 19,
    avg_asx_fee: 8.5,
    avg_us_fee: 1.2,
    avg_fx_spread: 0.55,
    median_asx_fee: 9.5,
    median_us_fee: 0.0,
    median_fx_spread: 0.6,
    source: "cron",
    ...overrides,
  };
}

function makeTrend() {
  return {
    quarter: {
      avgAsxFee: { previous: 9.0, change: -0.5, changePct: -5.56 },
      avgUsFee: { previous: 1.3, change: -0.1, changePct: -7.69 },
      avgFxSpread: { previous: 0.57, change: -0.02, changePct: -3.51 },
    },
    year: null,
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/fee-index${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/fee-index", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/fee-index — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Invalid or inactive API key"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("logs failed auth requests", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/fee-index" }),
    );
  });
});

describe("GET /api/v1/fee-index — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns latest snapshot, trend, and history", async () => {
    const latest = makeSnapshot();
    const history = [latest, makeSnapshot("2026-05-23")];
    mockReadFeeIndex.mockResolvedValue({ latest, history });
    mockComputeTrend.mockReturnValue(makeTrend());

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.latest).toMatchObject({ period: "2026-05-24", avg_asx_fee: 8.5 });
    expect(body.data.trend).not.toBeNull();
    expect(body.data.trend.quarter).not.toBeNull();
    expect(body.data.history.length).toBeGreaterThan(0);
  });

  it("returns null trend when latest is null", async () => {
    mockReadFeeIndex.mockResolvedValue({ latest: null, history: [] });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.latest).toBeNull();
    expect(body.data.trend).toBeNull();
    expect(body.data.history).toEqual([]);
  });

  it("respects history param", async () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      makeSnapshot(`2026-05-${String(24 - i).padStart(2, "0")}`),
    );
    const latest = history[0]!;
    mockReadFeeIndex.mockResolvedValue({ latest, history });
    mockComputeTrend.mockReturnValue(null);

    const res = await GET(makeGet({ history: "5" }));
    const body = await res.json();
    expect(body.data.history).toHaveLength(5);
    expect(body.meta.history_days).toBe(5);
  });

  it("returns empty history when history=0", async () => {
    const latest = makeSnapshot();
    const history = [latest, makeSnapshot("2026-05-23")];
    mockReadFeeIndex.mockResolvedValue({ latest, history });
    mockComputeTrend.mockReturnValue(makeTrend());

    const res = await GET(makeGet({ history: "0" }));
    const body = await res.json();
    expect(body.data.history).toEqual([]);
    expect(body.meta.history_days).toBe(0);
  });

  it("clamps history to 400", async () => {
    const latest = makeSnapshot();
    mockReadFeeIndex.mockResolvedValue({ latest, history: [latest] });
    mockComputeTrend.mockReturnValue(null);

    // Should not throw even with a huge history param
    const res = await GET(makeGet({ history: "999" }));
    expect(res.status).toBe(200);
    // Verify readFeeIndex was called (clamped to max 400 internally)
    expect(mockReadFeeIndex).toHaveBeenCalledWith(400);
  });

  it("includes meta.updated_at from latest.computed_at", async () => {
    const latest = makeSnapshot();
    mockReadFeeIndex.mockResolvedValue({ latest, history: [latest] });
    mockComputeTrend.mockReturnValue(null);

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-05-24T02:15:00Z");
  });

  it("sets meta.updated_at to null when no latest snapshot", async () => {
    mockReadFeeIndex.mockResolvedValue({ latest: null, history: [] });

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.updated_at).toBeNull();
  });

  it("includes Cache-Control header on success", async () => {
    mockReadFeeIndex.mockResolvedValue({ latest: null, history: [] });

    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("logs successful request with apiKeyId", async () => {
    mockReadFeeIndex.mockResolvedValue({ latest: null, history: [] });

    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-3" }),
    );
  });

  it("returns 500 on unexpected throw", async () => {
    mockReadFeeIndex.mockImplementation(() => {
      throw new Error("DB exploded");
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
  });

  it("defaults history to 90 when not provided", async () => {
    mockReadFeeIndex.mockResolvedValue({ latest: null, history: [] });

    await GET(makeGet());
    // The route calls readFeeIndex(Math.max(90, 400)) = readFeeIndex(400) to
    // ensure enough history for trend calc, then trims to the requested 90.
    expect(mockReadFeeIndex).toHaveBeenCalledWith(400);
  });
});
