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
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { POST } from "@/app/api/exit-intent-log/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_BODY = {
  variant: "email-capture",
  action: "shown",
  session_id: "sess-abc-123",
  page_path: "/smsf",
};

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/exit-intent-log", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeInsertChain(error: unknown = null) {
  return {
    insert: vi.fn().mockResolvedValue({ error }),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/exit-intent-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeInsertChain());
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 400 when variant is missing", async () => {
    const { variant: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is not in the allowlist", async () => {
    const res = await POST(makePost({ ...VALID_BODY, action: "hacked" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is missing", async () => {
    const { action: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 200 success and inserts hashed session_id", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockAdminFrom.mockReturnValue({ insert: insertMock });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    const inserted = insertMock.mock.calls[0][0];
    expect(inserted.modal_variant).toBe("email-capture");
    expect(inserted.action).toBe("shown");
    // session_hash must be present and truncated to 32 chars (not raw session_id)
    expect(inserted.session_hash).toBeTruthy();
    expect(inserted.session_hash).not.toBe(VALID_BODY.session_id);
    expect(inserted.session_hash.length).toBe(32);
  });

  it("passes null session_hash when session_id is absent", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    mockAdminFrom.mockReturnValue({ insert: insertMock });
    const { session_id: _, ...body } = VALID_BODY;
    const res = await POST(makePost(body));
    expect(res.status).toBe(200);
    const inserted = insertMock.mock.calls[0][0];
    expect(inserted.session_hash).toBeNull();
  });

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeInsertChain({ message: "constraint violation" })
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("accepts all valid action values", async () => {
    const validActions = ["shown", "dismissed", "converted_subscribe", "converted_quiz"];
    for (const action of validActions) {
      const res = await POST(makePost({ ...VALID_BODY, action }));
      expect(res.status).toBe(200);
    }
  });
});
