import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/expire-deals/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "insert", "eq", "in", "lt", "not", "is", "order", "limit", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/expire-deals", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
  delete process.env.RESEND_API_KEY;
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/expire-deals", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when expired deals query errors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns all-zero counts when nothing is expired", async () => {
    // 4 select queries: expired_deals, expired_sponsors, expired_pro_deals, expired_campaigns
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.dealsExpired).toBe(0);
    expect(body.sponsorsExpired).toBe(0);
    expect(body.proDealsExpired).toBe(0);
    expect(body.campaignsCompleted).toBe(0);
    expect(body.errors).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled(); // no expiry alert email
  });

  it("expires a deal, clears deal flag, inserts audit log", async () => {
    const expiredBroker = { id: 1, slug: "abc", name: "ABC", deal_text: "10% off", deal_expiry: "2026-01-01T00:00:00Z" };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [expiredBroker], error: null }); // expired deals
        if (call === 2) return makeChain({ data: null, error: null }); // update deal
        if (call === 3) return makeChain({ data: null, error: null }); // audit log insert
        if (call === 4) return makeChain({ data: [], error: null }); // expired sponsors
        if (call === 5) return makeChain({ data: [], error: null }); // expired pro_deals
        if (call === 6) return makeChain({ data: [], error: null }); // expired campaigns
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.dealsExpired).toBe(1);
    expect(body.errors).toBe(0);
  });

  it("records update error when broker deal update fails", async () => {
    const expiredBroker = { id: 1, slug: "abc", name: "ABC", deal_text: "off", deal_expiry: "2026-01-01Z" };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [expiredBroker], error: null });
        if (call === 2) return makeChain({ data: null, error: { message: "update failed" } }); // update fails
        if (call === 3) return makeChain({ data: [], error: null });
        if (call === 4) return makeChain({ data: [], error: null });
        if (call === 5) return makeChain({ data: [], error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.dealsExpired).toBe(0);
  });

  it("completes a campaign, notifies broker, sends email when RESEND_API_KEY set", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const campaign = { id: 5, broker_slug: "abc", name: "Spring 2026", end_date: "2026-03-31" };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // no expired deals
        if (call === 2) return makeChain({ data: [], error: null }); // no expired sponsors
        if (call === 3) return makeChain({ data: [], error: null }); // no expired pro_deals
        if (call === 4) return makeChain({ data: [campaign], error: null }); // expired campaigns
        if (call === 5) return makeChain({ data: null, error: null }); // update campaign
        if (call === 6) return makeChain({ data: null, error: null }); // audit log
        if (call === 7) return makeChain({ data: null, error: null }); // broker_notifications
        if (call === 8) return makeChain({ data: { email: "b@ex.com", full_name: "Bob" }, error: null }); // broker account
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.campaignsCompleted).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("sends expiry alert email when results are non-empty", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const expiredBroker = { id: 1, slug: "abc", name: "ABC", deal_text: "off", deal_expiry: "2026-01-01Z" };
    let call = 0;
    // First fetch call is the Resend alert email, second is (none in this path)
    let fetchCallIdx = 0;
    mockFetch.mockImplementation(() => {
      fetchCallIdx++;
      return Promise.resolve({ ok: true });
    });
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [expiredBroker], error: null });
        if (call === 2) return makeChain({ data: null, error: null }); // update
        if (call === 3) return makeChain({ data: null, error: null }); // audit
        if (call === 4) return makeChain({ data: [], error: null }); // sponsors
        if (call === 5) return makeChain({ data: [], error: null }); // pro_deals
        if (call === 6) return makeChain({ data: [], error: null }); // campaigns
        return makeChain({ data: null, error: null });
      }),
    } as never);
    await GET(makeReq());
    // Alert email should be sent since results.length > 0
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.anything());
  });
});
