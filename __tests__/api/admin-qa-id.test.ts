/**
 * Tests for POST /api/admin/qa/[id].
 *
 * Admin-only endpoint for managing Q&A questions. Auth: custom ADMIN_EMAILS
 * check via createClient().auth.getUser(). Supports three actions:
 * generate_draft (AI draft with cost-cap gate), approve, reject.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockAdminFrom,
  mockRespondToMessage,
  mockPreCheckCaps,
  mockRecordUsage,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockRespondToMessage: vi.fn(),
  mockPreCheckCaps: vi.fn(),
  mockRecordUsage: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: () => mockGetUser() } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/admin", () => ({ ADMIN_EMAILS: ["admin@test.com"] }));

vi.mock("@/lib/chatbot", () => ({
  respondToMessage: (...args: unknown[]) => mockRespondToMessage(...args),
}));

vi.mock("@/lib/ai-cost-caps", () => ({
  loadQaCaptureConfig: vi.fn(() => ({})),
  preCheckCaps: (...args: unknown[]) => mockPreCheckCaps(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/qa/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "user-1", email: "admin@test.com" };
const MOCK_QUESTION = { id: 1, slug: "what-is-etf", question_text: "What is an ETF?", status: "pending" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/qa/1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** Builder for .select().eq().maybeSingle() chain. */
function makeSelectBuilder(data: unknown, error: null | { message: string } = null) {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return b;
}

/** Builder for .update().eq()... chain that resolves to { error }. */
function makeUpdateBuilder(error: null | { message: string } = null) {
  const resolve = (r: (v: { error: unknown }) => void) => r({ error });
  const b = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (r: (v: { error: unknown }) => void) => { resolve(r); return Promise.resolve(); },
  };
  return b;
}

/** Builder for .insert().select().single() chain. */
function makeInsertSelectBuilder(data: unknown, error: null | { message: string } = null) {
  const b = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return b;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/qa/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
  });

  it("returns 401 when user is not in ADMIN_EMAILS", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "x", email: "random@user.com" } }, error: null });
    const res = await POST(makeReq({ action: "reject" }), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not numeric", async () => {
    // admin passes but id is invalid — no DB call needed
    const res = await POST(makeReq({ action: "reject" }), makeParams("not-a-number"));
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/invalid id/i);
  });

  it("returns 400 when action body is invalid", async () => {
    mockAdminFrom.mockReturnValue(makeSelectBuilder(MOCK_QUESTION));
    const res = await POST(makeReq({ action: "unknown_action" }), makeParams("1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when question is not found", async () => {
    mockAdminFrom.mockReturnValue(makeSelectBuilder(null));
    const res = await POST(makeReq({ action: "reject" }), makeParams("1"));
    expect(res.status).toBe(404);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/not found/i);
  });

  it("approve with answer_id returns 200 and calls revalidatePath", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeSelectBuilder(MOCK_QUESTION)) // question fetch
      .mockReturnValueOnce(makeUpdateBuilder())              // qa_answers update
      .mockReturnValueOnce(makeUpdateBuilder());             // qa_questions update

    const res = await POST(
      makeReq({ action: "approve", answer_text: "An ETF is an exchange traded fund.", answer_id: 42 }),
      makeParams("1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { status: string; slug: string };
    expect(data.status).toBe("approved");
    expect(data.slug).toBe("what-is-etf");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/answers");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/answers/what-is-etf");
  });

  it("reject action returns 200 with status=rejected", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeSelectBuilder(MOCK_QUESTION)) // question fetch
      .mockReturnValueOnce(makeUpdateBuilder());             // qa_questions update

    const res = await POST(
      makeReq({ action: "reject", moderation_note: "Off-topic" }),
      makeParams("1"),
    );
    expect(res.status).toBe(200);
    const data = await res.json() as { status: string };
    expect(data.status).toBe("rejected");
  });

  it("generate_draft returns 429 when cost cap is reached", async () => {
    mockAdminFrom.mockReturnValue(makeSelectBuilder(MOCK_QUESTION));
    mockPreCheckCaps.mockResolvedValue({ allowed: false });

    const res = await POST(makeReq({ action: "generate_draft" }), makeParams("1"));
    expect(res.status).toBe(429);
    const data = await res.json() as { error: string };
    expect(data.error).toMatch(/cost cap/i);
  });

  it("generate_draft returns 200 with answer on success", async () => {
    const mockAnswer = { id: 10, answer_text: "An ETF is a basket of securities." };

    mockAdminFrom
      .mockReturnValueOnce(makeSelectBuilder(MOCK_QUESTION))       // question fetch
      .mockReturnValueOnce(makeInsertSelectBuilder(mockAnswer));   // qa_answers insert

    mockPreCheckCaps.mockResolvedValue({ allowed: true });
    mockRespondToMessage.mockResolvedValue({
      reply: mockAnswer.answer_text,
      model: "claude-3",
      tokensIn: 100,
      tokensOut: 50,
    });

    const res = await POST(makeReq({ action: "generate_draft" }), makeParams("1"));
    expect(res.status).toBe(200);
    const data = await res.json() as { answer_id: number; answer_text: string };
    expect(data.answer_id).toBe(10);
    expect(data.answer_text).toBe(mockAnswer.answer_text);
  });
});
