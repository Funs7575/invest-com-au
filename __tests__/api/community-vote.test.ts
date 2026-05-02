import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
}));

import { POST } from "@/app/api/community/vote/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = "user-abc";
const AUTHOR_ID = "author-xyz";
const TARGET_ID = 123;

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/community/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Builder for a single() call (target fetch, existing-vote check). */
function makeSingleBuilder(data: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

/** Builder for terminal .update().eq() or .delete().eq() calls. */
function makeTerminalBuilder() {
  return {
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ error: null })),
  };
}

/** Builder for insert. */
function makeInsertBuilder(error: unknown = null) {
  return { insert: vi.fn(() => Promise.resolve({ error })) };
}

/** Builder for reputation upsert (fire-and-forget). */
function makeUpsertBuilder() {
  return { upsert: vi.fn(() => Promise.resolve({ error: null })) };
}


/**
 * Set up mockAdminFrom to respond to the full sequence of DB calls
 * that the POST /community/vote handler makes when casting a NEW vote.
 *
 * Sequence (table, operation):
 * 1. target_table    — select().eq().eq().single()          (fetch target)
 * 2. forum_votes     — select().eq().eq().eq().single()     (check existing)
 * 3. forum_votes     — insert()                             (record vote)
 * 4. target_table    — update().eq()                        (update score)
 * 5. f_u_profiles    — upsert()                             (ensure profile)
 */
function setupNewVoteMocks(target: unknown, targetTable = "forum_threads") {
  mockAdminFrom
    .mockImplementationOnce((t: string) => {
      expect(t).toBe(targetTable);
      return makeSingleBuilder(target, null);
    })
    .mockImplementationOnce((t: string) => {
      expect(t).toBe("forum_votes");
      return makeSingleBuilder(null, null); // no existing vote
    })
    .mockImplementationOnce((t: string) => {
      expect(t).toBe("forum_votes");
      return makeInsertBuilder(null);
    })
    .mockImplementationOnce(() => makeTerminalBuilder())    // score update
    .mockImplementationOnce(() => makeUpsertBuilder());    // ensure profile
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/community/vote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: "user@example.com" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("not logged in") });
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when required fields missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when target_type is invalid", async () => {
    const res = await POST(makeRequest({ target_type: "comment", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when vote value is invalid", async () => {
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when target not found", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(null, { message: "not found" }));
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when user tries to vote on own content", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder({ id: TARGET_ID, author_id: USER_ID, vote_score: 0 }, null));
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/cannot vote/i);
  });

  it("records new upvote and returns updated score", async () => {
    const target = { id: TARGET_ID, author_id: AUTHOR_ID, vote_score: 3 };
    setupNewVoteMocks(target);
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vote_score).toBe(4); // 3 + 1
  });

  it("toggles vote off when same vote submitted again", async () => {
    const target = { id: TARGET_ID, author_id: AUTHOR_ID, vote_score: 5 };
    mockAdminFrom
      .mockImplementationOnce(() => makeSingleBuilder(target, null))           // fetch target
      .mockImplementationOnce(() => makeSingleBuilder({ id: "v1", value: 1 }, null)) // existing vote
      .mockImplementationOnce(() => makeTerminalBuilder())                     // delete vote
      .mockImplementationOnce(() => makeTerminalBuilder())                     // score update
      .mockImplementationOnce(() => makeUpsertBuilder());                      // ensure profile
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vote_score).toBe(4); // 5 - 1 (toggle off)
  });

  it("flips vote direction (+2 swing) when opposite vote submitted", async () => {
    const target = { id: TARGET_ID, author_id: AUTHOR_ID, vote_score: 2 };
    mockAdminFrom
      .mockImplementationOnce(() => makeSingleBuilder(target, null))            // fetch target
      .mockImplementationOnce(() => makeSingleBuilder({ id: "v1", value: -1 }, null)) // existing downvote
      .mockImplementationOnce(() => makeTerminalBuilder())                      // update vote record
      .mockImplementationOnce(() => makeTerminalBuilder())                      // score update
      .mockImplementationOnce(() => makeUpsertBuilder());                       // ensure profile
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vote_score).toBe(4); // 2 + 2 (flip from -1 to +1)
  });

  it("returns 500 when vote insert fails", async () => {
    const target = { id: TARGET_ID, author_id: AUTHOR_ID, vote_score: 0 };
    mockAdminFrom
      .mockImplementationOnce(() => makeSingleBuilder(target, null))
      .mockImplementationOnce(() => makeSingleBuilder(null, null))
      .mockImplementationOnce(() => makeInsertBuilder({ message: "insert failed" }));
    const res = await POST(makeRequest({ target_type: "thread", target_id: TARGET_ID, vote: 1 }));
    expect(res.status).toBe(500);
  });

  it("works for post target_type", async () => {
    const target = { id: 456, author_id: AUTHOR_ID, vote_score: 1 };
    setupNewVoteMocks(target, "forum_posts");
    const res = await POST(makeRequest({ target_type: "post", target_id: 456, vote: -1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vote_score).toBe(0); // 1 + (-1)
  });
});
