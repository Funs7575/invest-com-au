import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockGetReactionCounts = vi.fn();
const mockReactToArticle = vi.fn();
const mockIsValidReaction = vi.fn();
const mockHashIp = vi.fn();
vi.mock("@/lib/article-comments", () => ({
  getReactionCounts: (...args: unknown[]) => mockGetReactionCounts(...args),
  reactToArticle: (...args: unknown[]) => mockReactToArticle(...args),
  isValidReaction: (...args: unknown[]) => mockIsValidReaction(...args),
  hashIp: (...args: unknown[]) => mockHashIp(...args),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: (...args: unknown[]) => mockGetUser(...args) } }),
  ),
}));

import { GET, POST } from "@/app/api/article-reactions/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(slug?: string): NextRequest {
  const url = slug
    ? `http://localhost/api/article-reactions?slug=${slug}`
    : "http://localhost/api/article-reactions";
  return new NextRequest(url);
}

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/article-reactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const SAMPLE_COUNTS = { helpful: 5, like: 10, confused: 1, disagree: 2 };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/article-reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReactionCounts.mockResolvedValue(SAMPLE_COUNTS);
  });

  it("returns 400 when slug param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing slug/i);
  });

  it("returns 200 with counts for a valid slug", async () => {
    const res = await GET(makeGet("best-etfs-australia"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.counts).toEqual(SAMPLE_COUNTS);
  });

  it("passes slug to getReactionCounts", async () => {
    await GET(makeGet("some-article-slug"));
    expect(mockGetReactionCounts).toHaveBeenCalledWith("some-article-slug");
  });
});

describe("POST /api/article-reactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidReaction.mockReturnValue(true);
    mockHashIp.mockReturnValue("hashed-ip-abc");
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockReactToArticle.mockResolvedValue(true);
    mockGetReactionCounts.mockResolvedValue(SAMPLE_COUNTS);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ slug: "article", reaction: "like" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(makePost({ reaction: "like" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing slug or reaction/i);
  });

  it("returns 400 when reaction is invalid", async () => {
    mockIsValidReaction.mockReturnValue(false);
    const res = await POST(makePost({ slug: "article", reaction: "invalid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing slug or reaction/i);
  });

  it("returns 500 when reactToArticle fails", async () => {
    mockReactToArticle.mockResolvedValue(false);
    const res = await POST(makePost({ slug: "article", reaction: "like" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("failed");
  });

  it("returns 200 with ok+counts on success (anonymous user)", async () => {
    const res = await POST(makePost({ slug: "article", reaction: "helpful" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.counts).toEqual(SAMPLE_COUNTS);
  });

  it("uses userId for authenticated users instead of ipHash", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    await POST(makePost({ slug: "article", reaction: "like" }));
    const call = mockReactToArticle.mock.calls[0]![0];
    expect(call.userId).toBe("user-123");
    expect(call.ipHash).toBeNull();
  });

  it("uses ipHash for anonymous users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await POST(makePost({ slug: "article", reaction: "like" }, "5.6.7.8"));
    const call = mockReactToArticle.mock.calls[0]![0];
    expect(call.userId).toBeNull();
    expect(call.ipHash).toBe("hashed-ip-abc");
  });

  it("falls back to anonymous when getUser throws", async () => {
    mockGetUser.mockRejectedValue(new Error("auth error"));
    const res = await POST(makePost({ slug: "article", reaction: "like" }));
    expect(res.status).toBe(200);
  });
});
