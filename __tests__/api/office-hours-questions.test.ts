import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockIsRateLimited: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const USER = { id: "user-uuid-1", email: "alice@example.com" };

// We test the questions route POST handler
function makeReq(sessionId: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/office-hours/${sessionId}/questions`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Helper chain builders ──────────────────────────────────────────────────────

function makeSelectSingleChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeSelectOrderChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeProfileChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/office-hours/[id]/questions", () => {
  // Import dynamically after mocks are set
  let GET: typeof import("@/app/api/office-hours/[id]/questions/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ GET } = await import("@/app/api/office-hours/[id]/questions/route"));
  });

  it("returns 400 for non-integer session id", async () => {
    const req = new NextRequest("http://localhost/api/office-hours/abc/questions");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns questions list for valid session", async () => {
    const questions = [
      { id: 1, session_id: 5, display_name: "Alice", question: "What is ETF?", is_anonymous: false, answer: null, answered_at: null, upvote_count: 3, created_at: "2026-01-01T10:00:00Z" },
    ];
    mockFrom.mockReturnValueOnce(makeSelectOrderChain({ data: questions, error: null }));
    const req = new NextRequest("http://localhost/api/office-hours/5/questions");
    const res = await GET(req, { params: Promise.resolve({ id: "5" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.questions).toHaveLength(1);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/office-hours/[id]/questions", () => {
  let POST: typeof import("@/app/api/office-hours/[id]/questions/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ POST } = await import("@/app/api/office-hours/[id]/questions/route"));
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const req = makeReq("5", "POST", { question: "What is super?", is_anonymous: false });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when question is too short", async () => {
    const req = makeReq("5", "POST", { question: "Hi", is_anonymous: false });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when question is missing", async () => {
    const req = makeReq("5", "POST", { is_anonymous: false });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(true);
    const req = makeReq("5", "POST", { question: "What is negative gearing?", is_anonymous: false });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 404 when session not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(false);
    mockFrom.mockReturnValueOnce(makeSelectSingleChain({ data: null, error: null }));
    const req = makeReq("5", "POST", { question: "What is negative gearing?", is_anonymous: false });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 409 when session status is ended", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(false);
    mockFrom.mockReturnValueOnce(
      makeSelectSingleChain({ data: { id: 5, status: "ended", max_questions: 20, is_published: true }, error: null }),
    );
    const req = makeReq("5", "POST", { question: "What is negative gearing?", is_anonymous: false });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 201 on successful question submission", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(false);

    const session = { id: 5, status: "live", max_questions: 20, is_published: true };
    mockFrom
      .mockReturnValueOnce(makeSelectSingleChain({ data: session, error: null })) // session fetch
      .mockReturnValueOnce({ // count fetch
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: 0, error: null })),
          })),
        })),
      })
      .mockReturnValueOnce(makeProfileChain({ data: { display_name: "Alice", first_name: "Alice" } })) // profile
      .mockReturnValueOnce(makeInsertChain({ // insert
        data: { id: 10, session_id: 5, display_name: "Alice", question: "What is negative gearing?", is_anonymous: false, upvote_count: 0, created_at: "2026-01-01T10:00:00Z" },
        error: null,
      }));

    const req = makeReq("5", "POST", { question: "What is negative gearing?", is_anonymous: false });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session_id).toBe(5);
  });
});
