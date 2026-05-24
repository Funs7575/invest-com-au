import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockRequireAdmin,
  mockListPendingComments,
  mockSetCommentStatus,
  mockAdminFrom,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockListPendingComments: vi.fn(),
  mockSetCommentStatus: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/article-comments", () => ({
  listPendingComments: () => mockListPendingComments(),
  setCommentStatus: (opts: unknown) => mockSetCommentStatus(opts),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET, PATCH } from "@/app/api/admin/article-comments/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@invest.com.au", response: undefined };
const UNAUTH_GUARD = {
  ok: false as const,
  email: "",
  response: new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
};

const PENDING_COMMENT = {
  id: 7,
  article_slug: "best-brokers-2026",
  author_name: "Jane Doe",
  body: "Great review!",
  status: "pending",
  created_at: "2026-05-24T00:00:00Z",
};

function makeAuditChain() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  mockAdminFrom.mockReturnValue({ insert });
  return { insert };
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/article-comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListPendingComments.mockResolvedValue([PENDING_COMMENT]);
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns pending comments list", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.items[0].id).toBe(7);
    expect(mockListPendingComments).toHaveBeenCalledOnce();
  });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

function makePatch(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/article-comments", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/article-comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockSetCommentStatus.mockResolvedValue(true);
    makeAuditChain();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(UNAUTH_GUARD);
    const res = await PATCH(makePatch({ id: 7, action: "publish" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(makePatch({ action: "publish" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is missing", async () => {
    const res = await PATCH(makePatch({ id: 7 }));
    expect(res.status).toBe(400);
  });

  it("publishes a comment and returns published status", async () => {
    const { insert } = makeAuditChain();
    const res = await PATCH(makePatch({ id: 7, action: "publish" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("published");
    expect(mockSetCommentStatus).toHaveBeenCalledWith({
      id: 7,
      status: "published",
      moderatorEmail: "admin@invest.com.au",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "article_comment:publish" }),
    );
  });

  it("rejects a comment and returns rejected status", async () => {
    makeAuditChain();
    const res = await PATCH(makePatch({ id: 7, action: "reject" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("rejected");
    expect(mockSetCommentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected" }),
    );
  });

  it("removes a comment and returns removed status", async () => {
    makeAuditChain();
    const res = await PATCH(makePatch({ id: 7, action: "remove" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("removed");
  });

  it("returns 500 when setCommentStatus returns false", async () => {
    mockSetCommentStatus.mockResolvedValue(false);
    const res = await PATCH(makePatch({ id: 7, action: "publish" }));
    expect(res.status).toBe(500);
  });
});
