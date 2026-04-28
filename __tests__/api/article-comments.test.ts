import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockListPublishedComments = vi.fn();
const mockSubmitComment = vi.fn();
vi.mock("@/lib/article-comments", () => ({
  listPublishedComments: (...args: unknown[]) => mockListPublishedComments(...args),
  submitComment: (...args: unknown[]) => mockSubmitComment(...args),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
}));

const mockGetUser = vi.fn();
const mockCreateClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { GET, POST } from "@/app/api/article-comments/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(slug?: string): NextRequest {
  const url = slug
    ? `http://localhost/api/article-comments?slug=${slug}`
    : "http://localhost/api/article-comments";
  return new NextRequest(url);
}

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/article-comments", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const VALID_POST = {
  slug: "best-etfs-australia",
  name: "Jane Doe",
  email: "jane@example.com",
  body: "Great article, very helpful!",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/article-comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPublishedComments.mockResolvedValue([]);
  });

  it("returns 400 when slug param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing slug/i);
  });

  it("returns 200 with empty items array when no comments", async () => {
    mockListPublishedComments.mockResolvedValue([]);
    const res = await GET(makeGet("some-article"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
  });

  it("returns 200 with items from listPublishedComments", async () => {
    const fakeComments = [
      { id: 1, author_name: "Alice", body: "Hello", status: "published" },
    ];
    mockListPublishedComments.mockResolvedValue(fakeComments);
    const res = await GET(makeGet("test-slug"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual(fakeComments);
    expect(mockListPublishedComments).toHaveBeenCalledWith("test-slug");
  });
});

describe("POST /api/article-comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockCreateClient.mockResolvedValue({ auth: { getUser: () => ({ data: { user: null } }) } });
    mockSubmitComment.mockResolvedValue({ ok: true, status: "pending" });
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(429);
    expect(mockSubmitComment).not.toHaveBeenCalled();
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  it("returns 400 when slug is missing", async () => {
    const { slug: _, ...body } = VALID_POST;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    const { name: _, ...body } = VALID_POST;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const { email: _, ...body } = VALID_POST;
    const res = await POST(makePost(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body text is missing", async () => {
    const { body: _, ...rest } = VALID_POST;
    const res = await POST(makePost(rest));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await POST(makePost({ ...VALID_POST, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid email/i);
  });

  // ── Success paths ─────────────────────────────────────────────────────────

  it("returns 200 on success with status and pending fields", async () => {
    mockSubmitComment.mockResolvedValue({ ok: true, status: "published" });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("published");
    expect(json.pending).toBe(false);
  });

  it("sets pending=true when status is not 'published'", async () => {
    mockSubmitComment.mockResolvedValue({ ok: true, status: "pending" });
    const res = await POST(makePost(VALID_POST));
    const json = await res.json();
    expect(json.pending).toBe(true);
  });

  it("passes parent_id through to submitComment when numeric", async () => {
    await POST(makePost({ ...VALID_POST, parent_id: 42 }));
    const call = mockSubmitComment.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.parentId).toBe(42);
  });

  it("sets parentId to null when parent_id is not a number", async () => {
    await POST(makePost({ ...VALID_POST, parent_id: "42" }));
    const call = mockSubmitComment.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.parentId).toBeNull();
  });

  it("trims whitespace from name and email before passing to submitComment", async () => {
    await POST(makePost({ ...VALID_POST, name: "  Bob  ", email: "  bob@example.com  " }));
    const call = mockSubmitComment.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.authorName).toBe("Bob");
    expect(call.authorEmail).toBe("bob@example.com");
  });

  // ── Auth context ──────────────────────────────────────────────────────────

  it("passes authorId from authenticated user", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => ({ data: { user: { id: "user-id-123" } } }) },
    });
    await POST(makePost(VALID_POST));
    const call = mockSubmitComment.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.authorId).toBe("user-id-123");
  });

  it("passes null authorId when not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => ({ data: { user: null } }) },
    });
    await POST(makePost(VALID_POST));
    const call = mockSubmitComment.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.authorId).toBeNull();
  });

  it("passes null authorId when auth throws", async () => {
    mockCreateClient.mockRejectedValue(new Error("auth error"));
    await POST(makePost(VALID_POST));
    const call = mockSubmitComment.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.authorId).toBeNull();
  });

  // ── Error path ────────────────────────────────────────────────────────────

  it("returns 400 when submitComment rejects with a reason", async () => {
    mockSubmitComment.mockResolvedValue({ ok: false, reason: "spam_detected" });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("spam_detected");
  });

  it("returns 400 with 'invalid' when submitComment rejects without reason", async () => {
    mockSubmitComment.mockResolvedValue({ ok: false });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid");
  });
});
