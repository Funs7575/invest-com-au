import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/advisor-application-resolver", () => ({ lookupAfsl: vi.fn() }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));

import { GET } from "@/app/api/cron/afsl-expiry-monitor/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { lookupAfsl } from "@/lib/advisor-application-resolver";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockLookupAfsl = vi.mocked(lookupAfsl);
const mockFetch = vi.fn();

function makeTableChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "update", "gte", "lt", "not", "is", "order", "limit", "in", "upsert", "insert"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/afsl-expiry-monitor", { method: "GET" });
}

const baseAdvisor = {
  id: "adv1",
  name: "Jane Doe",
  email: "jane@example.com",
  afsl_number: "123456",
  type: "financial_advisor",
  status: "active",
};

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/cron/afsl-expiry-monitor", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when advisor fetch fails", async () => {
    const chain = makeTableChain({ data: null, error: { message: "DB error" } });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns ok with zero scanned when no advisors", async () => {
    const chain = makeTableChain({ data: [], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
  });

  it("counts skipped_no_lookup when lookupAfsl.performed is false", async () => {
    const chain = makeTableChain({ data: [baseAdvisor], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockLookupAfsl.mockResolvedValue({ performed: false } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped_no_lookup).toBe(1);
    expect(body.lookups_run).toBe(0);
  });

  it("counts still_current when AFSL is current", async () => {
    const chain = makeTableChain({ data: [baseAdvisor], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockLookupAfsl.mockResolvedValue({ performed: true, status: "current" } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.still_current).toBe(1);
    expect(body.flagged_ceased).toBe(0);
  });

  it("auto-pauses advisor and sends email when AFSL is ceased", async () => {
    const listChain = makeTableChain({ data: [baseAdvisor], error: null });
    const updateChain = makeTableChain({ data: null, error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(listChain)
      .mockReturnValueOnce(updateChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);
    mockLookupAfsl.mockResolvedValue({ performed: true, status: "ceased" } as never);
    process.env.RESEND_API_KEY = "test-key";

    const res = await GET(makeReq());
    // Let fire-and-forget settle
    await new Promise((r) => setTimeout(r, 10));
    const body = await res.json();
    expect(body.flagged_ceased).toBe(1);
    expect(body.flagged_suspended).toBe(0);
    expect(mockFetch).toHaveBeenCalled(); // email sent

    delete process.env.RESEND_API_KEY;
  });

  it("counts flagged_suspended for suspended AFSL", async () => {
    const listChain = makeTableChain({ data: [baseAdvisor], error: null });
    const updateChain = makeTableChain({ data: null, error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(listChain)
      .mockReturnValueOnce(updateChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);
    mockLookupAfsl.mockResolvedValue({ performed: true, status: "suspended" } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.flagged_suspended).toBe(1);
  });

  it("increments errored and continues when lookupAfsl throws", async () => {
    const chain = makeTableChain({ data: [baseAdvisor], error: null });
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    mockLookupAfsl.mockRejectedValue(new Error("lookup API down"));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.errored).toBe(1);
    expect(body.ok).toBe(true);
  });

  it("does not send email when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const listChain = makeTableChain({ data: [baseAdvisor], error: null });
    const updateChain = makeTableChain({ data: null, error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(listChain)
      .mockReturnValueOnce(updateChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);
    mockLookupAfsl.mockResolvedValue({ performed: true, status: "ceased" } as never);

    const res = await GET(makeReq());
    await new Promise((r) => setTimeout(r, 10));
    const body = await res.json();
    expect(body.flagged_ceased).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
