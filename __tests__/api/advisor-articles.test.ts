import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => ""),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmail: vi.fn(() => "admin@invest.com.au"),
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

import { GET, POST, PUT } from "@/app/api/advisor-articles/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "admin@invest.com.au";

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  return new NextRequest(`http://localhost/api/advisor-articles${sp ? `?${sp}` : ""}`);
}

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/advisor-articles", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makePut(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-articles", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeArticle(overrides = {}) {
  return {
    id: 1,
    title: "How to choose an advisor",
    slug: "how-to-choose-an-advisor-abc",
    excerpt: "Guide to choosing",
    status: "published",
    category: "General",
    tags: [],
    created_at: new Date().toISOString(),
    view_count: 10,
    ...overrides,
  };
}

function makeProfessional(overrides = {}) {
  return {
    id: 10,
    name: "Jane Advisor",
    slug: "jane-advisor",
    firm_name: "Jane Fin",
    email: "jane@example.com",
    photo_url: null,
    status: "active",
    ...overrides,
  };
}

function longContent(words = 350) {
  return Array.from({ length: words }, (_, i) => `word${i}`).join(" ");
}

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/advisor-articles — public list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("returns published articles list", async () => {
    const article = makeArticle();
    const builder = createChainableBuilder("advisor_articles");
    builder.then = vi.fn((cb: (v: { data: unknown[] }) => void) => {
      cb({ data: [article] });
      return Promise.resolve();
    });
    mockServerFrom.mockReturnValue(builder);

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe(1);
  });
});

