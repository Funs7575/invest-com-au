import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => mockRequireCronAuth(...a),
}));

const mockFollowUp1 = vi.fn();
const mockFollowUp2 = vi.fn();
const mockFollowUp3 = vi.fn();
vi.mock("@/lib/email-templates", () => ({
  quizFollowUp1Email: (...a: unknown[]) => mockFollowUp1(...a),
  quizFollowUp2Email: (...a: unknown[]) => mockFollowUp2(...a),
  quizFollowUp3Email: (...a: unknown[]) => mockFollowUp3(...a),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/cron/quiz-follow-up/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/quiz-follow-up") as unknown as NextRequest;
}

interface ChainResult {
  data: unknown;
  error?: { message: string; code?: string } | null;
}

function makeChain(result: ChainResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "not", "gte", "order", "limit", "insert", "in"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: ChainResult) => unknown) => Promise.resolve(resolve(result));
  return c;
}

interface QuizLead {
  email: string;
  name: string;
  experience_level: string | null;
  investment_range: string | null;
  trading_interest: string | null;
  top_match_slug: string | null;
  created_at: string;
}

function buildLead(overrides: Partial<QuizLead> = {}): QuizLead {
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
  return {
    email: "quiz@example.com",
    name: "Alice",
    experience_level: "beginner",
    investment_range: "1000-5000",
    trading_interest: "shares",
    top_match_slug: "commsec",
    created_at: twoDaysAgo,
    ...overrides,
  };
}

const fakeBroker = {
  name: "CommSec",
  slug: "commsec",
  rating: 4.5,
  asx_fee: "$10",
  us_fee: "$20",
  chess_sponsored: true,
  pros: ["CHESS sponsored", "Trusted brand"],
  tagline: "Australia's #1",
  affiliate_url: "https://commsec.com.au",
  deal: true,
  deal_text: "Free trades for first 3 months",
  deal_expiry: null,
};

