import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockListPendingComments = vi.fn();
vi.mock("@/lib/article-comments", () => ({
  listPendingComments: () => mockListPendingComments(),
  setCommentStatus: (...args: unknown[]) => mockSetCommentStatus(...args),
}));
const mockSetCommentStatus = vi.fn();

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, PATCH } from "@/app/api/admin/article-comments/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@test.com", userId: "uid-1" };
const DENY_GUARD = {
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/article-comments", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/article-comments", () => {
  afterEach(() => vi.resetAllMocks());

  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns pending comments from listPendingComments", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const fakeComments = [{ id: 1, body: "hi" }, { id: 2, body: "there" }];
    mockListPendingComments.mockResolvedValue(fakeComments);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual(fakeComments);
  });
});

describe("PATCH /api/admin/article-comments", () => {
  afterEach(() => vi.resetAllMocks());

  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await PATCH(makePatch({ id: 1, action: "publish" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ action: "publish" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 5 }));
    expect(res.status).toBe(400);
  });

  it("publish: calls setCommentStatus with published and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockSetCommentStatus.mockResolvedValue(true);
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });

    const res = await PATCH(makePatch({ id: 10, action: "publish" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("published");

    expect(mockSetCommentStatus).toHaveBeenCalledWith({
      id: 10,
      status: "published",
      moderatorEmail: "admin@test.com",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "article_comment:publish",
        entity_id: "10",
        admin_email: "admin@test.com",
      })
    );
  });

  it("reject: maps to 'rejected' status", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockSetCommentStatus.mockResolvedValue(true);
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const res = await PATCH(makePatch({ id: 3, action: "reject" }));
    const json = await res.json();
    expect(json.status).toBe("rejected");
    expect(mockSetCommentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected" })
    );
  });

  it("returns 500 when setCommentStatus returns false", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockSetCommentStatus.mockResolvedValue(false);

    const res = await PATCH(makePatch({ id: 7, action: "remove" }));
    expect(res.status).toBe(500);
  });
});