describe("GET /api/advisor-articles — by slug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("returns article by slug and increments view count", async () => {
    const article = makeArticle({ view_count: 5 });

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      builder.single = vi.fn(() => Promise.resolve({ data: article, error: null }));
      return builder;
    });

    const res = await GET(makeGet({ slug: "how-to-choose-an-advisor-abc" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(1);
  });

  it("returns 404 when slug not found", async () => {
    mockServerFrom.mockImplementation(() => {
      const builder = createChainableBuilder("advisor_articles");
      builder.single = vi.fn(() => Promise.resolve({ data: null, error: { message: "not found" } }));
      return builder;
    });

    const res = await GET(makeGet({ slug: "nonexistent" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/advisor-articles — admin mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for non-admin in admin mode", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "notadmin@example.com" } }, error: null });

    const res = await GET(makeGet({ mode: "admin" }));
    expect(res.status).toBe(401);
  });

  it("returns article list for admin user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: ADMIN_EMAIL } }, error: null });

    const builder = createChainableBuilder("advisor_articles");
    builder.then = vi.fn((cb: (v: { data: unknown[] }) => void) => {
      cb({ data: [makeArticle()] });
      return Promise.resolve();
    });
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET(makeGet({ mode: "admin" }));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/advisor-articles — advisor mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("returns articles for a professional", async () => {
    const builder = createChainableBuilder("advisor_articles");
    builder.then = vi.fn((cb: (v: { data: unknown[] }) => void) => {
      cb({ data: [makeArticle({ status: "draft" })] });
      return Promise.resolve();
    });
    mockServerFrom.mockReturnValue(builder);

    const res = await GET(makeGet({ mode: "advisor", professional_id: "10" }));
    expect(res.status).toBe(200);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/advisor-articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ professional_id: 10, title: "Test", content: "Content" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when professional_id missing", async () => {
    const res = await POST(makePost({ title: "Test", content: "Content" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title missing", async () => {
    const res = await POST(makePost({ professional_id: 10, content: "Content" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when content missing", async () => {
    const res = await POST(makePost({ professional_id: 10, title: "Test Title Here" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when professional not found", async () => {
    mockServerFrom.mockImplementation(() => {
      const builder = createChainableBuilder("professionals");
      builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      return builder;
    });

    const res = await POST(makePost({ professional_id: 99, title: "Test", content: "Content" }));
    expect(res.status).toBe(404);
  });

  it("saves draft successfully", async () => {
    const pro = makeProfessional();
    const article = makeArticle({ status: "draft" });

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      if (table === "professionals") {
        builder.single = vi.fn(() => Promise.resolve({ data: pro, error: null }));
      } else if (table === "advisor_articles") {
        builder.single = vi.fn(() =>
          Promise.resolve({ data: { id: article.id, slug: article.slug, status: "draft" }, error: null }),
        );
      } else {
        builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      }
      return builder;
    });

    const res = await POST(
      makePost({ professional_id: 10, title: "A Good Title Here", content: "Draft content here" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("draft");
  });

  it("returns 400 when submitting article under 300 words", async () => {
    const pro = makeProfessional();
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        const builder = createChainableBuilder(table);
        builder.single = vi.fn(() => Promise.resolve({ data: pro, error: null }));
        return builder;
      }
      return createChainableBuilder(table);
    });

    const res = await POST(
      makePost({ professional_id: 10, title: "A Good Title Here", content: "Short content", action: "submit" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/300 words/i);
  });

  it("returns 400 when submitted article has performance guarantee language", async () => {
    const pro = makeProfessional();
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        const builder = createChainableBuilder(table);
        builder.single = vi.fn(() => Promise.resolve({ data: pro, error: null }));
        return builder;
      }
      return createChainableBuilder(table);
    });

    const content = longContent(350) + " guaranteed returns on your investment";
    const res = await POST(
      makePost({ professional_id: 10, title: "A Good Title Here And More", content, action: "submit" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/performance guarantee/i);
  });

  it("returns 400 when submitted title is too short (< 15 chars)", async () => {
    const pro = makeProfessional();
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        const builder = createChainableBuilder(table);
        builder.single = vi.fn(() => Promise.resolve({ data: pro, error: null }));
        return builder;
      }
      return createChainableBuilder(table);
    });

    const content = longContent(350);
    const res = await POST(
      makePost({ professional_id: 10, title: "Short", content, action: "submit" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/title is too short/i);
  });

  it("submits valid article and returns submitted status", async () => {
    const pro = makeProfessional();
    const content = longContent(350);

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      if (table === "professionals") {
        builder.single = vi.fn(() => Promise.resolve({ data: pro, error: null }));
      } else {
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 1, slug: "slug-abc", status: "submitted" },
            error: null,
          }),
        );
      }
      return builder;
    });

    const res = await POST(
      makePost({
        professional_id: 10,
        title: "A Proper Long Title For An Article",
        content,
        action: "submit",
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("submitted");
  });

  it("returns 500 when DB insert fails", async () => {
    const pro = makeProfessional();
    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      if (table === "professionals") {
        builder.single = vi.fn(() => Promise.resolve({ data: pro, error: null }));
      } else {
        builder.single = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "insert failed" } }),
        );
      }
      return builder;
    });

    const res = await POST(
      makePost({ professional_id: 10, title: "A Good Title Here", content: "Some content" }),
    );
    expect(res.status).toBe(500);
  });
});

// ── PUT tests ──────────────────────────────────────────────────────────────────

describe("PUT /api/advisor-articles — admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when article id missing", async () => {
    const res = await PUT(makePut({ action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 for approve action by non-admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "nobody@example.com" } }, error: null });

    mockServerFrom.mockImplementation(() => {
      const builder = createChainableBuilder("advisor_articles");
      builder.single = vi.fn(() => Promise.resolve({ data: makeArticle({ status: "submitted" }), error: null }));
      return builder;
    });

    const res = await PUT(makePut({ id: 1, action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("approves article and returns approved status", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: ADMIN_EMAIL } }, error: null });

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: makeArticle({ status: "submitted" }),
          error: null,
        }),
      );
      return builder;
    });

    const res = await PUT(makePut({ id: 1, action: "approve" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("approved");
  });

  it("rejects article and returns rejected status", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: ADMIN_EMAIL } }, error: null });

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: makeArticle({ status: "submitted" }),
          error: null,
        }),
      );
      return builder;
    });

    const res = await PUT(
      makePut({ id: 1, action: "reject", rejection_reason: "Does not meet standards" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("rejected");
  });

  it("returns 400 when publishing article without payment", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: ADMIN_EMAIL } }, error: null });

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      // First select → current article (for action check)
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: makeArticle({ status: "approved", payment_status: "pending" }),
          error: null,
        }),
      );
      return builder;
    });

    const res = await PUT(makePut({ id: 1, action: "publish" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/payment required/i);
  });

  it("publishes article when payment is paid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: ADMIN_EMAIL } }, error: null });

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: makeArticle({ status: "approved", payment_status: "paid", slug: "my-article" }),
          error: null,
        }),
      );
      return builder;
    });

    const res = await PUT(makePut({ id: 1, action: "publish" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("published");
  });

  it("saves draft update (generic PUT without action)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: ADMIN_EMAIL } }, error: null });

    mockServerFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table);
      builder.single = vi.fn(() =>
        Promise.resolve({ data: makeArticle({ status: "draft" }), error: null }),
      );
      return builder;
    });

    const res = await PUT(makePut({ id: 1, title: "Updated Title", content: "New content" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.updated).toBe(true);
  });
});