// Sets up from() calls: quiz_leads → (per-lead: quiz_follow_ups + brokers) → quiz_follow_ups.insert
function setupMocks(overrides: {
  leads?: QuizLead[] | null;
  leadsErr?: { message: string } | null;
  sentDrips?: { drip_type: string }[];
  broker?: unknown;
  runnerUps?: unknown[];
  insertErr?: { message: string; code?: string } | null;
} = {}) {
  const {
    leads = [buildLead()],
    leadsErr = null,
    sentDrips = [],
    broker = fakeBroker,
    runnerUps = [],
    insertErr = null,
  } = overrides;

  // Drip 2 builds two broker queries: top-match (maybeSingle) + runner-ups (.then array).
  let brokerCallCount = 0;

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "quiz_leads") {
      return makeChain({ data: leads, error: leadsErr });
    }
    if (table === "quiz_follow_ups") {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => makeChain({ data: sentDrips, error: null })) })),
        insert: vi.fn().mockResolvedValue({ error: insertErr }),
      };
    }
    if (table === "brokers") {
      brokerCallCount++;
      // Even-numbered calls are runner-up array queries (drip 2 second call)
      if (brokerCallCount % 2 === 0) {
        return makeChain({ data: runnerUps, error: null });
      }
      // Odd calls: single broker lookup — maybeSingle + .then both work
      return makeChain({ data: broker, error: null });
    }
    return makeChain({ data: null, error: null });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/quiz-follow-up", () => {
  const origResendKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    process.env.RESEND_API_KEY = "re_test_key";
    mockFollowUp1.mockReturnValue("<html>drip1</html>");
    mockFollowUp2.mockReturnValue("<html>drip2</html>");
    mockFollowUp3.mockReturnValue("<html>drip3</html>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") }));
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = origResendKey;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns early with 0 counts when leads query errors", async () => {
    setupMocks({ leadsErr: { message: "DB timeout" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; leads_processed: number; message: string };
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(0);
    expect(body.message).toBe("DB timeout");
  });

  it("returns early when no leads found", async () => {
    setupMocks({ leads: [] });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; leads_processed: number };
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(0);
  });

  it("skips drip 1 when fewer than 2 days have passed", async () => {
    const freshLead = buildLead({ created_at: new Date().toISOString() });
    setupMocks({ leads: [freshLead], sentDrips: [] });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number; skipped: number };
    expect(body.emails_sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("skips drip when already sent (sentTypes dedup)", async () => {
    setupMocks({ sentDrips: [{ drip_type: "quiz_followup_1" }] });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    // All drips either sent or not yet eligible
    expect(body.emails_sent).toBe(0);
  });

  it("skips drip 1 when no top_match_slug", async () => {
    setupMocks({ leads: [buildLead({ top_match_slug: null })] });
    const res = await GET(makeReq());
    const body = await res.json() as { results: { action: string; detail: string }[] };
    const skipResult = body.results.find((r) => r.detail.includes("No top_match_slug"));
    expect(skipResult).toBeDefined();
    expect(skipResult?.action).toBe("skipped");
  });

  it("sends drip 1 on day 2 and records in quiz_follow_ups", async () => {
    setupMocks({ sentDrips: [] });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; leads_processed: number };
    expect(body.emails_sent).toBe(1);
    expect(body.leads_processed).toBe(1);
    expect(mockFollowUp1).toHaveBeenCalledWith(
      "Alice",
      expect.objectContaining({ slug: "commsec", name: "CommSec" }),
      "beginner",
      "1000-5000",
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("sends drip 2 comparison email on day 5", async () => {
    const fiveDaysAgo = buildLead({
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    });
    setupMocks({
      leads: [fiveDaysAgo],
      sentDrips: [{ drip_type: "quiz_followup_1" }],
      runnerUps: [
        { name: "SelfWealth", slug: "selfwealth", rating: 4.2, asx_fee: "$9.50", us_fee: null },
        { name: "Stake", slug: "stake", rating: 4.0, asx_fee: null, us_fee: "$3" },
      ],
    });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(1);
    expect(mockFollowUp2).toHaveBeenCalledWith(
      "Alice",
      expect.arrayContaining([expect.objectContaining({ slug: "commsec" })]),
      "shares",
    );
  });

  it("sends drip 3 action email on day 8 with deal detection", async () => {
    const eightDaysAgo = buildLead({
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    });
    setupMocks({
      leads: [eightDaysAgo],
      sentDrips: [
        { drip_type: "quiz_followup_1" },
        { drip_type: "quiz_followup_2" },
      ],
    });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(1);
    expect(mockFollowUp3).toHaveBeenCalledWith(
      "Alice",
      expect.objectContaining({ slug: "commsec" }),
      true, // broker.deal is true and deal_text present and no expiry
    );
  });

  it("records drip even when RESEND_API_KEY is absent (email_sent: false)", async () => {
    delete process.env.RESEND_API_KEY;
    setupMocks({ sentDrips: [] });
    await GET(makeReq());
    expect(fetch).not.toHaveBeenCalled();
    // But quiz_follow_ups.insert should still be called
    const insertCalls = (mockAdminFrom.mock.results as Array<{ value: { insert?: ReturnType<typeof vi.fn> } }>)
      .map((r) => r.value?.insert)
      .filter(Boolean);
    expect(insertCalls.length).toBeGreaterThan(0);
  });

  it("skips duplicate insert (code 23505) gracefully", async () => {
    setupMocks({
      sentDrips: [],
      insertErr: { message: "duplicate key", code: "23505" },
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; skipped: number };
    expect(body.emails_sent).toBe(0);
    expect(body.skipped).toBe(1);
  });

  it("only sends one drip per lead per run", async () => {
    // Lead is 8 days old with nothing sent — drip 1 is first eligible, break kicks in
    const eightDaysAgo = buildLead({
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    });
    setupMocks({ leads: [eightDaysAgo], sentDrips: [] });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
