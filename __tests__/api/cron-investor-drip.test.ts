import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/email-templates", () => ({
  brokerDripEmail4: vi.fn(() => "<html>drip4</html>"),
  brokerDripEmail5: vi.fn(() => "<html>drip5</html>"),
}));

const mockGetPersonalizedBrokers = vi.fn();
vi.mock("@/lib/broker-recommendations", () => ({
  getPersonalizedBrokers: (...args: unknown[]) => mockGetPersonalizedBrokers(...args),
}));

import { GET } from "@/app/api/cron/investor-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "in", "neq", "not", "gte", "order", "limit", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/investor-drip", { method: "GET" });
}

const NOW = Date.now();

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
  delete process.env.RESEND_API_KEY;
  mockGetPersonalizedBrokers.mockResolvedValue([]);
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/investor-drip", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns processed:0 when no captures or quiz leads", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => makeChain({ data: [], error: null })),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(body.emails_sent).toBe(0);
  });

  it("sends drip 1 for day-0 signup", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const capture = { email: "user@ex.com", name: "Test User", source: null, context: null, created_at: new Date(NOW).toISOString() };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null }); // email_captures
        if (call === 2) return makeChain({ data: [], error: null }); // quiz_leads
        if (call === 3) return makeChain({ data: [], error: null }); // investor_drip_log
        return makeChain({ data: null, error: null }); // insert drip log
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("skips email when all drips already sent", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const capture = { email: "user@ex.com", name: "Test", source: null, context: null, created_at: new Date(NOW - 12 * 86400000).toISOString() };
    // All 5 drips already sent
    const sentDrips = [1, 2, 3, 4, 5].map((n) => ({ email: "user@ex.com", drip_number: n }));
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        if (call === 2) return makeChain({ data: [], error: null });
        return makeChain({ data: sentDrips, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends drip 4 using getPersonalizedBrokers for 7-day signup", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const capture = { email: "user@ex.com", name: "Test", source: null, context: null, created_at: new Date(NOW - 8 * 86400000).toISOString() };
    const sentDrips = [1, 2, 3].map((n) => ({ email: "user@ex.com", drip_number: n }));
    mockGetPersonalizedBrokers.mockResolvedValue([{ slug: "abc", name: "ABC", rating: 4.5 }]);
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        if (call === 2) return makeChain({ data: [], error: null }); // quiz_leads
        if (call === 3) return makeChain({ data: sentDrips, error: null }); // drip_log
        return makeChain({ data: null, error: null }); // insert
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockGetPersonalizedBrokers).toHaveBeenCalled();
  });

  it("skips drip 4 when getPersonalizedBrokers returns empty", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const capture = { email: "user@ex.com", name: "Test", source: null, context: null, created_at: new Date(NOW - 8 * 86400000).toISOString() };
    const sentDrips = [1, 2, 3].map((n) => ({ email: "user@ex.com", drip_number: n }));
    mockGetPersonalizedBrokers.mockResolvedValue([]); // no brokers → skip
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        if (call === 2) return makeChain({ data: [], error: null });
        return makeChain({ data: sentDrips, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends drip 5 with deal check via maybySingle", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const capture = { email: "user@ex.com", name: "Test", source: null, context: null, created_at: new Date(NOW - 11 * 86400000).toISOString() };
    const sentDrips = [1, 2, 3, 4].map((n) => ({ email: "user@ex.com", drip_number: n }));
    mockGetPersonalizedBrokers.mockResolvedValue([{ slug: "abc", name: "ABC", rating: 4.5 }]);
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        if (call === 2) return makeChain({ data: [], error: null }); // quiz_leads
        if (call === 3) return makeChain({ data: sentDrips, error: null }); // drip_log
        if (call === 4) return makeChain({ data: { deal: true, deal_text: "$50 cashback" }, error: null }); // maybySingle deal check
        return makeChain({ data: null, error: null }); // insert
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
  });

  it("merges quiz lead context when email exists in both captures and quiz_leads", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const capture = { email: "user@ex.com", name: "Test", source: null, context: null, created_at: new Date(NOW).toISOString() };
    const quizLead = { email: "user@ex.com", name: "Test", created_at: new Date(NOW).toISOString(), top_match_slug: "abc", experience_level: "beginner", investment_range: "5k-10k", trading_interest: "shares" };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        if (call === 2) return makeChain({ data: [quizLead], error: null }); // quiz_leads
        if (call === 3) return makeChain({ data: [], error: null }); // drip_log (no prior sends)
        return makeChain({ data: null, error: null }); // insert
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    // One user in emailMap (merged), drip 1 sent
    expect(body.processed).toBe(1);
    expect(body.emails_sent).toBe(1);
  });
});
