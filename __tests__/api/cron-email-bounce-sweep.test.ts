import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/email-bounce-sweep/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeQueuedChain(queue: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "update", "upsert", "insert", "delete", "gte", "lt", "lte", "not", "is", "order", "limit", "in", "or"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(queue[idx++])));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/email-bounce-sweep", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/email-bounce-sweep", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("skips Resend pull when RESEND_API_KEY not set", async () => {
    // No RESEND_API_KEY — only suppression list queries run
    const chain = makeQueuedChain([
      { data: [], error: null }, // email_suppression_list
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    expect(mockFetch).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pulled_from_resend).toBe(0);
  });

  it("pulls bounces from Resend and upserts each email", async () => {
    process.env.RESEND_API_KEY = "rk_test_key";
    // Mock fetch for Resend API
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{ to: ["bad@example.com"], bounce_type: "hard" }],
      }),
    });
    // suppression list fetch (after Resend pull), leads update, drips delete
    const chain = makeQueuedChain([
      { data: null, error: null }, // upsert into email_suppression_list
      { data: [{ email: "bad@example.com" }], error: null }, // select suppression list
      { data: null, error: null }, // update leads
      { count: 0, error: null }, // count leads
      { count: 0, error: null }, // delete drips
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pulled_from_resend).toBe(1);
  });

  it("skips lead flagging and drip scrub when suppression list is empty", async () => {
    const chain = makeQueuedChain([
      { data: [], error: null }, // empty suppression list
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.leads_flagged).toBe(0);
    expect(body.drips_scrubbed).toBe(0);
  });

  it("handles Resend API non-OK response gracefully", async () => {
    process.env.RESEND_API_KEY = "rk_test_key";
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const chain = makeQueuedChain([
      { data: [], error: null }, // suppression list
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.pulled_from_resend).toBe(0);
  });

  it("handles Resend API throw and continues cron", async () => {
    process.env.RESEND_API_KEY = "rk_test_key";
    mockFetch.mockRejectedValue(new Error("network error"));

    const chain = makeQueuedChain([
      { data: [], error: null }, // suppression list
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errored).toBe(1);
  });
});
