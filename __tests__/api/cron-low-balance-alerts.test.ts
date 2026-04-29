import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/low-balance-alerts/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

const dbQueue: unknown[] = [];
let dbIdx = 0;

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "gte", "lte", "order", "limit", "not", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/low-balance-alerts", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  dbQueue.length = 0;
  dbIdx = 0;
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/low-balance-alerts", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns alerts_sent:0 when no wallets with alerts enabled", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(0);
  });

  it("skips wallet where balance is above threshold", async () => {
    const wallet = { broker_slug: "abc", balance_cents: 10000, low_balance_threshold_cents: 5000, low_balance_alert_enabled: true };
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [wallet], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(0);
    expect(body.skipped).toBe(0);
  });

  it("skips wallet with recent alert in last 24h", async () => {
    const wallet = { broker_slug: "abc", balance_cents: 100, low_balance_threshold_cents: 5000, low_balance_alert_enabled: true };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [wallet], error: null }); // wallets
        return makeChain({ data: [{ id: 99 }], error: null }); // recent alert found
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.alerts_sent).toBe(0);
  });

  it("creates notification and increments alerts_sent (no email key)", async () => {
    const wallet = { broker_slug: "abc", balance_cents: 200, low_balance_threshold_cents: 5000, low_balance_alert_enabled: true };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [wallet], error: null }); // wallets
        if (call === 2) return makeChain({ data: [], error: null }); // no recent alert
        return makeChain({ data: null, error: null }); // insert notification
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends email when RESEND_API_KEY set and account has email", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const wallet = { broker_slug: "abc", balance_cents: 200, low_balance_threshold_cents: 5000, low_balance_alert_enabled: true };
    mockFetch.mockResolvedValue({ ok: true });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [wallet], error: null });
        if (call === 2) return makeChain({ data: [], error: null }); // no recent alert
        if (call === 3) return makeChain({ data: null, error: null }); // insert notification
        if (call === 4) return makeChain({ data: { email: "broker@ex.com", full_name: "Bob", company_name: "ABC" }, error: null }); // account
        return makeChain({ data: null, error: null }); // update email_sent
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("auto-pauses active campaigns when balance <= 0", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const wallet = { broker_slug: "abc", balance_cents: 0, low_balance_threshold_cents: 5000, low_balance_alert_enabled: true };
    mockFetch.mockResolvedValue({ ok: true });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [wallet], error: null }); // wallets
        if (call === 2) return makeChain({ data: [], error: null }); // no recent alert
        if (call === 3) return makeChain({ data: [{ id: 5, name: "Camp A" }], error: null }); // active campaigns
        if (call === 4) return makeChain({ data: null, error: null }); // update campaign status
        if (call === 5) return makeChain({ data: null, error: null }); // insert campaigns_paused notification
        if (call === 6) return makeChain({ data: null, error: null }); // insert low_balance notification
        if (call === 7) return makeChain({ data: { email: "b@ex.com", full_name: "B" }, error: null }); // account
        return makeChain({ data: null, error: null }); // update email_sent
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.results.some((r: { action: string }) => r.action === "campaigns_paused")).toBe(true);
  });

  it("continues gracefully when email fetch throws", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const wallet = { broker_slug: "abc", balance_cents: 200, low_balance_threshold_cents: 5000, low_balance_alert_enabled: true };
    mockFetch.mockRejectedValue(new Error("network error"));
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [wallet], error: null });
        if (call === 2) return makeChain({ data: [], error: null });
        if (call === 3) return makeChain({ data: null, error: null }); // insert notification
        if (call === 4) return makeChain({ data: { email: "b@ex.com" }, error: null }); // account
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });
});
