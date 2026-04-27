import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

// ── Module-level mock state ───────────────────────────────────────────────────

let quizLeadsInsertError: { message: string } | null = null;
let emailCapturesUpsertError: { message: string } | null = null;
const quizLeadsInsertCalls: Record<string, unknown>[] = [];
let authUser: { id: string } | null = null;

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn((table: string) => {
  if (table === "quiz_leads") {
    return {
      insert: vi.fn((row: Record<string, unknown>) => {
        quizLeadsInsertCalls.push(row);
        const error = quizLeadsInsertError;
        return {
          then(
            cb: (v: {
              data: null;
              error: typeof error;
              count: number;
            }) => void,
            _rej?: unknown,
          ) {
            cb({ data: null, error, count: 0 });
            return Promise.resolve();
          },
        };
      }),
    };
  }

  if (table === "email_captures") {
    return {
      upsert: vi.fn(() => {
        const error = emailCapturesUpsertError;
        return {
          then(
            cb: (v: {
              data: null;
              error: typeof error;
              count: number;
            }) => void,
            _rej?: unknown,
          ) {
            cb({ data: null, error, count: 0 });
            return Promise.resolve();
          },
        };
      }),
    };
  }

  // brokers — queried inside sendQuizResultsEmail (fire-and-forget, only when RESEND_API_KEY is set)
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
      cb({ data: [], error: null });
      return Promise.resolve();
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// createClient is async; returns a client whose auth.getUser() reads authUser
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: authUser }, error: null }),
        ),
      },
    }),
  ),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn().mockResolvedValue(true),
  ipKey: vi.fn(() => "test-ip"),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: vi.fn(() => true),
  isDisposableEmail: vi.fn(() => false),
}));

