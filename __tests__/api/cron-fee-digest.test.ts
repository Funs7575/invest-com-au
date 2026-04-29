import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({ feeDigestEmail: vi.fn(() => "<html>digest {{unsubscribe_url}}</html>") }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/fee-digest/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

const dbQueue: unknown[] = [];
let dbIdx = 0;

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "in", "gte", "order", "limit", "maybeSingle", "not"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/fee-digest", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  dbQueue.length = 0;
  dbIdx = 0;
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  process.env.RESEND_API_KEY = "rk_test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/fee-digest", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "unreachable" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 500 when fee changes query errors", async () => {
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })),
    } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns sent:0 when no subscribers", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // fee changes
        if (call === 2) return makeChain({ data: [], error: null }); // brokers
        return makeChain({ data: [], error: null }); // subscribers
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("skips subscriber already sent this edition", async () => {
    const sub = { email: "sub@ex.com", broker_slugs: [], alert_type: "all", unsubscribe_token: "tok" };
    // No fee changes → changedSlugs empty → no broker from() call
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // fee changes
        if (call === 2) return makeChain({ data: [sub], error: null }); // subscribers
        return makeChain({ data: { id: 1 }, error: null }); // already sent (maybeSingle)
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends digest email and records newsletter_sends", async () => {
    const sub = { email: "sub@ex.com", broker_slugs: [], alert_type: "all", unsubscribe_token: "tok" };
    const change = { broker_slug: "abc", field_name: "asx_fee", old_value: "10", new_value: "15", changed_at: new Date().toISOString() };
    mockFetch.mockResolvedValue({ ok: true });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [change], error: null }); // fee changes
        if (call === 2) return makeChain({ data: [{ slug: "abc", name: "ABC" }], error: null }); // brokers
        if (call === 3) return makeChain({ data: [sub], error: null }); // subscribers
        if (call === 4) return makeChain({ data: null, error: null }); // no prior send
        return makeChain({ data: null, error: null }); // insert newsletter_sends
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("does not record send when Resend returns non-ok", async () => {
    const sub = { email: "sub@ex.com", broker_slugs: [], alert_type: "all", unsubscribe_token: "tok" };
    mockFetch.mockResolvedValue({ ok: false, text: () => Promise.resolve("rate limited") });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null });
        if (call === 2) return makeChain({ data: [], error: null });
        if (call === 3) return makeChain({ data: [sub], error: null });
        return makeChain({ data: null, error: null }); // no prior send
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
  });
});
