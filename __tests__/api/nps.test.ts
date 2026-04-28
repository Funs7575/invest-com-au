import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/nps/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/nps", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "TestBrowser/1.0",
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  respondent_type: "user",
  trigger: "post_lead",
  score: 8,
  comment: "Great service!",
  respondent_id: "user-123",
  session_id: "sess-abc",
};

function makeChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => c);
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/nps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeChain({ error: null }));
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limit exceeded", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when respondent_type is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, respondent_type: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when respondent_type is not in allowed list", async () => {
    const res = await POST(makePost({ ...VALID_BODY, respondent_type: "admin" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when trigger is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, trigger: undefined }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when score is below 0", async () => {
    const res = await POST(makePost({ ...VALID_BODY, score: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when score is above 10", async () => {
    const res = await POST(makePost({ ...VALID_BODY, score: 11 }));
    expect(res.status).toBe(400);
  });

  it("accepts score = 0 (boundary valid)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, score: 0 }));
    expect(res.status).toBe(200);
  });

  it("accepts score = 10 (boundary valid)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, score: 10 }));
    expect(res.status).toBe(200);
  });

  // ── respondent_type allowed values ────────────────────────────────────────

  it("accepts all valid respondent_type values", async () => {
    for (const respondent_type of ["user", "advisor", "broker"]) {
      vi.clearAllMocks();
      mockIsAllowed.mockResolvedValue(true);
      mockAdminFrom.mockReturnValue(makeChain({ error: null }));
      const res = await POST(makePost({ ...VALID_BODY, respondent_type }));
      expect(res.status).toBe(200);
    }
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with ok=true on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("inserts into nps_responses with correct fields", async () => {
    await POST(makePost(VALID_BODY));
    const insertChain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const inserted = insertChain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted.respondent_type).toBe("user");
    expect(inserted.trigger).toBe("post_lead");
    expect(inserted.score).toBe(8);
    expect(inserted.comment).toBe("Great service!");
    expect(inserted.respondent_id).toBe("user-123");
    expect(inserted.session_id).toBe("sess-abc");
    expect(typeof inserted.ip_hash).toBe("string");
    expect((inserted.ip_hash as string).length).toBeLessThanOrEqual(32);
    expect(typeof inserted.user_agent).toBe("string");
  });

  it("truncates respondent_id to 200 chars", async () => {
    const longId = "X".repeat(300);
    await POST(makePost({ ...VALID_BODY, respondent_id: longId }));
    const insertChain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const inserted = insertChain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect((inserted.respondent_id as string).length).toBeLessThanOrEqual(200);
  });

  it("truncates comment to 2000 chars", async () => {
    const longComment = "C".repeat(2500);
    await POST(makePost({ ...VALID_BODY, comment: longComment }));
    const insertChain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const inserted = insertChain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect((inserted.comment as string).length).toBeLessThanOrEqual(2000);
  });

  it("sets respondent_id to null when not a string", async () => {
    await POST(makePost({ ...VALID_BODY, respondent_id: 999 }));
    const insertChain = mockAdminFrom.mock.results[0].value as { insert: ReturnType<typeof vi.fn> };
    const inserted = insertChain.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted.respondent_id).toBeNull();
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ error: { message: "insert failed" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("insert_failed");
  });
});
