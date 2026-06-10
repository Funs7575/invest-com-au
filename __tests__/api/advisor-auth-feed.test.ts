import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockGetUser } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Supabase admin builder ────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/feed/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Constants ─────────────────────────────────────────────────────────────────

const ADVISOR_ID = 55;
const USER_ID = "auth-uuid-99";

const MOCK_POSTS = [
  {
    id: 1,
    professional_id: ADVISOR_ID,
    status: "published",
    content: "Great market update!",
    created_at: "2026-05-01T10:00:00Z",
    professional: { id: ADVISOR_ID, name: "Jane Advisor", firm_name: "Acme Wealth", photo_url: null, slug: "jane-advisor" },
  },
  {
    id: 2,
    professional_id: 10,
    status: "published",
    content: "Diversification matters.",
    created_at: "2026-04-30T09:00:00Z",
    professional: { id: 10, name: "Bob Finance", firm_name: "Finance Co", photo_url: null, slug: "bob-finance" },
  },
];

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/feed", {
    method: "GET",
    headers: { "x-forwarded-for": "2.3.4.5" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    // Default: follows (empty) + posts
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // advisor_follows
        return makeBuilder([], null);
      }
      // advisor_posts
      return makeBuilder(MOCK_POSTS, null);
    });
  });

  // ── 429 rate limiting ─────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many requests/i);
  });

  // ── 401 advisor session not found ─────────────────────────────────────────

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 401 auth user not found ───────────────────────────────────────────────

  it("returns 401 when auth user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 200 with posts ────────────────────────────────────────────────────────

  it("returns 200 with posts array", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.posts).toHaveLength(2);
    expect(json.posts[0]).toMatchObject({ status: "published" });
  });

  // ── 200 with empty posts when no follows and no own posts ─────────────────

  it("returns 200 with empty posts array when no posts exist", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        return makeBuilder([], null);
      }
      return makeBuilder(null, null);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.posts).toEqual([]);
  });

  // ── own professional_id always included in feed ───────────────────────────

  it("includes own professional_id in the followed IDs list", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    // The .in() call on advisor_posts should include ADVISOR_ID
    const postsBuilder = mockFrom.mock.results[1]?.value as Record<string, ReturnType<typeof vi.fn>>;
    expect(postsBuilder).toBeDefined();
    const inCall = (postsBuilder.in as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    // inCall[1] is the array of IDs passed to .in()
    expect(Array.isArray(inCall[1])).toBe(true);
    expect((inCall[1] as number[]).includes(ADVISOR_ID)).toBe(true);
  });

  // ── 500 when posts query fails ────────────────────────────────────────────

  it("returns 500 when posts DB query fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        return makeBuilder([], null);
      }
      return makeBuilder(null, { message: "query failed" });
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch feed/i);
  });

  // ── follows merged into ID list ───────────────────────────────────────────

  it("merges followed professional IDs into the posts query", async () => {
    const followedId = 99;
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        return makeBuilder([{ following_professional_id: followedId }], null);
      }
      return makeBuilder(MOCK_POSTS, null);
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const postsBuilder = mockFrom.mock.results[1]?.value as Record<string, ReturnType<typeof vi.fn>>;
    const inCall = (postsBuilder.in as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    const ids = inCall[1] as number[];
    expect(ids).toContain(followedId);
    expect(ids).toContain(ADVISOR_ID);
  });
});
