import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: () => mockGetUser() },
      from: mockFrom,
    }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST } from "@/app/api/sync-shortlist/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER = { id: "user-123" };

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/sync-shortlist", { method: "GET" });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/sync-shortlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupShortlistMock(opts: {
  slugs?: { broker_slug: string; added_at: string }[];
  selectError?: { message: string } | null;
  deleteError?: { message: string } | null;
  insertError?: { message: string } | null;
} = {}) {
  const { slugs = [], selectError = null, deleteError = null, insertError = null } = opts;

  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: slugs, error: selectError }),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: insertError }),
    // delete returns a thenable when chained with eq
    ...(deleteError !== undefined ? {
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: deleteError }),
      })),
    } : {}),
  }));
}

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/sync-shortlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/not authenticated/i);
  });

  it("returns empty slugs array when shortlist is empty", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupShortlistMock({ slugs: [] });
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).slugs).toEqual([]);
  });

  it("returns slugs from the shortlist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupShortlistMock({
      slugs: [
        { broker_slug: "commsec", added_at: "2026-01-01T00:00:00Z" },
        { broker_slug: "cmc-markets", added_at: "2026-01-02T00:00:00Z" },
      ],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).slugs).toEqual(["commsec", "cmc-markets"]);
  });

  it("returns 500 on DB fetch error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    setupShortlistMock({ selectError: { message: "connection timeout" } });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/sync-shortlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ slugs: ["commsec"] }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ slugs: ["commsec"] }));
    expect(res.status).toBe(429);
  });

  it("replaces entire shortlist and returns slugs", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    const res = await POST(makePost({ slugs: ["commsec", "cmc-markets"] }));
    expect(res.status).toBe(200);
    expect((await res.json()).slugs).toEqual(["commsec", "cmc-markets"]);
  });

  it("clears shortlist when empty slugs array provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    const res = await POST(makePost({ slugs: [] }));
    expect(res.status).toBe(200);
    expect((await res.json()).slugs).toEqual([]);
  });

  it("caps slugs at MAX_SHORTLIST (8)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    const tooMany = Array.from({ length: 12 }, (_, i) => `broker-${i}`);
    const res = await POST(makePost({ slugs: tooMany }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slugs.length).toBeLessThanOrEqual(8);
  });

  it("filters out non-string slugs", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    const res = await POST(makePost({ slugs: ["commsec", 123, null, "", "valid"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slugs).toEqual(["commsec", "valid"]);
  });

  it("treats non-array slugs as empty list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    const res = await POST(makePost({ slugs: "commsec" }));
    expect(res.status).toBe(200);
    expect((await res.json()).slugs).toEqual([]);
  });

  it("returns 500 on delete error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "delete failed" } }) })),
    });
    const res = await POST(makePost({ slugs: ["commsec"] }));
    expect(res.status).toBe(500);
  });

  it("returns 500 on insert error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockFrom.mockReturnValue({
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockResolvedValue({ error: { message: "insert failed" } }),
    });
    const res = await POST(makePost({ slugs: ["commsec"] }));
    expect(res.status).toBe(500);
  });
});
