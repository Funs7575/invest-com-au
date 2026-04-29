import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockCreatePreviewToken = vi.fn();
const mockListTokensForArticle = vi.fn();
const mockRevokePreviewToken = vi.fn();
vi.mock("@/lib/article-preview-tokens", () => ({
  createPreviewToken: (...a: unknown[]) => mockCreatePreviewToken(...a),
  listTokensForArticle: (...a: unknown[]) => mockListTokensForArticle(...a),
  revokePreviewToken: (...a: unknown[]) => mockRevokePreviewToken(...a),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, DELETE } from "@/app/api/admin/article-preview-tokens/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@test.com", userId: "uid-1" };
const DENY_GUARD = {
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/article-preview-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/article-preview-tokens", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/admin/article-preview-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const req = new NextRequest("http://localhost/api/admin/article-preview-tokens?slug=test");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug query param is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const req = new NextRequest("http://localhost/api/admin/article-preview-tokens");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns token list for slug", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListTokensForArticle.mockResolvedValue([{ id: 1 }, { id: 2, revoked: true }]);
    const req = new NextRequest("http://localhost/api/admin/article-preview-tokens?slug=my-article");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(mockListTokensForArticle).toHaveBeenCalledWith("my-article");
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/article-preview-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ slug: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("creates token and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: true, token: "tok_xyz" });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsert });
    const res = await POST(makePost({ slug: "my-article" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBe("tok_xyz");
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "article_preview_token:created", entity_name: "my-article" })
    );
  });

  it("caps ttl_hours at 14 days (336 hours)", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: true, token: "tok_abc" });
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    await POST(makePost({ slug: "my-article", ttl_hours: 10000 }));
    expect(mockCreatePreviewToken).toHaveBeenCalledWith(
      expect.objectContaining({ ttlHours: 24 * 14 })
    );
  });

  it("uses default ttl_hours of 72 when not provided", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: true, token: "tok_def" });
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    await POST(makePost({ slug: "my-article" }));
    expect(mockCreatePreviewToken).toHaveBeenCalledWith(
      expect.objectContaining({ ttlHours: 72 })
    );
  });

  it("returns 500 when createPreviewToken fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: false, error: "article_not_found" });
    const res = await POST(makePost({ slug: "missing-article" }));
    expect(res.status).toBe(500);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/admin/article-preview-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
  });

  it("revokes token and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockRevokePreviewToken.mockResolvedValue({ ok: true });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsert });
    const res = await DELETE(makeDelete({ id: 7 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "article_preview_token:revoked", entity_id: "7" })
    );
  });

  it("returns ok:false without audit log when revoke fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockRevokePreviewToken.mockResolvedValue({ ok: false });
    const res = await DELETE(makeDelete({ id: 99 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
