import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockGetUser, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn().mockResolvedValue(false),
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { email: "advisor@example.com" } } }),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { GET as analyticsGET } from "@/app/api/advisor-portal/marketplace-analytics/route";
import {
  GET as settingsGET,
  PATCH as settingsPATCH,
} from "@/app/api/advisor-portal/marketplace-settings/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADVISOR = { id: 7, type: "financial_planner" };

const PRO_SETTINGS = {
  id: 7,
  accepts_new_clients: true,
  bid_templates: [],
  alert_preferences: { advisor_types: [], states: [], budget_bands: [] },
};

const MY_BIDS = [
  {
    id: 1,
    bid_amount: 500,
    status: "won",
    created_at: "2026-05-01T10:00:00Z",
    auction_id: 10,
    retract_reason: null,
    advisor_auctions: {
      id: 10,
      created_at: "2026-05-01T09:00:00Z",
      advisor_types: ["financial_planner"],
    },
  },
];

// ── Mock helpers ──────────────────────────────────────────────────────────────

function setupAnalyticsMocks({
  advisor = ADVISOR as Record<string, unknown> | null,
  myBids = MY_BIDS as unknown[],
  catBids = [] as unknown[],
} = {}) {
  let bidCallIdx = 0;
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);
    if (table === "professionals") {
      b.maybeSingle = vi.fn().mockResolvedValue({ data: advisor, error: null });
    } else if (table === "advisor_auction_bids") {
      const results = [
        { data: myBids, error: null },
        { data: catBids, error: null },
      ];
      const result = results[bidCallIdx++] ?? { data: [], error: null };
      b.then = vi.fn((cb: (v: unknown) => void) => {
        cb(result);
        return Promise.resolve();
      });
    }
    return b;
  });
}

function setupSettingsMocks({
  pro = PRO_SETTINGS as Record<string, unknown> | null,
  updateError = null as { message: string } | null,
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);
    if (table === "professionals") {
      b.maybeSingle = vi.fn().mockResolvedValue({ data: pro, error: null });
      b.then = vi.fn((cb: (v: unknown) => void) => {
        cb({ data: null, error: updateError });
        return Promise.resolve();
      });
    }
    return b;
  });
}

function makeGet(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: { "x-forwarded-for": "9.9.9.9" },
  });
}

// ── Analytics tests ───────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/marketplace-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
    setupAnalyticsMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await analyticsGET(makeGet("/api/advisor-portal/marketplace-analytics"))).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await analyticsGET(makeGet("/api/advisor-portal/marketplace-analytics"))).status).toBe(401);
  });

  it("returns 404 when advisor not found", async () => {
    setupAnalyticsMocks({ advisor: null });
    expect((await analyticsGET(makeGet("/api/advisor-portal/marketplace-analytics"))).status).toBe(404);
  });

  it("returns 200 with win-rate stats on success", async () => {
    const res = await analyticsGET(makeGet("/api/advisor-portal/marketplace-analytics"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total_bids).toBe(1);
    expect(json.wins).toBe(1);
    expect(json.win_rate_pct).toBe(100);
    expect(json.window_days).toBe(30);
  });

  it("returns 200 with zero stats when no bids exist", async () => {
    setupAnalyticsMocks({ myBids: [] });
    const res = await analyticsGET(makeGet("/api/advisor-portal/marketplace-analytics"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total_bids).toBe(0);
    expect(json.win_rate_pct).toBe(0);
    expect(json.median_response_hours).toBeNull();
  });
});

// ── Settings GET tests ────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/marketplace-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
    setupSettingsMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await settingsGET(makeGet("/api/advisor-portal/marketplace-settings"))).status).toBe(429);
  });

  it("returns 401 when unauthenticated or advisor not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await settingsGET(makeGet("/api/advisor-portal/marketplace-settings"))).status).toBe(401);
  });

  it("returns 200 with current settings on success", async () => {
    const res = await settingsGET(makeGet("/api/advisor-portal/marketplace-settings"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.accepts_new_clients).toBe(true);
    expect(json.bid_templates).toEqual([]);
  });
});

// ── Settings PATCH tests ──────────────────────────────────────────────────────

describe("PATCH /api/advisor-portal/marketplace-settings", () => {
  function makePatch(body: Record<string, unknown>): NextRequest {
    return makeRequest("/api/advisor-portal/marketplace-settings", body, { method: "PATCH" });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
    setupSettingsMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    expect((await settingsPATCH(makePatch({ accepts_new_clients: false }))).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await settingsPATCH(makePatch({ accepts_new_clients: false }))).status).toBe(401);
  });

  it("returns 400 when body has no updatable fields", async () => {
    const res = await settingsPATCH(makePatch({}));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB update error", async () => {
    setupSettingsMocks({ updateError: { message: "constraint violation" } });
    const res = await settingsPATCH(makePatch({ accepts_new_clients: false }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with success:true on valid update", async () => {
    const res = await settingsPATCH(makePatch({ accepts_new_clients: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
