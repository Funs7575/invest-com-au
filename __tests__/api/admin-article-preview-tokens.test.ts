import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockRequireAdmin,
  mockAdminFrom,
  mockListTokens,
  mockCreateToken,
  mockRevokeToken,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockListTokens: vi.fn().mockResolvedValue([]),
  mockCreateToken: vi.fn().mockResolvedValue({ ok: true, token: "tok-abc123" }),
  mockRevokeToken: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/article-preview-tokens", () => ({
  listTokensForArticle: (...a: unknown[]) => mockListTokens(...a),
  createPreviewToken: (...a: unknown[]) => mockCreateToken(...a),
  revokePreviewToken: (...a: unknown[]) => mockRevokeToken(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { GET, POST, DELETE } from "@/app/api/admin/article-preview-tokens/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@invest.com.au" };
const TOKENS = [{ id: 1, slug: "my-article", token: "tok-abc123", revoked: false }];

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks() {
  mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);
    b.then = vi.fn((cb: (v: unknown) => void) => {
      cb({ data: null, error: null });
      return Promise.resolve();
    });
    return b;
  });
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/admin/article-preview-tokens");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, { method: "GET" });
}

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/article-preview-tokens", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDelete(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/admin/article-preview-tokens", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/article-preview-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
    mockListTokens.mockResolvedValue(TOKENS);
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    expect((await GET(makeGet({ slug: "my-article" }))).status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    expect((await GET(makeGet())).status).toBe(400);
  });

  it("returns 200 with token list on success", async () => {
    const res = await GET(makeGet({ slug: "my-article" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(mockListTokens).toHaveBeenCalledWith("my-article");
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/article-preview-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    expect((await POST(makePost({ slug: "my-article" }))).status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    expect((await POST(makePost({}))).status).toBe(400);
  });

  it("returns 500 when createPreviewToken fails", async () => {
    mockCreateToken.mockResolvedValueOnce({ ok: false, error: "DB error" });
    expect((await POST(makePost({ slug: "my-article" }))).status).toBe(500);
  });

  it("returns 200 with token on success", async () => {
    const res = await POST(makePost({ slug: "my-article", ttl_hours: 48, note: "Share with reviewer" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.token).toBe("tok-abc123");
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/admin/article-preview-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    expect((await DELETE(makeDelete({ id: 1 }))).status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    expect((await DELETE(makeDelete({}))).status).toBe(400);
  });

  it("returns 200 with ok:true on successful revocation", async () => {
    const res = await DELETE(makeDelete({ id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockRevokeToken).toHaveBeenCalledWith(1);
  });
});
