import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for the brief-messages helpers (Ship #10 / MM32).
 *
 * Covers:
 *   - sendMessage happy path → returns inserted row
 *   - sendMessage rejects empty bodies + bodies over 4000 chars
 *   - sendMessage requires sender_professional_id when kind='professional'
 *   - listMessagesForBrief returns rows in chronological order
 *   - markRead is idempotent (no-ops when nothing left to mark)
 *
 * The admin client is mocked via `vi.hoisted` so the import order doesn't
 * race vi.mock hoisting (CLAUDE.md: "vi.mock(...) is hoisted to the top
 * of the test file before any const/let").
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// Import AFTER the mock so the helpers see the mocked admin client.
import {
  BRIEF_MESSAGE_MAX_BODY_LENGTH,
  BriefMessageError,
  listMessagesForBrief,
  markRead,
  sendMessage,
} from "@/lib/brief-messages";

// ── Tiny chainable mock-builder factory ────────────────────────────────────────

interface ChainOptions {
  /** Resolved promise when the query chain ends in `.order(...)` (list). */
  order?: { data: unknown; error?: unknown };
  /** Resolved promise when the query chain ends in `.single()`. */
  single?: { data: unknown; error?: unknown };
  /** Resolved promise when the query chain ends in `.select(...)` after update. */
  selectAfterUpdate?: { data: unknown; error?: unknown };
}

function chain(opts: ChainOptions = {}) {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  for (const m of ["insert", "update", "delete", "eq", "in", "is", "limit"]) {
    builder[m] = vi.fn(passthrough);
  }
  // `.select(...)` may be terminal (after update with .select()) or
  // mid-chain (before .eq/.order). We make it return either the resolved
  // promise (when selectAfterUpdate is supplied) or the builder.
  builder.select = vi.fn(() => {
    if (opts.selectAfterUpdate) {
      // Thenable + chainable: the helper does .update(...).eq(...).is(...).select("id")
      // and awaits the result directly. Returning a promise here satisfies that.
      return Promise.resolve(opts.selectAfterUpdate);
    }
    return builder;
  });
  // `.order(...)` is terminal for list queries.
  builder.order = vi.fn(() =>
    opts.order ? Promise.resolve(opts.order) : builder,
  );
  builder.single = vi.fn(() =>
    Promise.resolve(opts.single ?? { data: null, error: null }),
  );
  return builder;
}

// ── sendMessage ────────────────────────────────────────────────────────────────

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts the row and returns it on the happy path", async () => {
    const inserted = {
      id: 7,
      brief_id: 42,
      sender_kind: "consumer",
      sender_user_id: "u-1",
      sender_professional_id: null,
      sender_team_id: null,
      body: "Hi there!",
      read_by_consumer_at: null,
      read_by_pro_at: null,
      created_at: "2026-05-15T00:00:00Z",
    };
    mockFrom.mockReturnValueOnce(chain({ single: { data: inserted } }));

    const row = await sendMessage({
      briefId: 42,
      senderKind: "consumer",
      senderUserId: "u-1",
      body: "Hi there!",
    });

    expect(row.id).toBe(7);
    expect(row.body).toBe("Hi there!");
    expect(row.sender_kind).toBe("consumer");
    expect(mockFrom).toHaveBeenCalledWith("brief_messages");
  });

  it("rejects an empty body with a 400 BriefMessageError", async () => {
    await expect(
      sendMessage({ briefId: 1, senderKind: "consumer", body: "   " }),
    ).rejects.toMatchObject({
      name: "BriefMessageError",
      status: 400,
    });
    // No DB call should have been issued for input validation failures.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects a body over BRIEF_MESSAGE_MAX_BODY_LENGTH (4000)", async () => {
    const tooLong = "x".repeat(BRIEF_MESSAGE_MAX_BODY_LENGTH + 1);
    await expect(
      sendMessage({ briefId: 1, senderKind: "consumer", body: tooLong }),
    ).rejects.toBeInstanceOf(BriefMessageError);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("requires sender_professional_id when sender_kind='professional'", async () => {
    await expect(
      sendMessage({ briefId: 1, senderKind: "professional", body: "Hi" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("requires sender_team_id when sender_kind='team'", async () => {
    await expect(
      sendMessage({ briefId: 1, senderKind: "team", body: "Hi" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("accepts boundary length (exactly 4000 chars)", async () => {
    const exact = "y".repeat(BRIEF_MESSAGE_MAX_BODY_LENGTH);
    const inserted = {
      id: 8,
      brief_id: 1,
      sender_kind: "consumer",
      sender_user_id: null,
      sender_professional_id: null,
      sender_team_id: null,
      body: exact,
      read_by_consumer_at: null,
      read_by_pro_at: null,
      created_at: "2026-05-15T00:00:00Z",
    };
    mockFrom.mockReturnValueOnce(chain({ single: { data: inserted } }));

    const row = await sendMessage({
      briefId: 1,
      senderKind: "consumer",
      body: exact,
    });
    expect(row.body.length).toBe(BRIEF_MESSAGE_MAX_BODY_LENGTH);
  });
});

// ── listMessagesForBrief ───────────────────────────────────────────────────────

describe("listMessagesForBrief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rows in chronological order (oldest first)", async () => {
    const ordered = [
      {
        id: 1,
        brief_id: 9,
        sender_kind: "consumer",
        sender_user_id: null,
        sender_professional_id: null,
        sender_team_id: null,
        body: "first",
        read_by_consumer_at: null,
        read_by_pro_at: null,
        created_at: "2026-05-15T00:00:00Z",
      },
      {
        id: 2,
        brief_id: 9,
        sender_kind: "professional",
        sender_user_id: null,
        sender_professional_id: 11,
        sender_team_id: null,
        body: "second",
        read_by_consumer_at: null,
        read_by_pro_at: null,
        created_at: "2026-05-15T00:01:00Z",
      },
    ];
    mockFrom.mockReturnValueOnce(chain({ order: { data: ordered } }));

    const rows = await listMessagesForBrief(9);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.body).toBe("first");
    expect(rows[1]?.body).toBe("second");
    // Sanity: the first row's created_at is earlier.
    expect(
      new Date(rows[0]!.created_at).getTime() <
        new Date(rows[1]!.created_at).getTime(),
    ).toBe(true);
  });

  it("returns an empty array when no rows exist", async () => {
    mockFrom.mockReturnValueOnce(chain({ order: { data: [] } }));
    const rows = await listMessagesForBrief(123);
    expect(rows).toEqual([]);
  });

  it("throws a BriefMessageError when the query fails", async () => {
    mockFrom.mockReturnValueOnce(
      chain({ order: { data: null, error: { message: "boom" } } }),
    );
    await expect(listMessagesForBrief(123)).rejects.toBeInstanceOf(
      BriefMessageError,
    );
  });
});

// ── markRead ───────────────────────────────────────────────────────────────────

describe("markRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the number of rows whose read_by_consumer_at was flipped", async () => {
    mockFrom.mockReturnValueOnce(
      chain({ selectAfterUpdate: { data: [{ id: 1 }, { id: 2 }] } }),
    );
    const n = await markRead({ briefId: 42, asKind: "consumer" });
    expect(n).toBe(2);
  });

  it("is idempotent — returns 0 when there's nothing left to mark", async () => {
    // Second call sees no unread rows (the IS NULL filter excludes them).
    mockFrom.mockReturnValueOnce(
      chain({ selectAfterUpdate: { data: [] } }),
    );
    const n = await markRead({ briefId: 42, asKind: "consumer" });
    expect(n).toBe(0);
  });

  it("flips the pro column when asKind='pro'", async () => {
    mockFrom.mockReturnValueOnce(
      chain({ selectAfterUpdate: { data: [{ id: 3 }] } }),
    );
    const n = await markRead({ briefId: 42, asKind: "pro" });
    expect(n).toBe(1);
  });

  it("returns 0 (fail-soft) when the DB returns an error", async () => {
    mockFrom.mockReturnValueOnce(
      chain({
        selectAfterUpdate: { data: null, error: { message: "permission denied" } },
      }),
    );
    const n = await markRead({ briefId: 42, asKind: "consumer" });
    expect(n).toBe(0);
  });
});
