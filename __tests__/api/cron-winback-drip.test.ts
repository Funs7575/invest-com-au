import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({ wrapCronHandler: (_n: string, h: unknown) => h }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const mockIsFeatureDisabled = vi.fn(async () => false);
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: (...args: unknown[]) => mockIsFeatureDisabled(...args),
}));

import { GET } from "@/app/api/cron/winback-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

const dbQueue: unknown[] = [];
let dbIdx = 0;

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "in", "gte", "lte", "is", "neq", "not", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/winback-drip", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  dbQueue.length = 0;
  dbIdx = 0;
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockIsFeatureDisabled.mockResolvedValue(false);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true });
  delete process.env.RESEND_API_KEY;
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/winback-drip", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns skipped when kill switch on", async () => {
    mockIsFeatureDisabled.mockResolvedValueOnce(true);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
  });

  it("returns 500 when email_captures fetch errors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns scanned:0 when no captures in window", async () => {
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [], error: null }); // email_captures
        return makeChain({ data: [], error: null }); // suppression list
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.sent).toBe(0);
  });

  it("skips suppressed email", async () => {
    const capture = { email: "user@ex.com", captured_at: new Date(Date.now() - 45 * 86400000).toISOString(), winback_sent_at: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        return makeChain({ data: [{ email: "user@ex.com" }], error: null }); // suppressed
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.suppressed).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends winback email and stamps winback_sent_at (no RESEND key — stamps only)", async () => {
    const capture = { email: "user@ex.com", captured_at: new Date(Date.now() - 45 * 86400000).toISOString(), winback_sent_at: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        if (call === 2) return makeChain({ data: [], error: null }); // no suppressions
        return makeChain({ data: null, error: null }); // update winback_sent_at
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends Resend email when RESEND_API_KEY set", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const capture = { email: "user@ex.com", captured_at: new Date(Date.now() - 45 * 86400000).toISOString(), winback_sent_at: null };
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [capture], error: null });
        if (call === 2) return makeChain({ data: [], error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });
});
