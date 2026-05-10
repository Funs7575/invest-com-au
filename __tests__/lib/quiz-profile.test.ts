import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// React.cache memoises across calls within a render — tests need
// each call to re-execute, so unwrap cache() back to its identity.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  };
});

const cookieStore = new Map<string, string>();
const setCalls: { name: string; value: string; opts: Record<string, unknown> }[] = [];
const deleteCalls: string[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined,
    set: (
      name: string,
      value: string,
      opts: Record<string, unknown>,
    ) => {
      setCalls.push({ name, value, opts });
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      deleteCalls.push(name);
      cookieStore.delete(name);
    },
  }),
}));

let lookupRow: Record<string, unknown> | null = null;
let lookupError: { message: string } | null = null;

const mockFrom = vi.fn((table: string) => {
  if (table !== "user_quiz_history") {
    throw new Error(`unexpected table: ${table}`);
  }
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () =>
      lookupError
        ? { data: null, error: lookupError }
        : { data: lookupRow, error: null },
  };
  return chain;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  setQuizSessionCookie,
  clearQuizSessionCookie,
  getQuizProfile,
  QUIZ_SESSION_COOKIE,
} from "@/lib/quiz-profile";

describe("setQuizSessionCookie", () => {
  beforeEach(() => {
    cookieStore.clear();
    setCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("sets the cookie with secure flags + 90-day TTL", async () => {
    await setQuizSessionCookie("abc-123");
    const call = setCalls[0];
    expect(call?.name).toBe(QUIZ_SESSION_COOKIE);
    expect(call?.value).toBe("abc-123");
    expect(call?.opts).toMatchObject({
      maxAge: 60 * 60 * 24 * 90,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("trims overly long session ids to 100 chars", async () => {
    const long = "x".repeat(200);
    await setQuizSessionCookie(long);
    expect(setCalls[0]?.value.length).toBe(100);
  });

  it("ignores empty / whitespace-only ids", async () => {
    await setQuizSessionCookie("");
    await setQuizSessionCookie("   ");
    expect(setCalls).toHaveLength(0);
  });

  it("ignores non-string input", async () => {
    // @ts-expect-error guarded against runtime junk
    await setQuizSessionCookie(undefined);
    // @ts-expect-error guarded against runtime junk
    await setQuizSessionCookie(42);
    expect(setCalls).toHaveLength(0);
  });
});

describe("clearQuizSessionCookie", () => {
  beforeEach(() => {
    cookieStore.clear();
    deleteCalls.length = 0;
  });

  it("calls cookies().delete with the cookie name", async () => {
    cookieStore.set(QUIZ_SESSION_COOKIE, "abc");
    await clearQuizSessionCookie();
    expect(deleteCalls).toEqual([QUIZ_SESSION_COOKIE]);
  });
});

describe("getQuizProfile", () => {
  beforeEach(() => {
    cookieStore.clear();
    lookupRow = null;
    lookupError = null;
    vi.clearAllMocks();
  });

  it("returns null when the cookie is absent", async () => {
    expect(await getQuizProfile()).toBeNull();
  });

  it("returns null when the row is not found", async () => {
    cookieStore.set(QUIZ_SESSION_COOKIE, "missing");
    lookupRow = null;
    expect(await getQuizProfile()).toBeNull();
  });

  it("returns null on DB error (swallowed)", async () => {
    cookieStore.set(QUIZ_SESSION_COOKIE, "s1");
    lookupError = { message: "rls" };
    expect(await getQuizProfile()).toBeNull();
  });

  it("returns a profile with vertical + topMatch + completedAt", async () => {
    cookieStore.set(QUIZ_SESSION_COOKIE, "s1");
    lookupRow = {
      session_id: "s1",
      answers: { raw: { investor_country: "united_kingdom" } },
      inferred_vertical: "advisor_match",
      top_match_slug: "stake",
      completed_at: "2026-05-10T12:00:00Z",
      created_at: "2026-05-10T11:55:00Z",
    };

    const profile = await getQuizProfile();
    expect(profile).toEqual({
      sessionId: "s1",
      vertical: "advisor_match",
      topMatchSlug: "stake",
      intentCountry: "uk",
      completedAt: "2026-05-10T12:00:00Z",
      createdAt: "2026-05-10T11:55:00Z",
    });
  });

  it("maps each known quiz country key back to the IntentCountryCode", async () => {
    const cases: [string, string][] = [
      ["united_kingdom", "uk"],
      ["united_states", "us"],
      ["china", "cn"],
      ["india", "in"],
      ["singapore", "sg"],
      ["hong_kong", "hk"],
      ["united_arab_emirates", "ae"],
      ["saudi_arabia", "sa"],
      ["new_zealand", "nz"],
    ];
    for (const [key, expected] of cases) {
      cookieStore.set(QUIZ_SESSION_COOKIE, "s1");
      lookupRow = {
        session_id: "s1",
        answers: { raw: { investor_country: key } },
        inferred_vertical: null,
        top_match_slug: null,
        completed_at: null,
        created_at: "2026-05-10T11:55:00Z",
      };
      const profile = await getQuizProfile();
      expect(profile?.intentCountry).toBe(expected);
    }
  });

  it("falls back to null intentCountry when the answers shape is unexpected", async () => {
    cookieStore.set(QUIZ_SESSION_COOKIE, "s1");
    lookupRow = {
      session_id: "s1",
      answers: null,
      inferred_vertical: null,
      top_match_slug: null,
      completed_at: null,
      created_at: "2026-05-10T11:55:00Z",
    };
    expect((await getQuizProfile())?.intentCountry).toBeNull();

    lookupRow = {
      session_id: "s1",
      answers: { raw: "not-an-object" },
      inferred_vertical: null,
      top_match_slug: null,
      completed_at: null,
      created_at: "2026-05-10T11:55:00Z",
    };
    expect((await getQuizProfile())?.intentCountry).toBeNull();

    lookupRow = {
      session_id: "s1",
      answers: { raw: { investor_country: 42 } },
      inferred_vertical: null,
      top_match_slug: null,
      completed_at: null,
      created_at: "2026-05-10T11:55:00Z",
    };
    expect((await getQuizProfile())?.intentCountry).toBeNull();
  });

  it("returns null intentCountry when the answer is an unknown country key", async () => {
    cookieStore.set(QUIZ_SESSION_COOKIE, "s1");
    lookupRow = {
      session_id: "s1",
      answers: { raw: { investor_country: "atlantis" } },
      inferred_vertical: null,
      top_match_slug: null,
      completed_at: null,
      created_at: "2026-05-10T11:55:00Z",
    };
    expect((await getQuizProfile())?.intentCountry).toBeNull();
  });

  it("returns the profile even when the quiz was abandoned (completedAt = null)", async () => {
    cookieStore.set(QUIZ_SESSION_COOKIE, "s1");
    lookupRow = {
      session_id: "s1",
      answers: {},
      inferred_vertical: "trade",
      top_match_slug: null,
      completed_at: null,
      created_at: "2026-05-10T11:55:00Z",
    };
    const profile = await getQuizProfile();
    expect(profile?.completedAt).toBeNull();
    expect(profile?.vertical).toBe("trade");
  });
});
