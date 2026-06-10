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

const mockRunScorecard = vi.fn();
vi.mock("@/lib/article-scorecard", () => ({
  runScorecard: (...args: unknown[]) => mockRunScorecard(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST, GET } from "@/app/api/admin/article-scorecard/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const SCORECARD_RESULT = {
  score: 85,
  grade: "B",
  passedChecks: ["word_count", "has_excerpt"],
  failedChecks: ["no_perf_guarantee"],
  remediation: [{ check: "no_perf_guarantee", severity: "soft", message: "Remove performance guarantees" }],
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/article-scorecard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/admin/article-scorecard");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function setupFromMock(maybySingleData: unknown = null, insertError: { message: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "article_scorecard_runs") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: insertError }),
        maybeSingle: vi.fn().mockResolvedValue({ data: maybySingleData }),
      };
    }
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/article-scorecard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockRunScorecard.mockReturnValue(SCORECARD_RESULT);
    setupFromMock();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ slug: "test", title: "T", body: "B" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(makePost({ title: "Test Article", body: "Some body text" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/slug/);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makePost({ slug: "test-slug", body: "Some body text" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is missing", async () => {
    const res = await POST(makePost({ slug: "test-slug", title: "Test Article" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with scorecard result", async () => {
    const res = await POST(makePost({ slug: "test", title: "Test Article", body: "Body text" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.score).toBe(85);
    expect(json.grade).toBe("B");
    expect(json.passed_checks).toEqual(["word_count", "has_excerpt"]);
    expect(json.failed_checks).toEqual(["no_perf_guarantee"]);
  });

  it("calls runScorecard with correct input fields", async () => {
    await POST(makePost({
      slug: "test",
      title: "T",
      body: "B",
      excerpt: "Exc",
      category: "investing",
      tags: ["smsf"],
      template_slug: "review",
      min_words: 500,
    }));
    expect(mockRunScorecard).toHaveBeenCalledWith(expect.objectContaining({
      title: "T",
      body: "B",
      excerpt: "Exc",
      category: "investing",
      tags: ["smsf"],
      templateSlug: "review",
      minWords: 500,
    }));
  });

  it("persists to article_scorecard_runs when persist=true", async () => {
    let insertCalled = false;
    mockFrom.mockImplementation((table: string) => {
      if (table === "article_scorecard_runs") {
        return {
          insert: vi.fn().mockImplementation(() => {
            insertCalled = true;
            return Promise.resolve({ error: null });
          }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      if (table === "admin_audit_log") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    await POST(makePost({ slug: "my-slug", title: "T", body: "B", persist: true }));
    expect(insertCalled).toBe(true);
  });

  it("does not persist when persist is not set", async () => {
    let insertCalled = false;
    mockFrom.mockImplementation(() => ({
      insert: vi.fn().mockImplementation(() => {
        insertCalled = true;
        return Promise.resolve({ error: null });
      }),
    }));
    await POST(makePost({ slug: "my-slug", title: "T", body: "B" }));
    expect(insertCalled).toBe(false);
  });
});

describe("GET /api/admin/article-scorecard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupFromMock();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET(makeGet({ slug: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing slug/);
  });

  it("returns 200 with null item when no run found", async () => {
    setupFromMock(null);
    const res = await GET(makeGet({ slug: "new-article" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.item).toBeNull();
  });

  it("returns 200 with run data when found", async () => {
    setupFromMock({ score: 90, grade: "A", article_slug: "found-article" });
    const res = await GET(makeGet({ slug: "found-article" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.item).toMatchObject({ score: 90, grade: "A" });
  });
});
