import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockQuizFollowUp1Email, mockQuizFollowUp2Email, mockQuizFollowUp3Email } = vi.hoisted(() => ({
  mockQuizFollowUp1Email: vi.fn(() => "<p>email 1</p>"),
  mockQuizFollowUp2Email: vi.fn(() => "<p>email 2</p>"),
  mockQuizFollowUp3Email: vi.fn(() => "<p>email 3</p>"),
}));

vi.mock("@/lib/email-templates", () => ({
  quizFollowUp1Email: mockQuizFollowUp1Email,
  quizFollowUp2Email: mockQuizFollowUp2Email,
  quizFollowUp3Email: mockQuizFollowUp3Email,
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range",
    "single", "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

// Stub global fetch for Resend calls
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.stubGlobal("fetch", mockFetch);

import { GET, runtime, maxDuration } from "@/app/api/cron/quiz-follow-up/route";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/quiz-follow-up", { headers }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// A helper that creates a lead created N days ago
function leadAge(days: number, overrides: Record<string, unknown> = {}) {
  return {
    email: "test@example.com",
    name: "Test User",
    experience_level: "beginner",
    investment_range: "5000-10000",
    trading_interest: "asx",
    top_match_slug: "acme-broker",
    created_at: new Date(Date.now() - days * 86400000).toISOString(),
    ...overrides,
  };
}

describe("GET /api/cron/quiz-follow-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to clear any unconsumed mockReturnValueOnce queue entries
    mockFrom.mockReset();
    mockFrom.mockImplementation(() => makeBuilder());
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    });
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "re_test_key_123";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
  });

  it("exports edge runtime and maxDuration = 60", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 when no quiz leads found (empty array)", async () => {
    // mockFrom default returns { data: [], error: null } → leads is [] → returns early
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(0);
    expect(body.message).toBe("No recent quiz leads found");
  });

  // ── DB error / early exit ─────────────────────────────────────────

  it("returns early with error message when quiz_leads query fails", async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: null, error: { message: "db connection failed" } }),
    );

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(0);
    expect(body.message).toBe("db connection failed");
  });

  // ── null email skip ────────────────────────────────────────────────

  it("skips a lead with null email and increments skipped", async () => {
    const lead = leadAge(3, { email: null });
    // quiz_leads returns one lead with null email, then nothing more needed
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [lead], error: null }));
    // No sentDrips call needed since email check comes first

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(1);
  });

  // ── not yet eligible (daysSinceQuiz < minDays) ─────────────────────

  it("skips lead created 1 day ago (no drip is eligible yet)", async () => {
    const lead = leadAge(1);
    // quiz_leads → [lead]
    // quiz_follow_ups sentDrips → []
    // all drips need >= 2 days → none sent → "All drips sent or not yet eligible"
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.emails_sent).toBe(0);
    expect(body.leads_processed).toBe(1);
    const result = body.results.find((r: { action: string }) => r.action === "skipped");
    expect(result?.detail).toContain("not yet eligible");
  });

  // ── drip 1 skipped: no top_match_slug ─────────────────────────────

  it("skips drip_1 when lead has no top_match_slug and records skipped result", async () => {
    // Day 3, no top_match_slug → drip 1 skipped; drip 2 (minDays=5) not eligible
    const lead = leadAge(3, { top_match_slug: null });

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))    // quiz_leads
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));       // sentDrips

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    const result = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "skipped" && r.detail.includes("No top_match_slug"),
    );
    expect(result).toBeDefined();
  });

  // ── drip 3 skipped: no top_match_slug ──────────────────────────────

  it("skips drip_3 when lead has no top_match_slug on day 9", async () => {
    // Day 9, no top_match_slug. drip_1 (minDays=2) was already sent. drip_2 (minDays=5) was already sent.
    // drip_3 requires top_match_slug → skip
    const lead = leadAge(9, { top_match_slug: null });

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            { drip_type: "quiz_followup_1" },
            { drip_type: "quiz_followup_2" },
          ],
          error: null,
        }),
      );

    const res = await GET(authedReq());
    const body = await res.json();
    // drip_1 and drip_2 are already sent; drip_3 skipped due to no slug
    expect(body.skipped).toBe(1);
    const result = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "skipped" && r.detail.includes("quiz_followup_3") && r.detail.includes("No top_match_slug"),
    );
    expect(result).toBeDefined();
  });

  // ── drip already sent → skip to next ─────────────────────────────

  it("skips a drip that was already sent (sentTypes has it)", async () => {
    // Day 3, drip_1 already sent → try drip_2 (day >= 5? no → not eligible)
    const lead = leadAge(3);

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({ data: [{ drip_type: "quiz_followup_1" }], error: null }),
      );

    const res = await GET(authedReq());
    const body = await res.json();
    // drip_1 already sent, drip_2/3 not eligible → skipped
    expect(body.skipped).toBe(1);
    expect(body.emails_sent).toBe(0);
  });

  // ── drip 1 success path ───────────────────────────────────────────

  it("sends drip_1 email on day 3 with RESEND_API_KEY set", async () => {
    // Call order: quiz_leads, quiz_follow_ups (sentDrips), brokers (drip1 buildHtml),
    //   quiz_follow_ups insert
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker",
      slug: "acme-broker",
      rating: 4.5,
      asx_fee: "$10",
      us_fee: "$5",
      chess_sponsored: true,
      pros: ["Low fees", "Great app"],
      tagline: "Australia's best",
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))      // quiz_leads
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))           // sentDrips
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))      // brokers (maybySingle)
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));       // insert quiz_follow_ups

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(body.leads_processed).toBe(1);
    expect(mockQuizFollowUp1Email).toHaveBeenCalledWith(
      "Test User",
      expect.objectContaining({ name: "Acme Broker", slug: "acme-broker" }),
      "beginner",
      "5000-10000",
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    const sentResult = body.results.find((r: { action: string }) => r.action === "sent");
    expect(sentResult?.detail).toContain("quiz_followup_1");
  });

  it("uses 'there' as leadName when lead.name is null", async () => {
    const lead = leadAge(3, { name: null });
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: 4.5,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    // quizFollowUp1Email should have been called with "there" as the name
    expect(mockQuizFollowUp1Email).toHaveBeenCalledWith(
      "there",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("handles broker.pros as a JSON string (parses to array)", async () => {
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: null,
      asx_fee: null, us_fee: null, chess_sponsored: null,
      pros: '["Pro 1","Pro 2"]',  // JSON string
      tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockQuizFollowUp1Email).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ pros: ["Pro 1", "Pro 2"] }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("handles broker.pros as invalid JSON (falls back to empty array)", async () => {
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: null,
      asx_fee: null, us_fee: null, chess_sponsored: null,
      pros: "not-valid-json",  // invalid JSON
      tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockQuizFollowUp1Email).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ pros: [] }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("records error when broker not found for drip_1", async () => {
    const lead = leadAge(3);

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));  // broker not found

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.emails_sent).toBe(0);
    const errorResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "error" && r.detail.includes("Broker not found"),
    );
    expect(errorResult).toBeDefined();
  });

  // ── drip 2 success path ───────────────────────────────────────────

  it("sends drip_2 comparison email on day 5", async () => {
    // Call order: quiz_leads, sentDrips (drip_1 already sent), brokers (top match),
    //   brokers (runner-ups), quiz_follow_ups insert
    const lead = leadAge(5);
    const topBroker = {
      name: "Acme Broker", slug: "acme-broker", rating: 4.5, asx_fee: "$10", us_fee: "$5",
    };
    const runnerUps = [
      { name: "Beta Broker", slug: "beta-broker", rating: 4.2, asx_fee: "$12", us_fee: "$7" },
      { name: "Gamma Broker", slug: "gamma-broker", rating: 4.0, asx_fee: "$15", us_fee: "$8" },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))             // quiz_leads
      .mockReturnValueOnce(
        makeBuilder({ data: [{ drip_type: "quiz_followup_1" }], error: null }),   // sentDrips (drip_1 sent)
      )
      .mockReturnValueOnce(makeBuilder({ data: topBroker, error: null }))          // brokers top match
      .mockReturnValueOnce(makeBuilder({ data: runnerUps, error: null }))          // brokers runner-ups
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));              // insert quiz_follow_ups

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockQuizFollowUp2Email).toHaveBeenCalledWith(
      "Test User",
      expect.arrayContaining([
        expect.objectContaining({ name: "Acme Broker" }),
        expect.objectContaining({ name: "Beta Broker" }),
      ]),
      "asx",
    );
    const sentResult = body.results.find((r: { action: string }) => r.action === "sent");
    expect(sentResult?.detail).toContain("quiz_followup_2");
  });

  it("sends drip_2 even when top match broker is not found (runners-up only)", async () => {
    // top_match_slug null → skip top-match lookup, still fetch runner-ups
    const lead = leadAge(5, { top_match_slug: null });
    const runnerUps = [
      { name: "Beta Broker", slug: "beta-broker", rating: 4.2, asx_fee: "$12", us_fee: "$7" },
    ];

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({ data: [{ drip_type: "quiz_followup_1" }], error: null }),
      )
      // no top-match broker lookup since top_match_slug is null
      .mockReturnValueOnce(makeBuilder({ data: runnerUps, error: null }))  // runner-ups
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));      // insert

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockQuizFollowUp2Email).toHaveBeenCalledWith(
      "Test User",
      expect.arrayContaining([expect.objectContaining({ name: "Beta Broker" })]),
      "asx",
    );
  });

  it("records error for drip_2 when no brokers found at all", async () => {
    // top_match_slug null and no runner-ups → brokersList.length === 0 → throws
    const lead = leadAge(5, { top_match_slug: null });

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({ data: [{ drip_type: "quiz_followup_1" }], error: null }),
      )
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));  // runner-ups empty

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    const errorResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "error" && r.detail.includes("No brokers found for comparison"),
    );
    expect(errorResult).toBeDefined();
  });

  // ── drip 3 success path ───────────────────────────────────────────

  it("sends drip_3 email on day 8 with active deal", async () => {
    // deal=true, deal_text set, deal_expiry in the future
    const lead = leadAge(8);
    const broker = {
      name: "Acme Broker",
      slug: "acme-broker",
      affiliate_url: "https://acme.com/signup",
      deal_text: "$50 bonus",
      deal: true,
      deal_expiry: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days from now
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [{ drip_type: "quiz_followup_1" }, { drip_type: "quiz_followup_2" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockQuizFollowUp3Email).toHaveBeenCalledWith(
      "Test User",
      expect.objectContaining({ name: "Acme Broker", deal_text: "$50 bonus" }),
      true,  // hasActiveDeal = true
    );
  });

  it("sends drip_3 email with hasActiveDeal=false when deal is expired", async () => {
    const lead = leadAge(8);
    const broker = {
      name: "Acme Broker",
      slug: "acme-broker",
      affiliate_url: "https://acme.com/signup",
      deal_text: "$50 bonus",
      deal: true,
      deal_expiry: new Date(Date.now() - 86400000).toISOString(), // yesterday → expired
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [{ drip_type: "quiz_followup_1" }, { drip_type: "quiz_followup_2" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockQuizFollowUp3Email).toHaveBeenCalledWith(
      "Test User",
      expect.anything(),
      false,  // hasActiveDeal = false (expired)
    );
  });

  it("sends drip_3 email with hasActiveDeal=false when deal is false", async () => {
    const lead = leadAge(8);
    const broker = {
      name: "Acme Broker",
      slug: "acme-broker",
      affiliate_url: null,
      deal_text: null,
      deal: false,
      deal_expiry: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [{ drip_type: "quiz_followup_1" }, { drip_type: "quiz_followup_2" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    expect(mockQuizFollowUp3Email).toHaveBeenCalledWith(
      "Test User",
      expect.anything(),
      false,
    );
  });

  it("records error when broker not found for drip_3", async () => {
    const lead = leadAge(8);

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [{ drip_type: "quiz_followup_1" }, { drip_type: "quiz_followup_2" }],
          error: null,
        }),
      )
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));  // broker not found

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    const errorResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "error" && r.detail.includes("Broker not found"),
    );
    expect(errorResult).toBeDefined();
  });

  // ── RESEND not set → "recorded" not "sent" ────────────────────────

  it("records drip without sending when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: 4.5,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
    const recordedResult = body.results.find((r: { action: string }) => r.action === "recorded");
    expect(recordedResult?.detail).toContain("email skipped (no API key");
  });

  // ── Resend API returns non-ok status ──────────────────────────────

  it("increments errors and records email_error when Resend returns non-ok status", async () => {
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: null,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => "Invalid email address",
    });

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    const errorResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "email_error" && r.detail.includes("422"),
    );
    expect(errorResult).toBeDefined();
    expect(errorResult?.detail).toContain("Invalid email address");
  });

  // ── Resend fetch throws ────────────────────────────────────────────

  it("increments errors and records email_error when fetch throws", async () => {
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: null,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFetch.mockRejectedValueOnce(new Error("network timeout"));

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    const errorResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "email_error" && r.detail.includes("network timeout"),
    );
    expect(errorResult).toBeDefined();
  });

  // ── DB insert unique constraint (23505) → already recorded ─────────

  it("records skipped entry when insert returns 23505 duplicate key error", async () => {
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: null,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(
        makeBuilder({ data: null, error: { code: "23505", message: "duplicate key" } }),
      );

    const res = await GET(authedReq());
    const body = await res.json();
    // email was sent (fetch ok), but insert returned 23505 → skipped
    expect(body.skipped).toBe(1);
    // emails_sent is NOT incremented because we hit the insertErr path before counting
    expect(body.emails_sent).toBe(0);
    const skippedResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "skipped" && r.detail.includes("Already recorded"),
    );
    expect(skippedResult).toBeDefined();
  });

  // ── DB insert other error → db_error ─────────────────────────────

  it("records db_error and increments errors on non-duplicate insert failure", async () => {
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: null,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(
        makeBuilder({ data: null, error: { code: "42P01", message: "table does not exist" } }),
      );

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    const dbErrorResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "db_error" && r.detail.includes("table does not exist"),
    );
    expect(dbErrorResult).toBeDefined();
  });

  // ── Only one drip per lead per run ────────────────────────────────

  it("sends only one drip per lead per cron run (sentOneThisRun break)", async () => {
    // Day 9 lead with no drips sent yet. drip_1 is eligible, fires, then breaks.
    // Even though drip_2 and drip_3 are also eligible, only drip_1 is sent.
    const lead = leadAge(9);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: 4.5,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))  // quiz_leads
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))       // sentDrips (none sent)
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))  // broker for drip_1
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));   // insert drip_1

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(1);
    // Only one result entry with "quiz_followup_1", not drip_2 or drip_3
    const sentResults = body.results.filter((r: { action: string; detail: string }) => r.action === "sent");
    expect(sentResults).toHaveLength(1);
    expect(sentResults[0].detail).toContain("quiz_followup_1");
  });

  // ── Multiple leads in one run ─────────────────────────────────────

  it("processes multiple leads in a single cron run", async () => {
    const lead1 = leadAge(3, { email: "lead1@example.com", top_match_slug: "acme-broker" });
    const lead2 = leadAge(2, { email: "lead2@example.com", top_match_slug: "beta-broker" });
    const broker1 = {
      name: "Acme Broker", slug: "acme-broker", rating: 4.5,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };
    const broker2 = {
      name: "Beta Broker", slug: "beta-broker", rating: 4.2,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead1, lead2], error: null }))   // quiz_leads
      // Lead 1: sentDrips, brokers, insert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))                // sentDrips lead1
      .mockReturnValueOnce(makeBuilder({ data: broker1, error: null }))          // broker for lead1
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))             // insert lead1
      // Lead 2: sentDrips, brokers, insert
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))               // sentDrips lead2
      .mockReturnValueOnce(makeBuilder({ data: broker2, error: null }))          // broker for lead2
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));            // insert lead2

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.emails_sent).toBe(2);
    expect(body.leads_processed).toBe(2);
  });

  // ── "All drips sent" catch-all when no drip was sent ─────────────

  it("records 'All drips sent' when all drips are already sent", async () => {
    // Day 10, all three drips already sent
    const lead = leadAge(10);

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            { drip_type: "quiz_followup_1" },
            { drip_type: "quiz_followup_2" },
            { drip_type: "quiz_followup_3" },
          ],
          error: null,
        }),
      );

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.emails_sent).toBe(0);
    const skippedResult = body.results.find(
      (r: { action: string; detail: string }) =>
        r.action === "skipped" && r.detail.includes("All drips sent"),
    );
    expect(skippedResult).toBeDefined();
  });

  it("response includes correct leads_processed count and timestamp", async () => {
    const lead = leadAge(3);
    const broker = {
      name: "Acme Broker", slug: "acme-broker", rating: null,
      asx_fee: null, us_fee: null, chess_sponsored: null, pros: null, tagline: null,
    };

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [lead], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: broker, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.leads_processed).toBe(1);
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp as string).getFullYear()).toBeGreaterThan(2020);
  });
});
