import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","limit"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET } from "@/app/api/cron/check-affiliate-links/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/check-affiliate-links", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

function broker(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "commsec",
    name: "CommSec",
    affiliate_url: "https://www.commsec.com.au/?ref=invest",
    link_status: "ok",
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-resend-key";
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/check-affiliate-links", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when brokers fetch fails", async () => {
    dbQueue.push({ error: { message: "DB error" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns ok with zero results when no active brokers", async () => {
    dbQueue.push({ data: [] }); // brokers empty
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { checked: number; ok: number; broken: number };
    expect(body.checked).toBe(0);
    expect(body.ok).toBe(0);
    expect(body.broken).toBe(0);
  });

  it("marks broker as ok when affiliate URL returns 200", async () => {
    dbQueue.push({ data: [broker()] }); // brokers
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 200 })) // affiliate URL check
    dbQueue.push({ error: null }); // update broker link_status

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { checked: number; ok: number; broken: number };
    expect(body.checked).toBe(1);
    expect(body.ok).toBe(1);
    expect(body.broken).toBe(0);
  });

  it("marks broker as broken and sends alert email when URL returns 404", async () => {
    const b = broker({ link_status: "ok" });
    dbQueue.push({ data: [b] });
    fetchMock
      .mockResolvedValueOnce(new Response("", { status: 404 })) // affiliate URL
      .mockResolvedValueOnce(new Response("", { status: 200 })); // alert email
    dbQueue.push({ error: null }); // update broker
    dbQueue.push({ error: null }); // insert audit log

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { broken: number; changed: number };
    expect(body.broken).toBe(1);
    expect(body.changed).toBe(1);
    // Alert email sent to Resend
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("marks broker as no_url when affiliate_url is null", async () => {
    const b = broker({ affiliate_url: null, link_status: null });
    dbQueue.push({ data: [b] });
    dbQueue.push({ error: null }); // update link_status=no_url

    const res = await GET(makeReq());
    const body = await res.json() as { noUrl: number };
    expect(body.noUrl).toBe(1);
  });

  it("marks broker as timeout when fetch times out", async () => {
    dbQueue.push({ data: [broker({ link_status: "ok" })] });
    fetchMock.mockRejectedValueOnce(new Error("AbortError: timeout"));
    dbQueue.push({ error: null }); // update link_status=timeout
    dbQueue.push({ error: null }); // insert audit log
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 })); // alert email

    const res = await GET(makeReq());
    const body = await res.json() as { broken: number };
    expect(body.broken).toBe(1);
  });

  it("does not send alert email when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    const b = broker({ link_status: "ok" });
    dbQueue.push({ data: [b] });
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 })); // server_error
    dbQueue.push({ error: null }); // update
    dbQueue.push({ error: null }); // audit log

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    // Only 2 fetch calls: link check + no alert (no RESEND key)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
