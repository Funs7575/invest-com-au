import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({ wrapCronHandler: (_n: string, h: unknown) => h }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/monthly-advisor-reports/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "neq", "gte", "lte", "not", "is", "in", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/monthly-advisor-reports", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
  delete process.env.RESEND_API_KEY;
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/monthly-advisor-reports", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when advisors query errors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns scanned:0 when no active advisors", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // professionals
        return makeChain({ data: [], error: null }); // typeStats
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.emailed).toBe(0);
  });

  it("skips advisor with no leads last month", async () => {
    const advisor = { id: 1, name: "Alice", email: "a@ex.com", type: "financial_planner", rating: 4, review_count: 3 };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null }); // professionals
        if (call === 2) return makeChain({ data: [], error: null }); // typeStats
        return makeChain({ data: [], error: null }); // leads (empty)
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped_no_leads).toBe(1);
    expect(body.emailed).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("emails advisor who has leads and sets RESEND key", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const advisor = { id: 1, name: "Alice", email: "a@ex.com", type: "financial_planner", rating: 4, review_count: 3 };
    const leads = [
      { id: 1, billed: true, responded_at: new Date().toISOString(), converted_at: new Date().toISOString(), response_time_minutes: 30 },
      { id: 2, billed: false, responded_at: null, converted_at: null, response_time_minutes: null },
    ];
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null });
        if (call === 2) return makeChain({ data: [], error: null }); // typeStats
        return makeChain({ data: leads, error: null }); // leads
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.emailed).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("does not send email when RESEND_API_KEY not set", async () => {
    const advisor = { id: 1, name: "Alice", email: "a@ex.com", type: "fp", rating: 4, review_count: 3 };
    const leads = [{ id: 1, billed: true, responded_at: null, converted_at: null, response_time_minutes: 45 }];
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [advisor], error: null });
        if (call === 2) return makeChain({ data: [], error: null });
        return makeChain({ data: leads, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    // emailed increments even when email skipped (fire-and-forget style)
    expect(body.emailed).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled(); // no RESEND key → sendEmail noop
  });
});
