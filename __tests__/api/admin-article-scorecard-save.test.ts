import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireAdmin, mockAdminFrom, mockRunScorecard } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockRunScorecard: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/article-scorecard", () => ({
  runScorecard: (...a: unknown[]) => mockRunScorecard(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  POST as scorecardPOST,
  GET as scorecardGET,
} from "@/app/api/admin/article-scorecard/route";
import { POST as editorSavePOST } from "@/app/api/admin/articles-editor/save/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@invest.com.au" };

const PASSING_RESULT = {
  score: 82,
  grade: "B",
  passedChecks: ["has_excerpt", "word_count"],
  failedChecks: [] as string[],
  remediation: [],
};

const FAILING_RESULT = {
  score: 20,
  grade: "F",
  passedChecks: [] as string[],
  failedChecks: ["has_excerpt", "word_count"],
  remediation: ["Add an excerpt", "Minimum 600 words required"],
};

// ── Setup helpers ─────────────────────────────────────────────────────────────

function setupAdminMocks(scorecardResult = PASSING_RESULT) {
  mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
  mockRunScorecard.mockReturnValue(scorecardResult);
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);
    b.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    b.then = vi.fn((cb: (v: unknown) => void) => {
      cb({ data: null, error: null });
      return Promise.resolve();
    });
    return b;
  });
}

function makePost(path: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/admin/article-scorecard");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, { method: "GET" });
}

// ── article-scorecard POST tests ──────────────────────────────────────────────

describe("POST /api/admin/article-scorecard", () => {
  const VALID_BODY = {
    slug: "my-article",
    title: "My Article Title",
    body: "This is the article body content.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupAdminMocks();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    expect((await scorecardPOST(makePost("/api/admin/article-scorecard", VALID_BODY))).status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    expect((await scorecardPOST(makePost("/api/admin/article-scorecard", { slug: "my-article" }))).status).toBe(400);
  });

  it("returns 200 with scorecard result on success", async () => {
    const res = await scorecardPOST(makePost("/api/admin/article-scorecard", VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.score).toBe(82);
    expect(json.grade).toBe("B");
    expect(json.passed_checks).toHaveLength(2);
  });

  it("persists scorecard run when persist=true", async () => {
    await scorecardPOST(makePost("/api/admin/article-scorecard", { ...VALID_BODY, persist: true }));
    // Audit log insert should have been called
    expect(mockAdminFrom).toHaveBeenCalledWith("article_scorecard_runs");
  });
});

// ── article-scorecard GET tests ───────────────────────────────────────────────

describe("GET /api/admin/article-scorecard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAdminMocks();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    expect((await scorecardGET(makeGet({ slug: "my-article" }))).status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    expect((await scorecardGET(makeGet())).status).toBe(400);
  });

  it("returns 200 with null item when no run exists", async () => {
    const res = await scorecardGET(makeGet({ slug: "my-article" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.item).toBeNull();
  });
});

// ── articles-editor/save POST tests ──────────────────────────────────────────

describe("POST /api/admin/articles-editor/save", () => {
  const VALID_SAVE = {
    slug: "my-article",
    title: "My Article Title That Is Long Enough",
    content: "This is the article content.",
    status: "draft",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupAdminMocks();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    expect((await editorSavePOST(makePost("/api/admin/articles-editor/save", VALID_SAVE))).status).toBe(401);
  });

  it("returns 400 for invalid slug (uppercase)", async () => {
    const res = await editorSavePOST(makePost("/api/admin/articles-editor/save", {
      ...VALID_SAVE,
      slug: "My-Article",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short", async () => {
    expect((await editorSavePOST(makePost("/api/admin/articles-editor/save", {
      ...VALID_SAVE,
      title: "Hi",
    }))).status).toBe(400);
  });

  it("returns 400 when publishing with grade F scorecard", async () => {
    mockRunScorecard.mockReturnValueOnce(FAILING_RESULT);
    const res = await editorSavePOST(makePost("/api/admin/articles-editor/save", {
      ...VALID_SAVE,
      status: "published",
    }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/grade is F/i);
  });

  it("returns 500 on DB upsert error", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table);
      if (table === "articles") {
        b.then = vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: { message: "constraint violation" } });
          return Promise.resolve();
        });
      } else {
        b.then = vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        });
      }
      return b;
    });
    const res = await editorSavePOST(makePost("/api/admin/articles-editor/save", VALID_SAVE));
    expect(res.status).toBe(500);
  });

  it("returns 200 with grade/score on successful draft save", async () => {
    const res = await editorSavePOST(makePost("/api/admin/articles-editor/save", VALID_SAVE));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("draft");
    expect(json.grade).toBe("B");
  });

  it("allows publishing when scorecard passes", async () => {
    const res = await editorSavePOST(makePost("/api/admin/articles-editor/save", {
      ...VALID_SAVE,
      status: "published",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("published");
  });
});
