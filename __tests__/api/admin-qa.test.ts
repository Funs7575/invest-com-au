import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockRespondToMessage = vi.fn();
vi.mock("@/lib/chatbot", () => ({
  respondToMessage: (...args: unknown[]) => mockRespondToMessage(...args),
}));

const mockPreCheckCaps = vi.fn();
const mockRecordUsage = vi.fn();
vi.mock("@/lib/ai-cost-caps", () => ({
  loadQaCaptureConfig: vi.fn(() => ({ route: "qa_capture" })),
  preCheckCaps: (...args: unknown[]) => mockPreCheckCaps(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
}));

import { GET } from "@/app/api/admin/qa/route";
import { POST } from "@/app/api/admin/qa/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-1", email: "admin@invest.com.au" };
const NON_ADMIN = { id: "user-99", email: "rando@example.com" };

function makeGet() {
  return new NextRequest("http://localhost/api/admin/qa", { method: "GET" });
}

function makePost(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/admin/qa/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id = "42") {
  return { params: Promise.resolve({ id }) };
}

function makeAdminChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "update", "insert", "upsert", "maybeSingle", "single"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.single = vi.fn(() => Promise.resolve(result));
  (c.limit as ReturnType<typeof vi.fn>).mockResolvedValue(result);
  return c;
}

const SAMPLE_QUESTION = { id: 42, slug: "qqq123abc", question_text: "How do ETFs work in Australia?", category: "managed_funds", status: "pending" };

// ── GET /api/admin/qa ──────────────────────────────────────────────────────────

describe("GET /api/admin/qa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated request", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: NON_ADMIN }, error: null });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns pending questions for admin user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const chain = makeAdminChain({ data: [SAMPLE_QUESTION], error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as { questions: typeof SAMPLE_QUESTION[] };
    expect(Array.isArray(body.questions)).toBe(true);
  });

  it("returns 500 on DB error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const chain = makeAdminChain({ data: null, error: { message: "db failure" } });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});

// ── POST /api/admin/qa/[id] ────────────────────────────────────────────────────

describe("POST /api/admin/qa/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRespondToMessage.mockResolvedValue({
      reply: "ETFs pool money from many investors to buy a diversified set of assets.",
      model: "claude-haiku-4-5-20251001",
      tokensIn: 100,
      tokensOut: 150,
      flagged: false,
      flaggedReason: null,
      provider: "claude",
      retrieved: [],
    });
    mockPreCheckCaps.mockResolvedValue({ allowed: true });
    mockRecordUsage.mockResolvedValue({ subjectMicros: 1000, crossed80Subject: false });
  });

  it("returns 401 for unauthenticated request", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost("42", { action: "generate_draft" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makePost("abc", { action: "generate_draft" }), makeParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when question not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const chain = makeAdminChain({ data: null, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await POST(makePost("42", { action: "generate_draft" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("generate_draft: returns answer_id and answer_text", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const questionChain = makeAdminChain({ data: SAMPLE_QUESTION, error: null });
    const answerChain = makeAdminChain({ data: { id: 7, answer_text: "ETFs pool money..." }, error: null });
    mockAdminFrom
      .mockReturnValueOnce(questionChain)
      .mockReturnValueOnce(answerChain);
    const res = await POST(makePost("42", { action: "generate_draft" }), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json() as { answer_id: number; answer_text: string };
    expect(typeof body.answer_id).toBe("number");
    expect(typeof body.answer_text).toBe("string");
  });

  it("generate_draft: returns 429 when cost cap exceeded", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const questionChain = makeAdminChain({ data: SAMPLE_QUESTION, error: null });
    mockAdminFrom.mockReturnValue(questionChain);
    mockPreCheckCaps.mockResolvedValue({ allowed: false, reason: "global" });
    const res = await POST(makePost("42", { action: "generate_draft" }), makeParams());
    expect(res.status).toBe(429);
  });

  it("approve: updates question to approved and revalidates paths", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const qChain = makeAdminChain({ data: SAMPLE_QUESTION, error: null });
    const updateChain = makeAdminChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(qChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(updateChain);
    const res = await POST(
      makePost("42", { action: "approve", answer_text: "ETFs pool money...", answer_id: 7 }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; slug: string };
    expect(body.status).toBe("approved");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/answers");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/answers/${SAMPLE_QUESTION.slug}`);
  });

  it("reject: updates question to rejected", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const qChain = makeAdminChain({ data: SAMPLE_QUESTION, error: null });
    const updateChain = makeAdminChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(qChain)
      .mockReturnValueOnce(updateChain);
    const res = await POST(
      makePost("42", { action: "reject", moderation_note: "Off-topic spam" }),
      makeParams(),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("rejected");
  });

  it("reject: works without moderation_note", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const qChain = makeAdminChain({ data: SAMPLE_QUESTION, error: null });
    const updateChain = makeAdminChain({ error: null });
    mockAdminFrom
      .mockReturnValueOnce(qChain)
      .mockReturnValueOnce(updateChain);
    const res = await POST(makePost("42", { action: "reject" }), makeParams());
    expect(res.status).toBe(200);
  });
});