vi.mock("@/lib/quiz-history", () => ({
  recordQuizSubmission: vi.fn().mockResolvedValue(1),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Import after all mocks
import { POST } from "@/app/api/quiz-lead/route";
import { isAllowed } from "@/lib/rate-limit-db";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { recordQuizSubmission } from "@/lib/quiz-history";

// ── Helpers ───────────────────────────────────────────────────────────────────

function quizRequest(
  body: Record<string, unknown>,
  ip = "20.0.0.1",
): ReturnType<typeof makeRequest> {
  return makeRequest("/api/quiz-lead", body, { ip });
}

const VALID_BODY = {
  email: "user@example.com",
  name: "Alex Smith",
  answers: ["grow", "beginner", "small"],
  top_match_slug: "stake",
  session_id: "sess-abc-123",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/quiz-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quizLeadsInsertCalls.length = 0;
    quizLeadsInsertError = null;
    emailCapturesUpsertError = null;
    authUser = null;

    // Restore defaults after clearAllMocks
    (isAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (isValidEmail as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (isDisposableEmail as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (recordQuizSubmission as ReturnType<typeof vi.fn>).mockResolvedValue(1);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Input validation ─────────────────────────────────────────────────────

  it("returns 400 for invalid JSON body", async () => {
    const req = new (await import("next/server")).NextRequest(
      "http://localhost/api/quiz-lead",
      {
        method: "POST",
        body: "not-json{{{",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "20.0.0.99",
        },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 for invalid email", async () => {
    (isValidEmail as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(quizRequest({ ...VALID_BODY, email: "not-an-email" }, "20.0.0.2"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for missing email", async () => {
    (isValidEmail as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(quizRequest({ answers: ["grow"] }, "20.0.0.3"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 for disposable email", async () => {
    (isDisposableEmail as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const res = await POST(quizRequest({ ...VALID_BODY, email: "x@mailinator.com" }, "20.0.0.4"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/real email/i);
  });

  it("returns 429 when rate limited", async () => {
    (isAllowed as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await POST(quizRequest(VALID_BODY, "20.0.0.5"));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // ── DB error path ────────────────────────────────────────────────────────

  it("returns 500 when quiz_leads insert fails", async () => {
    quizLeadsInsertError = { message: "unique violation" };
    const res = await POST(quizRequest({ ...VALID_BODY, session_id: undefined }, "20.0.0.6"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // ── Happy path — DB fields ───────────────────────────────────────────────

  it("returns 200 and writes quiz_leads row with correct sanitized fields", async () => {
    const res = await POST(quizRequest({
      email: "  USER@Example.COM  ",
      name: "  Alex  ",
      answers: ["grow", "beginner", "small"],
      top_match_slug: "stake",
    }, "20.0.0.7"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(quizLeadsInsertCalls).toHaveLength(1);
    const row = quizLeadsInsertCalls[0];
    expect(row).toMatchObject({
      email: "user@example.com",
      name: "Alex",
      top_match_slug: "stake",
    });
  });

  it("maps experience, investment and interest answers to human-readable labels", async () => {
    await POST(quizRequest({
      email: "a@example.com",
      answers: ["pro", "whale", "income"],
    }, "20.0.0.8"));

    expect(quizLeadsInsertCalls).toHaveLength(1);
    const row = quizLeadsInsertCalls[0];
    expect(row).toMatchObject({
      experience_level: "Advanced",
      investment_range: "$100,000+",
      trading_interest: "Dividend Income",
    });
  });

  it("stores null for answer fields when no matching answers supplied", async () => {
    await POST(quizRequest({
      email: "b@example.com",
      answers: ["unknown-answer"],
    }, "20.0.0.9"));

    const row = quizLeadsInsertCalls[0];
    expect(row).toMatchObject({
      experience_level: null,
      investment_range: null,
      trading_interest: null,
    });
  });

  // ── quiz-history recording ──────────────────────────────────────────────

  it("does not call recordQuizSubmission when no session_id and user unauthenticated", async () => {
    authUser = null;
    await POST(quizRequest({ email: "c@example.com", answers: [] }, "20.0.1.1"));
    expect(recordQuizSubmission).not.toHaveBeenCalled();
  });

  it("calls recordQuizSubmission with sessionId when session_id provided (unauthenticated)", async () => {
    authUser = null;
    await POST(quizRequest({
      email: "d@example.com",
      answers: ["grow"],
      session_id: "anon-sess-xyz",
      top_match_slug: "commsec",
    }, "20.0.1.2"));
    expect(recordQuizSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "anon-sess-xyz", userId: null }),
    );
  });

  it("calls recordQuizSubmission with userId when user is authenticated", async () => {
    authUser = { id: "user-uuid-abc" };
    await POST(quizRequest({
      email: "e@example.com",
      answers: ["grow"],
      session_id: "some-sess",
    }, "20.0.1.3"));
    expect(recordQuizSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-uuid-abc" }),
    );
  });

  // ── Non-blocking side effects ─────────────────────────────────────────────

  it("still returns 200 when email_captures upsert fails (non-blocking)", async () => {
    emailCapturesUpsertError = { message: "constraint violation" };
    const res = await POST(quizRequest({ email: "f@example.com" }, "20.0.1.4"));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("still returns 200 when recordQuizSubmission throws (non-blocking)", async () => {
    (recordQuizSubmission as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("history insert failed"),
    );
    const res = await POST(quizRequest({
      email: "g@example.com",
      session_id: "sess-err",
    }, "20.0.1.5"));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("still returns 200 when Resend fetch throws (fire-and-forget path)", async () => {
    const origKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "test-resend-key";
    const mockFetch = vi.fn().mockRejectedValue(new Error("Resend network error"));
    vi.stubGlobal("fetch", mockFetch);

    try {
      const res = await POST(quizRequest({
        email: "h@example.com",
        answers: ["grow"],
        top_match_slug: "stake",
      }, "20.0.1.6"));
      // Let any pending fire-and-forget microtasks settle
      await new Promise((r) => setTimeout(r, 0));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    } finally {
      process.env.RESEND_API_KEY = origKey;
      vi.unstubAllGlobals();
    }
  });

  // ── Input sanitization ───────────────────────────────────────────────────

  it("sanitizes non-string name to null in quiz_leads row", async () => {
    await POST(quizRequest({
      email: "i@example.com",
      name: 12345,
      answers: [],
    }, "20.0.1.7"));

    const row = quizLeadsInsertCalls[0];
    expect(row).toMatchObject({ name: null });
  });

  it("truncates answers array to max 10 items", async () => {
    const manyAnswers = Array.from({ length: 15 }, (_, i) => `item-${i}`);
    await POST(quizRequest({
      email: "j@example.com",
      answers: manyAnswers,
    }, "20.0.1.8"));

    const row = quizLeadsInsertCalls[0];
    expect((row as { answers: unknown[] }).answers).toHaveLength(10);
  });
});
