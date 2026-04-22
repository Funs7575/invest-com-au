import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

type Row = Record<string, unknown>;

// Per-table select data
let selectData: Row[] = [];
let upsertError: { message: string } | null = null;
let deleteError: { message: string } | null = null;
let throwOnFrom = false;

// Capture calls
type UpsertCall = { table: string; rows: Row[] | Row; onConflict?: string };
const upsertCalls: UpsertCall[] = [];
type UpdateCall = { table: string; payload: Row };
const updateCalls: UpdateCall[] = [];
const deleteCalls: { table: string; eqs: Array<[string, unknown]> }[] = [];
type SelectCall = { table: string; eqs: Array<[string, unknown]>; is: Array<[string, unknown]> };
const selectCalls: SelectCall[] = [];

const mockFrom = vi.fn((table: string) => {
  if (throwOnFrom) throw new Error("boom");

  return {
    upsert: async (rows: Row | Row[], opts?: { onConflict?: string }) => {
      upsertCalls.push({ table, rows, onConflict: opts?.onConflict });
      return { data: null, error: upsertError };
    },

    select: (_cols: string) => {
      // select chain: select().eq().eq?().is?().order?()
      const call: SelectCall = { table, eqs: [], is: [] };
      selectCalls.push(call);
      const chain: {
        eq: (col: string, val: unknown) => typeof chain;
        is: (col: string, val: unknown) => typeof chain;
        order: (col: string, opts?: unknown) => Promise<{ data: Row[]; error: null }>;
        then: (
          a?: (v: { data: Row[]; error: null }) => unknown,
          b?: (e: unknown) => unknown,
        ) => Promise<unknown>;
      } = {
        eq(col, val) {
          call.eqs.push([col, val]);
          return chain;
        },
        is(col, val) {
          call.is.push([col, val]);
          // Return resolved thenable that behaves like the chain AND is awaitable
          // For simpler test shape: return chain so callers can still chain order() if needed
          return chain;
        },
        order: async () => ({ data: selectData, error: null }),
        then: (a, b) =>
          Promise.resolve({ data: selectData, error: null }).then(a, b),
      };
      return chain;
    },

    delete: () => {
      const call: { table: string; eqs: Array<[string, unknown]> } = {
        table,
        eqs: [],
      };
      deleteCalls.push(call);
      const chain: {
        eq: (col: string, val: unknown) => typeof chain;
        then: (
          a?: (v: { data: null; error: typeof deleteError }) => unknown,
          b?: (e: unknown) => unknown,
        ) => Promise<unknown>;
      } = {
        eq(col, val) {
          call.eqs.push([col, val]);
          return chain;
        },
        then: (a, b) =>
          Promise.resolve({ data: null, error: deleteError }).then(a, b),
      };
      return chain;
    },

    update: (payload: Row) => {
      updateCalls.push({ table, payload });
      const chain: {
        eq: (col: string, val: unknown) => typeof chain;
        is: (col: string, val: unknown) => typeof chain;
        then: (
          a?: (v: { data: null; error: null }) => unknown,
          b?: (e: unknown) => unknown,
        ) => Promise<unknown>;
      } = {
        eq() {
          return chain;
        },
        is() {
          return chain;
        },
        then: (a, b) =>
          Promise.resolve({ data: null, error: null }).then(a, b),
      };
      return chain;
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  listBookmarks,
  addBookmark,
  removeBookmark,
  addAnonymousSave,
  listAnonymousSaves,
  claimAnonymousSaves,
} from "@/lib/bookmarks";

// ─── Tests ───────────────────────────────────────────────────────────

describe("bookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectData = [];
    upsertError = null;
    deleteError = null;
    throwOnFrom = false;
    upsertCalls.length = 0;
    updateCalls.length = 0;
    deleteCalls.length = 0;
    selectCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("listBookmarks", () => {
    it("returns rows scoped to the given userId, ordered desc", async () => {
      selectData = [
        {
          id: 1,
          user_id: "u1",
          bookmark_type: "broker",
          ref: "commsec",
          label: null,
          note: null,
          created_at: "2026-04-01T00:00:00Z",
        },
      ];
      const rows = await listBookmarks("u1");
      expect(rows).toHaveLength(1);
      expect(selectCalls.some((c) => c.eqs.some(([k, v]) => k === "user_id" && v === "u1"))).toBe(true);
    });

    it("returns [] on error (never throws — keeps the bookmark star from breaking the page)", async () => {
      throwOnFrom = true;
      expect(await listBookmarks("u1")).toEqual([]);
    });

    it("returns [] when supabase returns null data", async () => {
      selectData = [];
      expect(await listBookmarks("u1")).toEqual([]);
    });
  });

  describe("addBookmark", () => {
    it("upserts with onConflict=user_id,bookmark_type,ref and null defaults for label/note", async () => {
      const ok = await addBookmark({
        userId: "u1",
        type: "article",
        ref: "etf-guide",
      });
      expect(ok).toBe(true);

      expect(upsertCalls).toHaveLength(1);
      const call = upsertCalls[0]!;
      expect(call.table).toBe("user_bookmarks");
      expect(call.onConflict).toBe("user_id,bookmark_type,ref");
      const row = call.rows as Row;
      expect(row).toMatchObject({
        user_id: "u1",
        bookmark_type: "article",
        ref: "etf-guide",
        label: null,
        note: null,
      });
    });

    it("honours provided label + note", async () => {
      await addBookmark({
        userId: "u1",
        type: "scenario",
        ref: "s1",
        label: "Super plan",
        note: "consolidate AMP",
      });
      const row = upsertCalls[0]!.rows as Row;
      expect(row.label).toBe("Super plan");
      expect(row.note).toBe("consolidate AMP");
    });

    it("returns false when the upsert errors", async () => {
      upsertError = { message: "fk" };
      const ok = await addBookmark({
        userId: "u1",
        type: "broker",
        ref: "x",
      });
      expect(ok).toBe(false);
    });

    it("returns false on thrown error", async () => {
      throwOnFrom = true;
      expect(
        await addBookmark({ userId: "u1", type: "broker", ref: "x" }),
      ).toBe(false);
    });
  });

  describe("removeBookmark", () => {
    it("deletes scoped by user_id + bookmark_type + ref", async () => {
      const ok = await removeBookmark({
        userId: "u1",
        type: "broker",
        ref: "commsec",
      });
      expect(ok).toBe(true);
      expect(deleteCalls).toHaveLength(1);
      const eqs = deleteCalls[0]!.eqs;
      expect(eqs).toEqual(
        expect.arrayContaining([
          ["user_id", "u1"],
          ["bookmark_type", "broker"],
          ["ref", "commsec"],
        ]),
      );
    });

    it("returns false on thrown error", async () => {
      throwOnFrom = true;
      expect(
        await removeBookmark({ userId: "u1", type: "broker", ref: "x" }),
      ).toBe(false);
    });
  });

  describe("anonymous saves + claim", () => {
    it("addAnonymousSave upserts with onConflict=session_id,bookmark_type,ref", async () => {
      const ok = await addAnonymousSave({
        sessionId: "sess1",
        type: "advisor",
        ref: "a-42",
      });
      expect(ok).toBe(true);
      const call = upsertCalls[0]!;
      expect(call.table).toBe("anonymous_saves");
      expect(call.onConflict).toBe("session_id,bookmark_type,ref");
    });

    it("listAnonymousSaves scopes by session_id and only claimed_at IS NULL", async () => {
      selectData = [
        {
          bookmark_type: "broker",
          ref: "r1",
          label: null,
          created_at: "2026-04-01T00:00:00Z",
        },
      ];
      const rows = await listAnonymousSaves("sess1");
      expect(rows).toHaveLength(1);
      // Only unclaimed rows
      expect(
        selectCalls.some((c) => c.is.some(([k, v]) => k === "claimed_at" && v === null)),
      ).toBe(true);
      expect(
        selectCalls.some((c) => c.eqs.some(([k, v]) => k === "session_id" && v === "sess1")),
      ).toBe(true);
    });

    it("claimAnonymousSaves returns 0 when there are no pending saves", async () => {
      selectData = []; // listAnonymousSaves will return []
      const count = await claimAnonymousSaves("sess1", "u1");
      expect(count).toBe(0);
      // No user_bookmarks upsert when nothing to claim
      expect(
        upsertCalls.filter((c) => c.table === "user_bookmarks"),
      ).toHaveLength(0);
    });

    it("claimAnonymousSaves replays pending rows into user_bookmarks and stamps claimed_at", async () => {
      selectData = [
        {
          bookmark_type: "broker",
          ref: "commsec",
          label: null,
          created_at: "2026-04-01T00:00:00Z",
        },
        {
          bookmark_type: "article",
          ref: "etf-guide",
          label: "ETF 101",
          created_at: "2026-04-02T00:00:00Z",
        },
      ];

      const count = await claimAnonymousSaves("sess1", "user-42");
      expect(count).toBe(2);

      // user_bookmarks upsert with both rows + correct user_id
      const userUpsert = upsertCalls.find((c) => c.table === "user_bookmarks");
      expect(userUpsert).toBeDefined();
      const rows = userUpsert!.rows as Row[];
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        user_id: "user-42",
        bookmark_type: "broker",
        ref: "commsec",
      });

      // anonymous_saves update stamps claimed_at + claimed_by_user_id
      const update = updateCalls.find((c) => c.table === "anonymous_saves");
      expect(update).toBeDefined();
      expect(update!.payload.claimed_by_user_id).toBe("user-42");
      expect(update!.payload.claimed_at).toEqual(expect.any(String));
    });

    it("claimAnonymousSaves returns 0 when the upsert errors (no partial claim)", async () => {
      selectData = [
        {
          bookmark_type: "broker",
          ref: "commsec",
          label: null,
          created_at: "2026-04-01T00:00:00Z",
        },
      ];
      upsertError = { message: "boom" };
      const count = await claimAnonymousSaves("sess1", "u1");
      expect(count).toBe(0);
      // Don't stamp anonymous_saves as claimed if the replay failed
      const stamp = updateCalls.find((c) => c.table === "anonymous_saves");
      expect(stamp).toBeUndefined();
    });
  });
});
