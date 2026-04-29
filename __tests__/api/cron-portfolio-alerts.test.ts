import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({ notificationFooter: vi.fn(() => "<footer/>") }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/portfolio-alerts/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeQueuedChain(queue: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "insert", "update", "upsert", "delete", "gte", "lt", "lte", "not", "is", "order", "limit", "in", "or"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(queue[idx++])));
  return chain;
}

function makeReq() {
  return new Request("http://localhost/api/cron/portfolio-alerts", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  process.env.RESEND_API_KEY = "rk_test";
  process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/portfolio-alerts", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const chain = makeQueuedChain([]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns zero counts when no portfolios exist", async () => {
    const chain = makeQueuedChain([
      { data: [], error: null },  // user_portfolios
      { data: [], error: null },  // broker_data_changes
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.portfolios_checked).toBe(0);
    expect(body.alerts_sent).toBe(0);
  });

  it("skips portfolio with no email", async () => {
    const chain = makeQueuedChain([
      { data: [{ id: 1, email: null, name: "Test", holdings: [], alert_on_fee_change: true, alert_on_better_deal: false }], error: null },
      { data: [], error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips portfolio when no fee changes match their brokers", async () => {
    const portfolio = { id: 1, email: "user@ex.com", name: "Alice", holdings: [{ broker_slug: "abc", broker_name: "ABC" }], alert_on_fee_change: true, alert_on_better_deal: false };
    const chain = makeQueuedChain([
      { data: [portfolio], error: null },
      { data: [{ broker_slug: "xyz", field_name: "asx_fee", old_value: "10", new_value: "15", changed_at: new Date().toISOString() }], error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends alert email when portfolio broker has fee change", async () => {
    const portfolio = { id: 1, email: "user@ex.com", name: "Alice Smith", holdings: [{ broker_slug: "abc", broker_name: "ABC Broker" }], alert_on_fee_change: true, alert_on_better_deal: false };
    mockFetch.mockResolvedValue({ ok: true });
    const chain = makeQueuedChain([
      { data: [portfolio], error: null },
      { data: [{ broker_slug: "abc", field_name: "asx_fee", old_value: "10", new_value: "15", changed_at: new Date().toISOString() }], error: null },
      { data: null, error: null }, // insert portfolio_alert
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("continues when email fetch throws", async () => {
    const portfolio = { id: 1, email: "user@ex.com", name: "Alice", holdings: [{ broker_slug: "abc", broker_name: "ABC" }], alert_on_fee_change: true, alert_on_better_deal: false };
    mockFetch.mockRejectedValue(new Error("network error"));
    const chain = makeQueuedChain([
      { data: [portfolio], error: null },
      { data: [{ broker_slug: "abc", field_name: "asx_fee", old_value: "10", new_value: "12", changed_at: new Date().toISOString() }], error: null },
      { data: null, error: null },
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts_sent).toBe(0);
    expect(res.status).toBe(200);
  });
});
