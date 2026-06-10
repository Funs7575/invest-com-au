import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/admin/articles-editor/save/route";

const ADMIN_GUARD_OK = { ok: true as const, email: "admin@test.com", response: undefined };
const GOOD_SCORECARD = { grade: "A", score: 90, passedChecks: [], failedChecks: [], remediation: [] };
const FAIL_SCORECARD = { grade: "F", score: 10, passedChecks: [], failedChecks: ["too short"], remediation: [] };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/articles-editor/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_GUARD_OK);
  mockRunScorecard.mockReturnValue(GOOD_SCORECARD);
  mockFrom.mockImplementation((table: string) => {
    if (table === "articles") {
      return { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }
    return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
  });
});

describe("POST /api/admin/articles-editor/save", () => {
  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: false as const, response: new NextResponse(null, { status: 401 }) });
    const res = await POST(makeReq({ slug: "my-slug", title: "My Article Title", content: "body" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is invalid (uppercase / spaces)", async () => {
    const res = await POST(makeReq({ slug: "Bad Slug!", title: "My Article Title", content: "body" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/slug/i);
  });

  it("returns 400 when title is too short", async () => {
    const res = await POST(makeReq({ slug: "my-slug", title: "Hi", content: "body" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/title/i);
  });

  it("returns 400 when content is missing", async () => {
    const res = await POST(makeReq({ slug: "my-slug", title: "My Article Title" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/content/i);
  });

  it("returns 400 when publishing with grade F scorecard", async () => {
    mockRunScorecard.mockReturnValueOnce(FAIL_SCORECARD);
    const res = await POST(makeReq({ slug: "my-slug", title: "My Article Title", content: "body", status: "published" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/grade is F/i);
    expect(Array.isArray(body.failed_checks)).toBe(true);
  });

  it("saves draft with grade F without error", async () => {
    mockRunScorecard.mockReturnValueOnce(FAIL_SCORECARD);
    const res = await POST(makeReq({ slug: "my-slug", title: "My Article Title", content: "body", status: "draft" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.grade).toBe("F");
    expect(body.status).toBe("draft");
  });

  it("returns 200 with ok, grade, score on success", async () => {
    const res = await POST(makeReq({ slug: "my-slug", title: "My Article Title", content: "body" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.grade).toBe("A");
    expect(body.score).toBe(90);
  });

  it("returns 500 when DB upsert fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "articles") {
        return { upsert: vi.fn().mockResolvedValue({ data: null, error: { message: "constraint violation" } }) };
      }
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });
    const res = await POST(makeReq({ slug: "my-slug", title: "My Article Title", content: "body" }));
    expect(res.status).toBe(500);
  });
});
