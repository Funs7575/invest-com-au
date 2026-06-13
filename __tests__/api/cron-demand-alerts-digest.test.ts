import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextResponse, type NextRequest } from "next/server";

// ── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockIsFlagEnabled,
  mockRequireCronAuth,
  mockSendEmail,
  mockFetchOpenDemandRows,
  prospectsQueue,
  updateCalls,
  fromCalls,
} = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(),
  mockRequireCronAuth: vi.fn(),
  mockSendEmail: vi.fn(),
  mockFetchOpenDemandRows: vi.fn(),
  prospectsQueue: [] as Array<{ data?: unknown; error?: { message: string } | null }>,
  updateCalls: [] as Array<{ table: string; values: Record<string, unknown>; filters: unknown[][] }>,
  fromCalls: [] as string[],
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => mockRequireCronAuth(...a),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

// Keep aggregateDemand/budgetBandLabel real (they're pure and already
// unit-tested) — only the Supabase-backed row fetch is stubbed.
vi.mock("@/lib/demand-board", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/demand-board")>();
  return {
    ...actual,
    fetchOpenDemandRows: (...a: unknown[]) => mockFetchOpenDemandRows(...a),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      fromCalls.push(table);
      const filters: unknown[][] = [];
      const chain: Record<string, unknown> = {};
      let updateValues: Record<string, unknown> | null = null;
      for (const m of ["select", "eq", "neq", "like", "order", "limit", "gt", "gte", "in"]) {
        chain[m] = vi.fn((...args: unknown[]) => {
          filters.push([m, ...args]);
          return chain;
        });
      }
      chain.update = vi.fn((values: Record<string, unknown>) => {
        updateValues = values;
        return chain;
      });
      chain.then = (resolve: (v: unknown) => unknown) => {
        if (updateValues) {
          updateCalls.push({ table, values: updateValues, filters });
          return Promise.resolve(resolve({ data: null, error: null }));
        }
        const res = prospectsQueue.shift() ?? { data: [], error: null };
        return Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
      };
      return chain;
    }),
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/demand-alerts-digest/route";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/demand-alerts-digest") as unknown as NextRequest;
}

const NOW_ISO = new Date().toISOString();
const TEN_DAYS_AGO = new Date(Date.now() - 10 * 86_400_000).toISOString();

function prospect(overrides: Record<string, unknown> = {}) {
  return {
    id: "p-1",
    contact_email: "adviser@example.com",
    status: "new",
    last_contacted_at: null,
    metadata: { kind: "demand_alert", states: ["NSW"], advisor_types: ["smsf_accountant"] },
    ...overrides,
  };
}

function openRow(overrides: Record<string, unknown> = {}) {
  return {
    advisor_types: ["smsf_accountant"],
    location: "NSW",
    budget_band: "2k_5k",
    created_at: NOW_ISO,
    flow_type: "auction",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prospectsQueue.length = 0;
  updateCalls.length = 0;
  fromCalls.length = 0;
  mockRequireCronAuth.mockReturnValue(null);
  mockIsFlagEnabled.mockResolvedValue(true);
  mockSendEmail.mockResolvedValue({ ok: true });
  mockFetchOpenDemandRows.mockResolvedValue([openRow()]);
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/demand-alerts-digest", () => {
  it("exports nodejs runtime and maxDuration=120", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("returns the cron-auth response without doing any work when unauthenticated", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireCronAuth.mockReturnValue(denied);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockIsFlagEnabled).not.toHaveBeenCalled();
    expect(fromCalls).toHaveLength(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("fails closed behind the demand_alerts flag — no DB reads, no sends", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, skipped: "flag_demand_alerts_off" });
    expect(mockIsFlagEnabled).toHaveBeenCalledWith("demand_alerts");
    expect(fromCalls).toHaveLength(0);
    expect(mockFetchOpenDemandRows).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips cleanly when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = await GET(makeReq());
    expect(await res.json()).toEqual({ ok: true, skipped: "no_resend_api_key" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("no subscribers → no sends", async () => {
    prospectsQueue.push({ data: [] });
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips every digest when there is no open public demand", async () => {
    prospectsQueue.push({ data: [prospect()] });
    mockFetchOpenDemandRows.mockResolvedValue([]);
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.skipped).toBe("no_open_demand");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends a matching digest and stamps last_contacted_at + status", async () => {
    prospectsQueue.push({ data: [prospect()] });
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const sendArgs = mockSendEmail.mock.calls[0]?.[0] as { to: string; subject: string; html: string };
    expect(sendArgs.to).toBe("adviser@example.com");
    expect(sendArgs.subject).toContain("1 open advice brief");
    expect(sendArgs.html).toContain("SMSF Accountant");
    expect(sendArgs.html).toContain("/unsubscribe?email=adviser%40example.com");
    // Single matched brief → band detail suppressed (no "Typical stated budget")
    expect(sendArgs.html).not.toContain("Typical stated budget");
    const stamp = updateCalls.find((u) => u.table === "prospects");
    expect(stamp?.values.last_contacted_at).toBeTruthy();
    expect(stamp?.values.status).toBe("contacted");
  });

  it("includes band detail only at/above the suppression threshold", async () => {
    prospectsQueue.push({ data: [prospect()] });
    mockFetchOpenDemandRows.mockResolvedValue([openRow(), openRow(), openRow({ budget_band: "5k_10k" })]);
    await GET(makeReq());
    const sendArgs = mockSendEmail.mock.calls[0]?.[0] as { html: string };
    expect(sendArgs.html).toContain("Typical stated budget");
    expect(sendArgs.html).toContain("$2,000–$5,000");
  });

  it("skips subscribers whose interests match nothing", async () => {
    prospectsQueue.push({
      data: [prospect({ metadata: { kind: "demand_alert", states: ["TAS"], advisor_types: [] } })],
    });
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.sent).toBe(0);
    expect(json.skipped_no_match).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("treats empty interests as match-all", async () => {
    prospectsQueue.push({ data: [prospect({ metadata: { kind: "demand_alert", states: [], advisor_types: [] } })] });
    const res = await GET(makeReq());
    expect((await res.json()).sent).toBe(1);
  });

  it("skips subscribers contacted within the last 6 days (idempotent re-runs)", async () => {
    prospectsQueue.push({ data: [prospect({ last_contacted_at: NOW_ISO }), prospect({ id: "p-2", contact_email: "two@example.com", last_contacted_at: TEN_DAYS_AGO })] });
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.skipped_recent).toBe(1);
    expect(json.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect((mockSendEmail.mock.calls[0]?.[0] as { to: string }).to).toBe("two@example.com");
  });

  it("counts suppression-list hits separately and does not stamp them", async () => {
    prospectsQueue.push({ data: [prospect()] });
    mockSendEmail.mockResolvedValue({ ok: false, error: "suppressed" });
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.suppressed).toBe(1);
    expect(json.sent).toBe(0);
    expect(updateCalls.filter((u) => u.table === "prospects")).toHaveLength(0);
  });

  it("returns 500 when the prospects fetch fails", async () => {
    prospectsQueue.push({ data: null, error: { message: "db down" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
