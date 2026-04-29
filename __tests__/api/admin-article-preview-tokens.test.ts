import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockCreatePreviewToken = vi.fn();
const mockListTokensForArticle = vi.fn();
const mockRevokePreviewToken = vi.fn();
vi.mock("@/lib/article-preview-tokens", () => ({
  createPreviewToken: (...args: unknown[]) => mockCreatePreviewToken(...args),
  listTokensForArticle: (...args: unknown[]) => mockListTokensForArticle(...args),
  revokePreviewToken: (...args: unknown[]) => mockRevokePreviewToken(...args),
}));

import { GET, POST, DELETE } from "@/app/api/admin/article-preview-tokens/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

function makeGet(slug?: string): NextRequest {
  const url = new URL("http://localhost/api/admin/article-preview-tokens");
  if (slug) url.searchParams.set("slug", slug);
  return new NextRequest(url);
}

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

function setupAuditMock() {
  mockFrom.mockImplementation(() => ({
    insert: vi.fn().mockResolvedValue({ error: null }),
  }));
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/article-preview-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET(makeGet("my-article"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/slug/i);
  });

  it("returns token list for a given slug", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const tokens = [{ id: 1, token_hash: "abc", revoked: false }];
    mockListTokensForArticle.mockResolvedValue(tokens);
    const res = await GET(makeGet("my-article"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(mockListTokensForArticle).toHaveBeenCalledWith("my-article");
  });

  it("returns empty items when no tokens exist", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListTokensForArticle.mockResolvedValue([]);
    const res = await GET(makeGet("my-article"));
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/article-preview-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ slug: "my-article" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/slug/i);
  });

  it("returns 500 when createPreviewToken fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: false, error: "db_error" });
    const res = await POST(makePost({ slug: "my-article" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db_error");
  });

  it("returns token on success and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: true, token: "tok_abc123" });
    setupAuditMock();
    const res = await POST(makePost({ slug: "my-article", ttl_hours: 24, note: "For review" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBe("tok_abc123");
    expect(mockCreatePreviewToken).toHaveBeenCalledWith(
      expect.objectContaining({
        articleSlug: "my-article",
        createdBy: "admin@test.com",
        ttlHours: 24,
        note: "For review",
      })
    );
  });

  it("caps ttl_hours at 14 days (336 hours)", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: true, token: "tok_xyz" });
    setupAuditMock();
    await POST(makePost({ slug: "my-article", ttl_hours: 9999 }));
    expect(mockCreatePreviewToken).toHaveBeenCalledWith(
      expect.objectContaining({ ttlHours: 336 })
    );
  });

  it("defaults ttl_hours to 72 when not provided", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockCreatePreviewToken.mockResolvedValue({ ok: true, token: "tok_xyz" });
    setupAuditMock();
    await POST(makePost({ slug: "my-article" }));
    expect(mockCreatePreviewToken).toHaveBeenCalledWith(
      expect.objectContaining({ ttlHours: 72 })
    );
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/admin/article-preview-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await DELETE(makeDelete({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/id/i);
  });

  it("revokes token and writes audit log on success", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockRevokePreviewToken.mockResolvedValue({ ok: true });
    setupAuditMock();
    const res = await DELETE(makeDelete({ id: 5 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockRevokePreviewToken).toHaveBeenCalledWith(5);
  });

  it("returns ok:false without writing audit log when revoke fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockRevokePreviewToken.mockResolvedValue({ ok: false });
    const auditInsert = vi.fn();
    mockFrom.mockImplementation(() => ({ insert: auditInsert }));
    const res = await DELETE(makeDelete({ id: 5 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(auditInsert).not.toHaveBeenCalled();
  });
});
