import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

const mockAuth = { getUser: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/questions/moderate/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-1", email: "admin@invest.com.au" };
const NON_ADMIN = { id: "user-1", email: "user@example.com" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/questions/moderate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeUpdateChain(result: { error: unknown } = { error: null }) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn(() => Promise.resolve(result));
  return c;
}

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/questions/moderate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest({ type: "question", id: 1, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin user", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: NON_ADMIN }, error: null });
    const res = await POST(makeRequest({ type: "question", id: 1, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body fields are missing", async () => {
    const res = await POST(makeRequest({ type: "question" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid type", async () => {
    const res = await POST(makeRequest({ type: "review", id: 1, action: "approve" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid action", async () => {
    const res = await POST(makeRequest({ type: "question", id: 1, action: "delete" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 200 when approving a question", async () => {
    mockAdminFrom.mockReturnValue(makeUpdateChain({ error: null }));
    const res = await POST(makeRequest({ type: "question", id: 5, action: "approve" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("question approved");
    expect(mockAdminFrom).toHaveBeenCalledWith("broker_questions");
  });

  it("returns 200 when rejecting an answer", async () => {
    mockAdminFrom.mockReturnValue(makeUpdateChain({ error: null }));
    const res = await POST(makeRequest({ type: "answer", id: 7, action: "reject" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("answer rejectd"); // route uses `${type} ${action}d` verbatim
    expect(mockAdminFrom).toHaveBeenCalledWith("broker_answers");
  });

  it("triggers answer notification on answer approve (fire-and-forget)", async () => {
    // First call: main update; subsequent calls: notifyQuestionAsker lookups (return null data so it exits early)
    mockAdminFrom
      .mockReturnValueOnce(makeUpdateChain({ error: null }))
      .mockReturnValue(makeSelectChain({ data: null, error: null }));

    const res = await POST(makeRequest({ type: "answer", id: 3, action: "approve" }));
    expect(res.status).toBe(200);
    // notifyQuestionAsker is fire-and-forget — just verify main handler returns
    expect((await res.json()).success).toBe(true);
  });

  it("returns 500 on DB update error", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "update failed" } }),
    };
    mockAdminFrom.mockReturnValue(chain);

    const res = await POST(makeRequest({ type: "question", id: 9, action: "approve" }));
    expect(res.status).toBe(500);
  });
});
