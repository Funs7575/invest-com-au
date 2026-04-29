import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { PATCH } from "@/app/api/admin/review-moderation/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/review-moderation", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuth(email: string | null = "admin@test.com", authError = false) {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: authError ? { message: "auth_error" } : null,
  });
}

function setupPatchMock(opts: {
  updateError?: { message: string } | null;
  reviews?: { professional_id: number }[];
} = {}) {
  const { updateError = null, reviews = [] } = opts;
  mockFrom.mockImplementation((table: string) => {
    if (table === "professional_reviews") {
      return {
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockImplementation(() => {
          if (updateError) return Promise.resolve({ error: updateError });
          return Promise.resolve({ error: null, data: reviews });
        }),
        eq: vi.fn().mockReturnThis(),
        // For the avg query after approve
        mockReturnThis() { return this; },
      };
    }
    if (table === "professionals") {
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/review-moderation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when auth error", async () => {
    setupAuth(null, true);
    const res = await PATCH(makePatch({ ids: [1], action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when user is not in ADMIN_EMAILS", async () => {
    setupAuth("notadmin@test.com");
    const res = await PATCH(makePatch({ ids: [1], action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when ids is missing", async () => {
    setupAuth();
    const res = await PATCH(makePatch({ action: "approve" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/ids/i);
  });

  it("returns 400 when ids array is empty", async () => {
    setupAuth();
    const res = await PATCH(makePatch({ ids: [], action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is invalid", async () => {
    setupAuth();
    const res = await PATCH(makePatch({ ids: [1, 2], action: "delete" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/approve.*reject.*flag/i);
  });

  it("returns 200 when rejecting reviews", async () => {
    setupAuth();
    setupPatchMock();
    const res = await PATCH(makePatch({ ids: [3, 4], action: "reject" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/rejected/i);
  });

  it("returns 200 when flagging reviews", async () => {
    setupAuth();
    setupPatchMock();
    const res = await PATCH(makePatch({ ids: [5], action: "flag" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/flagged/i);
  });

  it("returns 500 on DB update error", async () => {
    setupAuth();
    setupPatchMock({ updateError: { message: "update_failed" } });
    const res = await PATCH(makePatch({ ids: [1], action: "reject" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/update_failed/);
  });

  it("writes audit log on success", async () => {
    setupAuth();
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "professional_reviews") {
        return {
          update: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ error: null, data: [] }),
        };
      }
      if (table === "admin_audit_log") {
        return { insert: auditInsert };
      }
      return {};
    });
    await PATCH(makePatch({ ids: [10, 11], action: "reject" }));
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "professional_review:rejected",
        entity_type: "professional_review",
      })
    );
  });
});
