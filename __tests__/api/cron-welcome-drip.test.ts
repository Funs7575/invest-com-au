import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  brokerWelcomeEmail: vi.fn(() => "<html>welcome</html>"),
  setupGuideEmail: vi.fn(() => "<html>setup</html>"),
  firstCampaignTipsEmail: vi.fn(() => "<html>tips</html>"),
  checkInEmail: vi.fn(() => "<html>checkin</html>"),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/welcome-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "gte", "lte", "is", "not", "order", "limit", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeBroker(overrides: Record<string, unknown> = {}) {
  return {
    broker_slug: "testbroker",
    email: "broker@ex.com",
    full_name: "Test Broker",
    company_name: "Test Co",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    ...overrides,
  };
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/welcome-drip", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
  process.env.RESEND_API_KEY = "rk_test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/welcome-drip", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns emails_sent:0 when no recent brokers", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(body.brokers_processed).toBeUndefined(); // no brokers path returns early
  });

  it("returns message when broker query errors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(body.message).toBe("db error");
  });

  it("skips broker with no email", async () => {
    const broker = makeBroker({ email: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [broker], error: null })) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.emails_sent).toBe(0);
  });

  it("sends drip 1 (day 0) to new broker", async () => {
    const broker = makeBroker({ created_at: new Date().toISOString() });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null }); // broker_accounts
        if (call === 2) return makeChain({ data: [], error: null }); // sent drips
        return makeChain({ data: null, error: null }); // insert notification
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    const payload = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body) as { subject: string };
    expect(payload.subject).toContain("Welcome");
  });

  it("sends drip 2 (day 2) and makes extra wallet/campaign/creative queries", async () => {
    const broker = makeBroker({ created_at: new Date(Date.now() - 2 * 86400000).toISOString() });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null }); // broker_accounts
        if (call === 2) return makeChain({ data: [{ type: "welcome_drip_1" }], error: null }); // sent drips (drip1 done)
        if (call === 3) return makeChain({ data: { balance_cents: 0 }, error: null }); // wallet
        if (call === 4) return makeChain({ count: 0, error: null }); // campaign count
        if (call === 5) return makeChain({ count: 0, error: null }); // creative count
        return makeChain({ data: null, error: null }); // insert notification
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(call).toBeGreaterThanOrEqual(5);
  });

  it("records notification even when RESEND_API_KEY missing (no email sent)", async () => {
    delete process.env.RESEND_API_KEY;
    const broker = makeBroker({ created_at: new Date().toISOString() });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null });
        if (call === 2) return makeChain({ data: [], error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    // email not sent but recorded
    expect(body.emails_sent).toBe(0);
    expect(body.results[0]?.action).toBe("recorded");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips drip when already sent for that type", async () => {
    // Broker 1 day old: only drip_1 eligible; pretend drip_1 already sent
    const broker = makeBroker({ created_at: new Date(Date.now() - 1 * 86400000).toISOString() });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null });
        return makeChain({ data: [{ type: "welcome_drip_1" }], error: null }); // already sent
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends drip 4 with active campaign check", async () => {
    const broker = makeBroker({ created_at: new Date(Date.now() - 10 * 86400000).toISOString() });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null });
        if (call === 2) return makeChain({ data: [
          { type: "welcome_drip_1" },
          { type: "welcome_drip_2" },
          { type: "welcome_drip_3" },
        ], error: null }); // drips 1-3 done
        if (call === 3) return makeChain({ count: 2, error: null }); // active campaign count
        return makeChain({ data: null, error: null }); // insert notification
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    const payload = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body) as { subject: string };
    expect(payload.subject).toContain("checking in");
  });
});
