import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: (_email: string) => "<footer>unsubscribe</footer>",
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s,
}));

const mockIsRateLimited = vi.hoisted(() => vi.fn<() => Promise<boolean>>().mockResolvedValue(false));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Server Supabase client
const mockAuth = { getUser: vi.fn() };
const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: mockAuth,
    from: mockServerFrom,
  })),
}));

import { POST } from "@/app/api/questions/[id]/answer/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const AUTHED_USER = { id: "user-1", email: "user@example.com" };

function makeRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/questions/${id}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue(result),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/questions/[id]/answer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockAuth.getUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    mockFetch.mockResolvedValue({ ok: true });
    delete process.env.RESEND_API_KEY;
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeRequest("5", { answer: "A valid answer text here" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many/i);
  });

  it("returns 400 for non-numeric question ID", async () => {
    const res = await POST(makeRequest("abc", { answer: "A valid answer text here" }), {
      params: Promise.resolve({ id: "abc" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid question ID/i);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeRequest("5", { answer: "A valid answer text here" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Sign in required/i);
  });

  it("returns 400 when answer is too short", async () => {
    const res = await POST(makeRequest("5", { answer: "Short" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/at least 10/i);
  });

  it("returns 400 when answer exceeds 2000 characters", async () => {
    const longAnswer = "a".repeat(2001);
    const res = await POST(makeRequest("5", { answer: longAnswer }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/under 2000/i);
  });

  it("returns 404 when question does not exist", async () => {
    // broker_accounts → no result, professionals → no result, question → not found
    const noRowChain = makeChain({ data: null });
    const notFoundQ = { data: null, error: { message: "not found" } };
    const notFoundChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(notFoundQ),
    };
    mockServerFrom
      .mockReturnValueOnce(noRowChain)   // broker_accounts
      .mockReturnValueOnce(noRowChain)   // professionals
      .mockReturnValueOnce(notFoundChain); // broker_questions
    const res = await POST(makeRequest("5", { answer: "A valid answer text here" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("returns 200 as community user (no broker/advisor account)", async () => {
    const noRowChain = makeChain({ data: null });
    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 5, status: "active" } }),
    };
    const insertChain = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockServerFrom
      .mockReturnValueOnce(noRowChain)     // broker_accounts
      .mockReturnValueOnce(noRowChain)     // professionals
      .mockReturnValueOnce(questionChain)  // broker_questions select
      .mockReturnValueOnce(insertChain);   // broker_answers insert
    const res = await POST(makeRequest("5", { answer: "A valid answer text here and more!" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ answered_by: "community", author_slug: null })
    );
  });

  it("answers as broker role when user has active broker account", async () => {
    const brokerChain = makeChain({ data: { broker_slug: "cmc-markets", status: "active" } });
    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 5, status: "active" } }),
    };
    const insertChain = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockServerFrom
      .mockReturnValueOnce(brokerChain)    // broker_accounts
      .mockReturnValueOnce(questionChain)  // broker_questions select
      .mockReturnValueOnce(insertChain);   // broker_answers insert
    const res = await POST(makeRequest("5", { answer: "A valid answer text here and more!" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(200);
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ answered_by: "broker", author_slug: "cmc-markets" })
    );
  });

  it("answers as advisor role when user has active professional account", async () => {
    const noRowChain = makeChain({ data: null }); // no broker account
    const advisorChain = makeChain({ data: { slug: "jane-smith-cfp", status: "active" } });
    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 5, status: "active" } }),
    };
    const insertChain = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockServerFrom
      .mockReturnValueOnce(noRowChain)     // broker_accounts
      .mockReturnValueOnce(advisorChain)   // professionals
      .mockReturnValueOnce(questionChain)  // broker_questions select
      .mockReturnValueOnce(insertChain);   // broker_answers insert
    const res = await POST(makeRequest("5", { answer: "A valid answer text here and more!" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(200);
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ answered_by: "advisor", author_slug: "jane-smith-cfp" })
    );
  });

  it("returns 500 on insert error", async () => {
    const noRowChain = makeChain({ data: null });
    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 5, status: "active" } }),
    };
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
    };
    mockServerFrom
      .mockReturnValueOnce(noRowChain)
      .mockReturnValueOnce(noRowChain)
      .mockReturnValueOnce(questionChain)
      .mockReturnValueOnce(insertChain);
    const res = await POST(makeRequest("5", { answer: "A valid answer text here and more!" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to submit/i);
  });

  it("sends notification email on success when RESEND_API_KEY set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const noRowChain = makeChain({ data: null });
    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 5, status: "active" } }),
    };
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };
    const emailQuestionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          asker_email: "asker@example.com",
          asker_name: "Bob",
          question: "What fees does CommSec charge?",
          broker_slug: "commsec",
          brokers: [{ name: "CommSec" }],
        },
      }),
    };
    mockServerFrom
      .mockReturnValueOnce(noRowChain)
      .mockReturnValueOnce(noRowChain)
      .mockReturnValueOnce(questionChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(emailQuestionChain);
    await POST(makeRequest("5", { answer: "CommSec charges $29.95 per trade for up to $1000 in value." }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(mockFetch).toHaveBeenCalled();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("resend.com");
  });

  it("does not send email when RESEND_API_KEY is not set", async () => {
    const noRowChain = makeChain({ data: null });
    const questionChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 5, status: "active" } }),
    };
    const insertChain = { insert: vi.fn().mockResolvedValue({ error: null }) };
    mockServerFrom
      .mockReturnValueOnce(noRowChain)
      .mockReturnValueOnce(noRowChain)
      .mockReturnValueOnce(questionChain)
      .mockReturnValueOnce(insertChain);
    await POST(makeRequest("5", { answer: "A valid answer text here and more!" }), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
