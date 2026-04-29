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

vi.mock("@/lib/email-templates", () => ({
  quizFollowUp1Email: vi.fn(() => "<html>drip1</html>"),
  quizFollowUp2Email: vi.fn(() => "<html>drip2</html>"),
  quizFollowUp3Email: vi.fn(() => "<html>drip3</html>"),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
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

import { GET } from "@/app/api/cron/quiz-follow-up/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/quiz-follow-up", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

const THREE_DAYS_AGO = new Date(Date.now() - 3 * 86400000).toISOString();
const SIX_DAYS_AGO = new Date(Date.now() - 6 * 86400000).toISOString();

function quizLead(overrides: Record<string, unknown> = {}) {
  return {
    email: "alice@example.com",
    name: "Alice",
    experience_level: "beginner",
    investment_range: "10k-50k",
    trading_interest: "etf",
    top_match_slug: "commsec",
    created_at: THREE_DAYS_AGO,
    ...overrides,
  };
}

function broker() {
  return {
    name: "CommSec",
    slug: "commsec",
    rating: 4.2,
    asx_fee: "$29.95",
    us_fee: "USD $6.95",
    chess_sponsored: true,
    pros: ["CHESS-sponsored", "Integrated with CommBank"],
    tagline: "Australia's largest broker",
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-key";
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/quiz-follow-up", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns early with zero counts when no quiz leads exist", async () => {
    dbQueue.push({ data: [] }); // quiz_leads empty

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; leads_processed: number };
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(0);
  });

  it("returns early with error message when quiz_leads query fails", async () => {
    dbQueue.push({ data: null, error: { message: "DB connection failed" } });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; message: string };
    expect(body.emails_sent).toBe(0);
    expect(body.message).toBe("DB connection failed");
  });

  it("sends drip 1 (Day 2) to lead with top_match_slug at day 3", async () => {
    dbQueue.push({ data: [quizLead()] });       // quiz_leads
    dbQueue.push({ data: [] });                  // quiz_follow_ups (no drips sent)
    dbQueue.push({ data: broker() });            // brokers maybeSingle (drip 1 buildHtml)
    dbQueue.push({ error: null });               // quiz_follow_ups insert

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; results: { action: string }[] };
    expect(body.emails_sent).toBe(1);
    expect(body.results.some((r) => r.action === "sent")).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("skips lead when drip 1 already sent", async () => {
    dbQueue.push({ data: [quizLead()] });
    dbQueue.push({ data: [{ drip_type: "quiz_followup_1" }] }); // already sent

    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number; skipped: number };
    expect(body.emails_sent).toBe(0);
    expect(body.skipped).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips drip 1 and sends drip 2 for lead at day 6 with drip 1 sent", async () => {
    const lead = quizLead({ created_at: SIX_DAYS_AGO }); // 6 days → drip 2 eligible (>= 5)
    dbQueue.push({ data: [lead] });
    dbQueue.push({ data: [{ drip_type: "quiz_followup_1" }] }); // drip 1 sent
    // drip 2 buildHtml: fetches top broker + runner-ups (2 queries)
    dbQueue.push({ data: broker() });                             // top broker maybeSingle
    dbQueue.push({ data: [{ name: "SelfWealth", slug: "selfwealth", rating: 4.0, asx_fee: "$9.50" }] }); // runner-ups
    dbQueue.push({ error: null });                               // quiz_follow_ups insert

    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(1);
  });

  it("records skipped when duplicate constraint (23505) on insert", async () => {
    dbQueue.push({ data: [quizLead()] });
    dbQueue.push({ data: [] });
    dbQueue.push({ data: broker() });
    dbQueue.push({ error: { message: "duplicate key", code: "23505" } }); // quiz_follow_ups insert conflict

    const res = await GET(makeReq());
    const body = await res.json() as { skipped: number };
    expect(body.skipped).toBeGreaterThan(0);
  });

  it("records email without sending when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    dbQueue.push({ data: [quizLead()] });
    dbQueue.push({ data: [] });
    dbQueue.push({ data: broker() });
    dbQueue.push({ error: null }); // insert still happens

    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number; results: { action: string }[] };
    expect(body.emails_sent).toBe(0);
    expect(body.results.some((r) => r.action === "recorded")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
