import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockGetUser, mockIsRateLimited, mockServerFrom, mockAdminFrom, mockLog } =
  vi.hoisted(() => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "admin-uid", email: "admin@invest.com.au" } },
      error: null,
    });
    const mockIsRateLimited = vi.fn().mockResolvedValue(false);
    const mockServerFrom = vi.fn();
    const mockAdminFrom = vi.fn();
    const mockLog = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    return { mockGetUser, mockIsRateLimited, mockServerFrom, mockAdminFrom, mockLog };
  });

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));
vi.mock("@/lib/logger", () => ({ logger: () => mockLog }));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmail: () => "admin@invest.com.au",
  getAdminEmails: () => ["admin@invest.com.au"],
}));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/email-templates", () => ({ notificationFooter: () => "" }));

import { GET, POST, PUT } from "@/app/api/advisor-articles/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost/api/advisor-articles${sp ? `?${sp}` : ""}`);
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-articles", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-articles", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeChainableBuilder(result: { data: unknown; error: unknown }) {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
  (b.insert as ReturnType<typeof vi.fn>).mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(result),
    }),
  });
  (b.update as ReturnType<typeof vi.fn>).mockReturnValue({
    eq: vi.fn().mockResolvedValue(result),
  });
  return b;
}

const MOCK_ARTICLE = {
  id: 1,
  title: "Super Strategies for 2026",
  slug: "super-strategies-for-2026",
  status: "published",
  professional_id: 42,
};
const MOCK_PRO = {
  id: 42,
  name: "Jane Smith",
  slug: "jane-smith",
  firm_name: "Smith Financial",
  email: "jane@smith.com.au",
  photo_url: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsRateLimited.mockResolvedValue(false);
  mockGetUser.mockResolvedValue({
    data: { user: { id: "admin-uid", email: "admin@invest.com.au" } },
    error: null,
  });
  const articleBld = makeChainableBuilder({ data: MOCK_ARTICLE, error: null });
  const proBld = makeChainableBuilder({ data: MOCK_PRO, error: null });
  mockServerFrom.mockImplementation((table: string) => {
    if (table === "advisor_articles") return articleBld;
    if (table === "professionals") return proBld;
    if (table === "advisor_article_moderation_log") return makeChainableBuilder({ data: [], error: null });
    return makeChainableBuilder({ data: null, error: null });
  });
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_articles") return articleBld;
    if (table === "article_guidelines") return makeChainableBuilder({ data: [], error: null });
    if (table === "advisor_article_moderation_log") return makeChainableBuilder({ data: null, error: null });
    return makeChainableBuilder({ data: null, error: null });
  });
});

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-articles", () => {
  it("returns article by ID (admin only)", async () => {
    const res = await GET(makeGetRequest({ id: "1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
  });

  it("returns 401 for article by ID when not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "uid", email: "user@example.com" } },
      error: null,
    });
    const res = await GET(makeGetRequest({ id: "1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when article by ID not found", async () => {
    mockAdminFrom.mockReturnValue(makeChainableBuilder({ data: null, error: null }));
    const res = await GET(makeGetRequest({ id: "999" }));
    expect(res.status).toBe(404);
  });

  it("returns published article by slug", async () => {
    const res = await GET(makeGetRequest({ slug: "super-strategies-for-2026" }));
    expect(res.status).toBe(200);
  });

  it("returns articles in advisor mode", async () => {
    const listBld = makeChainableBuilder({ data: [MOCK_ARTICLE], error: null });
    listBld.order.mockReturnThis();
    mockServerFrom.mockReturnValue(listBld);
    const res = await GET(makeGetRequest({ mode: "advisor", professional_id: "42" }));
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("returns articles in admin mode (admin only)", async () => {
    const listBld = makeChainableBuilder({ data: [MOCK_ARTICLE], error: null });
    mockAdminFrom.mockReturnValue(listBld);
    const res = await GET(makeGetRequest({ mode: "admin" }));
    expect(res.status).toBe(200);
  });

  it("returns 401 for admin mode when not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "uid", email: "user@example.com" } },
      error: null,
    });
    const res = await GET(makeGetRequest({ mode: "admin" }));
    expect(res.status).toBe(401);
  });

  it("returns guidelines list", async () => {
    mockAdminFrom.mockReturnValue(makeChainableBuilder({ data: [], error: null }));
    const res = await GET(makeGetRequest({ mode: "guidelines" }));
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("returns published articles list (no params)", async () => {
    const listBld = makeChainableBuilder({ data: [MOCK_ARTICLE], error: null });
    listBld.order.mockReturnThis();
    mockServerFrom.mockReturnValue(listBld);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/advisor-articles", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePostRequest({ professional_id: 42, title: "Title", content: "Content" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when title or content missing", async () => {
    const res = await POST(makePostRequest({ professional_id: 42 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Title and content required");
  });

  it("returns 404 when professional not found", async () => {
    mockServerFrom.mockReturnValue(makeChainableBuilder({ data: null, error: null }));
    const res = await POST(makePostRequest({
      professional_id: 99,
      title: "Test Article",
      content: "This is some content for the article",
    }));
    expect(res.status).toBe(404);
  });

  it("saves draft without compliance checks", async () => {
    const insertBld = makeChainableBuilder({
      data: { id: 5, slug: "test-slug", status: "draft" },
      error: null,
    });
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChainableBuilder({ data: MOCK_PRO, error: null });
      return insertBld;
    });
    const res = await POST(makePostRequest({
      professional_id: 42,
      title: "Short content article",
      content: "Short",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("draft");
  });

  it("returns 400 when submitted article is under 300 words", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChainableBuilder({ data: MOCK_PRO, error: null });
      return makeChainableBuilder({ data: null, error: null });
    });
    const res = await POST(makePostRequest({
      professional_id: 42,
      title: "A Long Enough Title Here",
      content: "Too short",
      action: "submit",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("300 words");
  });

  it("returns 400 for performance guarantee language on submit", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChainableBuilder({ data: MOCK_PRO, error: null });
      return makeChainableBuilder({ data: null, error: null });
    });
    const longContent = "guaranteed returns ".repeat(20) + " word ".repeat(300);
    const res = await POST(makePostRequest({
      professional_id: 42,
      title: "A Long Enough Title Here",
      content: longContent,
      action: "submit",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("performance guarantees");
  });

  it("returns 400 for promotional language on submit", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChainableBuilder({ data: MOCK_PRO, error: null });
      return makeChainableBuilder({ data: null, error: null });
    });
    const longContent = "contact me for more information ".repeat(20) + " word ".repeat(280);
    const res = await POST(makePostRequest({
      professional_id: 42,
      title: "A Long Enough Title Here",
      content: longContent,
      action: "submit",
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("promotional");
  });
});

// ── PUT tests ─────────────────────────────────────────────────────────────────

describe("PUT /api/advisor-articles", () => {
  it("returns 400 when article ID missing", async () => {
    const res = await PUT(makePutRequest({ action: "approve" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Article ID required");
  });

  it("returns 401 for admin action when not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "uid", email: "user@example.com" } },
      error: null,
    });
    const res = await PUT(makePutRequest({ id: 1, action: "approve" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain("admin");
  });

  it("approve action returns status=approved", async () => {
    const articleBld = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: "submitted", title: "Test", author_name: "Jane", professionals: { email: "jane@example.com", name: "Jane" } },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockServerFrom.mockReturnValue(articleBld);
    const res = await PUT(makePutRequest({ id: 1, action: "approve" }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("approved");
  });

  it("reject action returns status=rejected", async () => {
    const articleBld = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: "submitted", title: "Test", author_name: "Jane", professionals: { email: "jane@example.com", name: "Jane" } },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockServerFrom.mockReturnValue(articleBld);
    const res = await PUT(makePutRequest({ id: 1, action: "reject", rejection_reason: "Off topic" }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("rejected");
  });

  it("generic draft save (no action) returns updated=true", async () => {
    const articleBld = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: "draft", title: "Test", author_name: "Jane", professionals: { email: "jane@example.com", name: "Jane" } },
        error: null,
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockServerFrom.mockReturnValue(articleBld);
    const res = await PUT(makePutRequest({ id: 1, content: "Updated content words ".repeat(20) }));
    expect(res.status).toBe(200);
    expect((await res.json()).updated).toBe(true);
  });
});
