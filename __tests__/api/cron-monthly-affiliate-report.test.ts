import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/monthly-affiliate-report/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockSendEmail = vi.mocked(sendEmail);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "upsert", "insert", "eq", "in", "gte", "lt", "neq", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/monthly-affiliate-report", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockSendEmail.mockResolvedValue({ ok: true } as never);
});

describe("GET /api/cron/monthly-affiliate-report", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with zero stats when no clicks or signups", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // clicks
        return makeChain({ data: [], error: null }); // signups
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.totalClicks).toBe(0);
    expect(body.totalSignups).toBe(0);
    expect(body.brokers).toBe(0);
    expect(mockSendEmail).toHaveBeenCalled(); // always sends report
  });

  it("aggregates clicks and signups by broker correctly", async () => {
    const clicks = [
      { broker_slug: "abc", broker_name: "ABC" },
      { broker_slug: "abc", broker_name: "ABC" },
      { broker_slug: "xyz", broker_name: "XYZ" },
    ];
    const signups = [
      { broker_slug: "abc", revenue_cents: 5000, status: "confirmed" },
    ];
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: clicks, error: null }); // clicks
        if (call === 2) return makeChain({ data: signups, error: null }); // signups
        return makeChain({ data: null, error: null }); // upsert
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.totalClicks).toBe(3);
    expect(body.totalSignups).toBe(1);
    expect(body.brokers).toBe(2);
  });

  it("sends email report with subject containing month and revenue", async () => {
    const clicks = [{ broker_slug: "abc", broker_name: "ABC" }];
    const signups = [{ broker_slug: "abc", revenue_cents: 10000, status: "confirmed" }];
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: clicks, error: null });
        if (call === 2) return makeChain({ data: signups, error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    await GET(makeReq());
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "admin@invest.com.au",
      subject: expect.stringContaining("$100.00"),
    }));
  });

  it("returns 500 on unexpected error (no DB mock — throws)", async () => {
    mockCreateAdmin.mockImplementation(() => { throw new Error("connection failed"); });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("skips upsert when no reports to write", async () => {
    // Both clicks and signups empty → brokerMap empty → upsert not called
    let call = 0;
    let upsertCalled = false;
    const upsertChain = makeChain({ data: null, error: null });
    (upsertChain.upsert as ReturnType<typeof vi.fn>).mockImplementation(() => { upsertCalled = true; return upsertChain; });
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call <= 2) return makeChain({ data: [], error: null });
        return upsertChain;
      }),
    } as never);
    await GET(makeReq());
    expect(upsertCalled).toBe(false);
  });
});
