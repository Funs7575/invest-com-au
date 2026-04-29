import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

// Queue-based DB mock
interface DbResult { data?: unknown; error?: { message: string } | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "in", "lt", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null })),
  })),
}));

// Mock global fetch for the notifyAdmin email
const mockFetch = vi.fn(() => Promise.resolve({ ok: true }));
vi.stubGlobal("fetch", mockFetch);

import { GET } from "@/app/api/cron/content-freshness/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/content-freshness") as unknown as NextRequest;
}

const fakeArticle = (id: number) => ({
  id,
  slug: `article-${id}`,
  title: `Article ${id}`,
  category: "investing",
  updated_at: "2025-01-01T00:00:00Z",
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/content-freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
    delete process.env.RESEND_API_KEY;
    delete process.env.LEADS_NOTIFY_EMAIL;
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when articles DB query fails", async () => {
    dbQueue.push({ data: null, error: { message: "select failed" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("select failed");
  });

  it("returns ok with newly_queued=0 when no stale articles", async () => {
    dbQueue.push({ data: [] }); // articles query
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; stale_found: number; newly_queued: number };
    expect(json.ok).toBe(true);
    expect(json.stale_found).toBe(0);
    expect(json.newly_queued).toBe(0);
  });

  it("skips article that already has an open content_calendar task", async () => {
    dbQueue.push({ data: [fakeArticle(1)] }); // articles query
    dbQueue.push({ data: [{ id: 99, status: "planned" }] }); // existing content_calendar check
    const res = await GET(makeReq());
    const json = await res.json() as { newly_queued: number };
    expect(json.newly_queued).toBe(0);
  });

  it("inserts content_calendar and freshness_log when no existing task", async () => {
    dbQueue.push({ data: [fakeArticle(1)] }); // articles query
    dbQueue.push({ data: [] });               // no existing content_calendar
    dbQueue.push({ data: null });             // insert content_calendar — success
    dbQueue.push({ data: null });             // insert content_freshness_log
    const res = await GET(makeReq());
    const json = await res.json() as { newly_queued: number };
    expect(json.newly_queued).toBe(1);
  });

  it("does not increment queued when content_calendar insert errors", async () => {
    dbQueue.push({ data: [fakeArticle(1)] });
    dbQueue.push({ data: [] });
    dbQueue.push({ error: { message: "insert failed" } }); // content_calendar insert fails
    const res = await GET(makeReq());
    const json = await res.json() as { newly_queued: number };
    expect(json.newly_queued).toBe(0);
  });

  it("does not call fetch for notify when queued=0", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.LEADS_NOTIFY_EMAIL = "lead@example.com";
    dbQueue.push({ data: [] });
    await GET(makeReq());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("calls fetch to notify admin when queued > 0 and keys set", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.LEADS_NOTIFY_EMAIL = "lead@example.com";
    dbQueue.push({ data: [fakeArticle(5)] });
    dbQueue.push({ data: [] });
    dbQueue.push({ data: null }); // insert cc
    dbQueue.push({ data: null }); // insert freshness log
    const res = await GET(makeReq());
    const json = await res.json() as { newly_queued: number };
    expect(json.newly_queued).toBe(1);
    // fetch is fire-and-forget; it may complete after the response
    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string) as { to: string[] };
    expect(body.to).toContain("lead@example.com");
  });

  it("skips notify fetch when RESEND_API_KEY absent", async () => {
    process.env.LEADS_NOTIFY_EMAIL = "lead@example.com";
    // no RESEND_API_KEY
    dbQueue.push({ data: [fakeArticle(5)] });
    dbQueue.push({ data: [] });
    dbQueue.push({ data: null });
    dbQueue.push({ data: null });
    await GET(makeReq());
    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
