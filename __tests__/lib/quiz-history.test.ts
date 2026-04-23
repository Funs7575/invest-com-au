import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let insertError: { message: string } | null = null;
let insertedId: number | null = 42;
let latestRow: unknown = null;
let listRows: unknown[] = [];
let updateCount = 0;
let updateError: { message: string } | null = null;

const insertCalls: Record<string, unknown>[] = [];
const updateCalls: Record<string, unknown>[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table !== "user_quiz_history") {
    throw new Error(`unexpected table: ${table}`);
  }
  return {
    insert: (row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          insertCalls.push(row);
          return insertError
            ? { data: null, error: insertError }
            : { data: { id: insertedId }, error: null };
        },
      }),
    }),
    select: () => {
      const chain = {
        eq: () => chain,
        order: () => chain,
        limit: (n: number) => {
          if (n === 1) {
            return {
              maybeSingle: async () => ({ data: latestRow, error: null }),
            };
          }
          return Promise.resolve({ data: listRows, error: null });
        },
      };
      return chain;
    },
    update: (payload: Record<string, unknown>) => {
      const chain = {
        eq: () => chain,
        is: async () => {
          updateCalls.push(payload);
          return { count: updateCount, error: updateError };
        },
      };
      return chain;
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  recordQuizSubmission,
  getLatestForUser,
  getLatestForSession,
  listForUser,
  claimSessionQuizzes,
} from "@/lib/quiz-history";

describe("recordQuizSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    insertedId = 42;
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns the new id on happy path", async () => {
    const id = await recordQuizSubmission({
      userId: "u1",
      answers: { a: 1 },
    });
    expect(id).toBe(42);
    expect(insertCalls[0]).toMatchObject({
      user_id: "u1",
      session_id: null,
      answers: { a: 1 },
      inferred_vertical: null,
      top_match_slug: null,
      completed_at: null,
      resumed_from: null,
    });
  });

  it("stamps completed_at when completed=true", async () => {
    await recordQuizSubmission({ userId: "u1", answers: {}, completed: true });
    expect(insertCalls[0]?.completed_at).toEqual(expect.any(String));
  });

  it("coerces omitted userId + sessionId to null", async () => {
    await recordQuizSubmission({ answers: {} });
    expect(insertCalls[0]?.user_id).toBeNull();
    expect(insertCalls[0]?.session_id).toBeNull();
  });

  it("returns null when insert fails", async () => {
    insertError = { message: "constraint" };
    expect(await recordQuizSubmission({ answers: {} })).toBeNull();
  });
});

describe("getLatestForUser / getLatestForSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestRow = null;
  });

  it("returns null when there's no history", async () => {
    expect(await getLatestForUser("u1")).toBeNull();
    expect(await getLatestForSession("s1")).toBeNull();
  });

  it("returns the row when one exists", async () => {
    latestRow = { id: 1, user_id: "u1", answers: {} };
    expect(await getLatestForUser("u1")).toEqual(latestRow);
    expect(await getLatestForSession("s1")).toEqual(latestRow);
  });
});

describe("listForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRows = [];
  });

  it("returns [] when empty", async () => {
    expect(await listForUser("u1")).toEqual([]);
  });

  it("returns rows as-is", async () => {
    listRows = [{ id: 1 }, { id: 2 }];
    const res = await listForUser("u1");
    expect(res).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe("claimSessionQuizzes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCount = 0;
    updateError = null;
    updateCalls.length = 0;
  });

  it("returns 0 and emits no error when nothing to claim", async () => {
    updateCount = 0;
    expect(await claimSessionQuizzes("s1", "u1")).toBe(0);
  });

  it("returns count when rows are claimed", async () => {
    updateCount = 3;
    expect(await claimSessionQuizzes("s1", "u1")).toBe(3);
    expect(updateCalls[0]).toEqual({ user_id: "u1" });
  });

  it("returns 0 on DB error (swallowed)", async () => {
    updateError = { message: "rls" };
    updateCount = 5;
    expect(await claimSessionQuizzes("s1", "u1")).toBe(0);
  });
});
