import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/check-affiliate-links/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq", "in", "not", "is", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeBroker(overrides: Record<string, unknown> = {}) {
  return { id: 1, slug: "abc", name: "ABC", affiliate_url: "https://abc.com/signup", link_status: "ok", ...overrides };
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/check-affiliate-links", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  delete process.env.RESEND_API_KEY;
});

afterEach(() => { vi.unstubAllGlobals(); delete process.env.RESEND_API_KEY; });

describe("GET /api/cron/check-affiliate-links", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when brokers query errors", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: null, error: { message: "db error" } })) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns checked:0 when no active brokers", async () => {
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => makeChain({ data: [], error: null })) } as never);
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.checked).toBe(0);
    expect(body.ok).toBe(0);
  });

  it("marks broker with no affiliate_url as no_url", async () => {
    const broker = makeBroker({ affiliate_url: null, link_status: "ok" });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null }); // select brokers
        return makeChain({ data: null, error: null }); // update
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.noUrl).toBe(1);
    expect(body.ok).toBe(0);
  });

  it("marks broker with 200 response as ok", async () => {
    const broker = makeBroker();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null });
        return makeChain({ data: null, error: null }); // update
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(1);
    expect(body.broken).toBe(0);
  });

  it("marks broker with 404 as broken and sends alert when RESEND set", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    const broker = makeBroker({ link_status: "ok" }); // changed: was ok, now broken
    // First fetch call is the affiliate URL check, second is the Resend alert email
    let fetchIdx = 0;
    mockFetch.mockImplementation(() => {
      fetchIdx++;
      if (fetchIdx === 1) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true }); // Resend alert
    });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null });
        if (call === 2) return makeChain({ data: null, error: null }); // update
        return makeChain({ data: null, error: null }); // audit log insert
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.broken).toBe(1);
    expect(body.changed).toBe(1); // was ok, now broken
    // Alert email should have been sent
    expect(fetchIdx).toBe(2);
  });

  it("records timeout status when affiliate fetch throws", async () => {
    const broker = makeBroker({ link_status: "ok" });
    let fetchIdx = 0;
    mockFetch.mockImplementation(() => {
      fetchIdx++;
      if (fetchIdx === 1) return Promise.reject(new Error("AbortError: The operation was aborted"));
      return Promise.resolve({ ok: true }); // no alert (no RESEND key)
    });
    let call = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => {
        call++;
        if (call === 1) return makeChain({ data: [broker], error: null });
        return makeChain({ data: null, error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.results[0].status).toBe("timeout");
  });
});
