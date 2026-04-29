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

// getSiteUrl() is called at module init — must be hoisted before import
const mockGetSiteUrl = vi.hoisted(() => vi.fn(() => "https://invest.com.au"));
vi.mock("@/lib/url", () => ({ getSiteUrl: mockGetSiteUrl }));

const mockGetPersonalizedBrokers = vi.fn();
vi.mock("@/lib/broker-recommendations", () => ({
  getPersonalizedBrokers: (...a: unknown[]) => mockGetPersonalizedBrokers(...a),
}));

const mockBrokerDripEmail4 = vi.fn();
const mockBrokerDripEmail5 = vi.fn();
vi.mock("@/lib/email-templates", () => ({
  brokerDripEmail4: (...a: unknown[]) => mockBrokerDripEmail4(...a),
  brokerDripEmail5: (...a: unknown[]) => mockBrokerDripEmail5(...a),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/cron/investor-drip/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/investor-drip") as unknown as NextRequest;
}

interface ChainResult {
  data: unknown;
  error?: { message: string } | null;
}

function makeChain(result: ChainResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "neq", "order", "limit", "insert", "maybeSingle"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: ChainResult) => unknown) => Promise.resolve(resolve(result));
  return c;
}

// Factory: returns what each table yields
function makeFromFactory(overrides: {
  captures?: unknown[];
  quizLeads?: unknown[];
  dripLog?: unknown[];
  broker?: unknown;
  insertErr?: null | { message: string };
} = {}) {
  const {
    captures = [],
    quizLeads = [],
    dripLog = [],
    broker = null,
    insertErr = null,
  } = overrides;

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "email_captures") return makeChain({ data: captures, error: null });
    if (table === "quiz_leads") return makeChain({ data: quizLeads, error: null });
    if (table === "investor_drip_log") {
      if (insertErr !== undefined) {
        return {
          select: vi.fn(() => ({ gte: vi.fn(() => makeChain({ data: dripLog, error: null })) })),
          insert: vi.fn().mockResolvedValue({ error: insertErr }),
        };
      }
      return makeChain({ data: dripLog, error: null });
    }
    if (table === "brokers") return makeChain({ data: broker, error: null });
    return makeChain({ data: null, error: null });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/investor-drip", () => {
  const origResendKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    process.env.RESEND_API_KEY = "re_test_key";
    mockBrokerDripEmail4.mockReturnValue("<html>drip4</html>");
    mockBrokerDripEmail5.mockReturnValue("<html>drip5</html>");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
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

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    makeFromFactory();
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("RESEND_API_KEY");
  });

  it("returns processed:0 emails_sent:0 when no captures or leads", async () => {
    makeFromFactory();
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { processed: number; emails_sent: number };
    expect(body.processed).toBe(0);
    expect(body.emails_sent).toBe(0);
  });

  it("sends drip 1 (day 0) for a fresh capture", async () => {
    const now = new Date();
    makeFromFactory({
      captures: [{ email: "new@example.com", name: "Alice", source: "homepage", context: null, created_at: now.toISOString() }],
      dripLog: [],
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { emails_sent: number; processed: number };
    expect(body.emails_sent).toBe(1);
    expect(body.processed).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(callArgs[0]).toBe("https://api.resend.com/emails");
    const reqBody = JSON.parse(callArgs[1].body as string) as { subject: string };
    expect(reqBody.subject).toContain("Welcome");
  });

  it("skips drip that was already sent (sentSet dedup)", async () => {
    const now = new Date();
    makeFromFactory({
      captures: [{ email: "old@example.com", name: "Bob", source: null, context: null, created_at: now.toISOString() }],
      dripLog: [{ email: "old@example.com", drip_number: 1 }],
    });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(0);
  });

  it("skips drip 2 when fewer than 2 days have passed", async () => {
    const now = new Date();
    // Capture is 1 day old — drip 1 should be sent, drip 2 skipped
    const oneDayAgo = new Date(now.getTime() - 1 * 86400000);
    makeFromFactory({
      captures: [{ email: "mid@example.com", name: "Carol", source: null, context: null, created_at: oneDayAgo.toISOString() }],
      dripLog: [{ email: "mid@example.com", drip_number: 1 }], // drip 1 already sent
    });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    // drip 2 requires minDays=2 but only 1 day has passed → 0 sent
    expect(body.emails_sent).toBe(0);
  });

  it("sends drip 4 via getPersonalizedBrokers when day ≥ 7", async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const fakeBroker = { slug: "commsec", name: "CommSec" };
    mockGetPersonalizedBrokers.mockResolvedValue([fakeBroker]);
    makeFromFactory({
      captures: [{ email: "week@example.com", name: "Dave", source: null, context: null, created_at: sevenDaysAgo.toISOString() }],
      dripLog: [
        { email: "week@example.com", drip_number: 1 },
        { email: "week@example.com", drip_number: 2 },
        { email: "week@example.com", drip_number: 3 },
      ],
    });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(1);
    expect(mockGetPersonalizedBrokers).toHaveBeenCalledWith(
      expect.anything(),
      { email: "week@example.com", dripNumber: 4 },
    );
    expect(mockBrokerDripEmail4).toHaveBeenCalledWith("Dave", [fakeBroker]);
  });

  it("skips drip 4 when getPersonalizedBrokers returns empty array", async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    mockGetPersonalizedBrokers.mockResolvedValue([]);
    makeFromFactory({
      captures: [{ email: "nodeal@example.com", name: "Eve", source: null, context: null, created_at: sevenDaysAgo.toISOString() }],
      dripLog: [
        { email: "nodeal@example.com", drip_number: 1 },
        { email: "nodeal@example.com", drip_number: 2 },
        { email: "nodeal@example.com", drip_number: 3 },
      ],
    });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    expect(body.emails_sent).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("only sends one drip per user per run (break after first eligible)", async () => {
    // User has sent nothing, signup is 10 days ago (all drips eligible)
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);
    mockGetPersonalizedBrokers.mockResolvedValue([{ slug: "commsec", name: "CommSec" }]);
    makeFromFactory({
      captures: [{ email: "multi@example.com", name: "Frank", source: null, context: null, created_at: tenDaysAgo.toISOString() }],
      dripLog: [], // nothing sent yet
    });
    const res = await GET(makeReq());
    const body = await res.json() as { emails_sent: number };
    // Only drip 1 should be sent (the first eligible, due to break)
    expect(body.emails_sent).toBe(1);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("deduplicates captures and quiz leads by email", async () => {
    const now = new Date();
    makeFromFactory({
      captures: [{ email: "SHARED@example.com", name: "Grace", source: null, context: null, created_at: now.toISOString() }],
      quizLeads: [{ email: "shared@example.com", name: "Grace", created_at: now.toISOString(), top_match_slug: "commsec", experience_level: null, investment_range: null, trading_interest: null }],
      dripLog: [],
    });
    const res = await GET(makeReq());
    const body = await res.json() as { processed: number };
    // Case-normalised → 1 unique user
    expect(body.processed).toBe(1);
  });
});
