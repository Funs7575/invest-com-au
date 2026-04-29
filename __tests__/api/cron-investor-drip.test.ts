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

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

vi.mock("@/lib/broker-recommendations", () => ({
  getPersonalizedBrokers: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/email-templates", () => ({
  brokerDripEmail4: vi.fn(() => "<html>drip4</html>"),
  brokerDripEmail5: vi.fn(() => "<html>drip5</html>"),
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
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","order","limit","maybeSingle","single"];
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

import { GET } from "@/app/api/cron/investor-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { getPersonalizedBrokers } from "@/lib/broker-recommendations";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/investor-drip", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

const NOW = new Date();
const DAY0 = NOW.toISOString(); // just signed up → drip 1 eligible (minDays 0)
const DAY3_AGO = new Date(NOW.getTime() - 3 * 86400000).toISOString();

function emailCapture(overrides: Record<string, unknown> = {}) {
  return {
    email: "alice@example.com",
    name: "Alice Smith",
    source: "compare",
    context: null,
    created_at: DAY3_AGO,
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-key";
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));
  vi.mocked(getPersonalizedBrokers).mockResolvedValue([]);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/investor-drip", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns zero emails when no captures or quiz leads", async () => {
    dbQueue.push({ data: [] }); // email_captures
    dbQueue.push({ data: [] }); // quiz_leads
    dbQueue.push({ data: [] }); // investor_drip_log (sent drips)

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; processed: number };
    expect(body.emails_sent).toBe(0);
    expect(body.processed).toBe(0);
  });

  it("sends drip 1 (welcome) to a brand-new email capture", async () => {
    // Drip 1 minDays=0 → eligible on day 0
    const capture = emailCapture({ created_at: DAY0 });
    dbQueue.push({ data: [capture] }); // email_captures
    dbQueue.push({ data: [] });         // quiz_leads (none)
    dbQueue.push({ data: [] });         // investor_drip_log (none sent)
    // fetch Resend → 200 ok
    dbQueue.push({ error: null });      // investor_drip_log insert

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("skips drip 1 when already sent, sends drip 2 at day 3", async () => {
    const capture = emailCapture(); // 3 days ago → drip 2 eligible (minDays=2)
    dbQueue.push({ data: [capture] }); // email_captures
    dbQueue.push({ data: [] });         // quiz_leads
    dbQueue.push({ data: [{ email: "alice@example.com", drip_number: 1 }] }); // drip 1 already sent
    // drip 2: fetch Resend → ok
    dbQueue.push({ error: null });      // investor_drip_log insert drip 2

    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(1);
  });

  it("skips drip 4 when getPersonalizedBrokers returns empty", async () => {
    const sevenDaysAgo = new Date(NOW.getTime() - 7 * 86400000).toISOString();
    const capture = emailCapture({ created_at: sevenDaysAgo });
    vi.mocked(getPersonalizedBrokers).mockResolvedValue([]);

    dbQueue.push({ data: [capture] });
    dbQueue.push({ data: [] }); // quiz_leads
    // sent drips 1-3 already
    dbQueue.push({ data: [
      { email: "alice@example.com", drip_number: 1 },
      { email: "alice@example.com", drip_number: 2 },
      { email: "alice@example.com", drip_number: 3 },
    ] });
    // drip 4 skipped (no brokers) → no fetch, no insert

    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send when fetch returns non-ok and does not insert log", async () => {
    const capture = emailCapture({ created_at: DAY0 });
    dbQueue.push({ data: [capture] });
    dbQueue.push({ data: [] }); // quiz_leads
    dbQueue.push({ data: [] }); // drip_log

    // Resend returns error
    fetchMock.mockResolvedValueOnce(new Response("bad request", { status: 400 }));

    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    // emails_sent not incremented since res.ok is false
    expect(body.emails_sent).toBe(0);
  });
});
