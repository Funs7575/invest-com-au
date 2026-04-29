import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({ notificationFooter: vi.fn(() => "<footer/>") }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/portfolio-monitor/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "eq", "not", "is", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new Request("http://localhost/api/cron/portfolio-monitor", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
  process.env.RESEND_API_KEY = "rk_test";
  process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/portfolio-monitor", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY missing", async () => {
    delete process.env.RESEND_API_KEY;
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [], error: null })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns portfolios:0 when none exist", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // user_portfolios
        return makeChain({ data: [], error: null }); // brokers
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.portfolios).toBe(0);
    expect(body.snapshots).toBe(0);
    expect(body.emailsSent).toBe(0);
  });

  it("skips portfolio with no email or no holdings", async () => {
    const portfolioNoEmail = { id: 1, email: null, name: "Alice", holdings: [], annual_fees_cents: 0, optimal_fees_cents: 0, savings_cents: 0, optimal_broker_slug: null, last_snapshot_at: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [portfolioNoEmail], error: null });
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.portfolios).toBe(1);
    expect(body.snapshots).toBe(0); // skipped before snapshot
    expect(body.emailsSent).toBe(0);
  });

  it("creates snapshot and sends email for portfolio with holdings", async () => {
    const portfolio = {
      id: 1,
      email: "user@ex.com",
      name: "Alice Smith",
      holdings: [{ broker_slug: "abc", balance: 10000, trades_per_year: 20, annual_fee: 0 }],
      annual_fees_cents: 0,
      optimal_fees_cents: 0,
      savings_cents: 0,
      optimal_broker_slug: null,
      last_snapshot_at: null,
    };
    const broker = { slug: "abc", name: "ABC", asx_fee_value: 10, us_fee_value: 15, fx_rate: 0.5, inactivity_fee: 0, platform_type: "share_broker", rating: 4, color: "#000", logo_url: null, affiliate_url: "https://abc.com/signup" };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [portfolio], error: null }); // user_portfolios
        if (call === 2) return makeChain({ data: [broker], error: null }); // brokers
        return makeChain({ data: null, error: null }); // inserts/updates
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.portfolios).toBe(1);
    expect(body.snapshots).toBe(1);
    expect(body.emailsSent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("still counts snapshot even when email fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const portfolio = {
      id: 1, email: "u@ex.com", name: "Bob", holdings: [{ broker_slug: "abc", balance: 5000, trades_per_year: 10, annual_fee: 0 }],
      annual_fees_cents: 0, optimal_fees_cents: 0, savings_cents: 0, optimal_broker_slug: null, last_snapshot_at: null,
    };
    const broker = { slug: "abc", name: "ABC", asx_fee_value: 5, us_fee_value: 10, fx_rate: 0, inactivity_fee: 0, platform_type: "share_broker", rating: 4, color: "#000", logo_url: null, affiliate_url: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [portfolio], error: null });
        if (call === 2) return makeChain({ data: [broker], error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.snapshots).toBe(1);
    expect(body.emailsSent).toBe(0); // email failed
  });
});
