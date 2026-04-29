import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/seo", () => ({ SITE_URL: "https://invest.com.au" }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/broker-review-invites/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockSendEmail = vi.mocked(sendEmail);

const dbQueue: unknown[] = [];
let dbIdx = 0;

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "in", "gte", "lte", "neq", "not", "is", "order", "limit", "single"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/broker-review-invites", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  dbQueue.length = 0;
  dbIdx = 0;
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockSendEmail.mockResolvedValue({ ok: true } as never);
});

describe("GET /api/cron/broker-review-invites", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns sent:0 when no eligible clicks", async () => {
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => makeChain({ data: [], error: null })),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.reason).toContain("no eligible clicks");
  });

  it("returns sent:0 when no emails match sessions", async () => {
    const click = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", session_id: "s1", clicked_at: new Date(Date.now() - 14 * 86400000).toISOString() };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [click], error: null }); // affiliate_clicks
        return makeChain({ data: [], error: null }); // email_captures — empty
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.reason).toContain("no captured emails");
  });

  it("suppresses candidate with prior invite in 90d window", async () => {
    const click = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", session_id: "s1", clicked_at: new Date(Date.now() - 14 * 86400000).toISOString() };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [click], error: null }); // clicks
        if (call === 2) return makeChain({ data: [{ email: "u@ex.com", session_id: "s1", unsubscribed: false, status: "active" }], error: null }); // captures
        if (call === 3) return makeChain({ data: [{ email: "u@ex.com", broker_slug: "abc" }], error: null }); // prior invites
        return makeChain({ data: [], error: null }); // suppression list
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("suppresses candidate on email suppression list", async () => {
    const click = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", session_id: "s1", clicked_at: new Date(Date.now() - 14 * 86400000).toISOString() };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [click], error: null });
        if (call === 2) return makeChain({ data: [{ email: "u@ex.com", session_id: "s1", unsubscribed: false, status: "active" }], error: null });
        if (call === 3) return makeChain({ data: [], error: null }); // no prior invites
        return makeChain({ data: [{ email: "u@ex.com" }], error: null }); // suppressed
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("inserts invite row, sends email, returns sent:1", async () => {
    const click = { broker_id: 1, broker_slug: "abc", broker_name: "ABC Broker", session_id: "s1", clicked_at: new Date(Date.now() - 14 * 86400000).toISOString() };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [click], error: null }); // clicks
        if (call === 2) return makeChain({ data: [{ email: "u@ex.com", session_id: "s1", unsubscribed: false, status: "active" }], error: null }); // captures
        if (call === 3) return makeChain({ data: [], error: null }); // no prior invites
        if (call === 4) return makeChain({ data: [], error: null }); // suppression list
        return makeChain({ data: { token: "tok123" }, error: null }); // insert → single
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "u@ex.com",
      subject: expect.stringContaining("ABC Broker"),
    }));
  });

  it("counts failed when invite insert errors", async () => {
    const click = { broker_id: 1, broker_slug: "abc", broker_name: "ABC", session_id: "s1", clicked_at: new Date(Date.now() - 14 * 86400000).toISOString() };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [click], error: null });
        if (call === 2) return makeChain({ data: [{ email: "u@ex.com", session_id: "s1", unsubscribed: false, status: "active" }], error: null });
        if (call === 3) return makeChain({ data: [], error: null });
        if (call === 4) return makeChain({ data: [], error: null });
        return makeChain({ data: null, error: { message: "unique violation" } });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.failed).toBe(1);
    expect(body.sent).toBe(0);
  });
});
