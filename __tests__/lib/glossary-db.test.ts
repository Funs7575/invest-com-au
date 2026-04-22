import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

// unstable_cache is a pass-through during tests — we want to exercise
// the underlying fetch, not Next.js cache internals.
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn(
    (fn: (...args: unknown[]) => unknown) => fn,
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

type Row = {
  slug: string;
  term: string;
  definition: string;
  category: string | null;
};

let selectResult: { data: Row[] | null; error: { message: string } | null } = {
  data: [],
  error: null,
};
let throwOnCreate = false;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    if (throwOnCreate) throw new Error("boom");
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => selectResult,
          }),
        }),
      }),
    };
  }),
}));

// Provide a static fallback the helper can return on DB failure
vi.mock("@/lib/glossary", () => ({
  GLOSSARY_ENTRIES: [
    { slug: "fallback-term", term: "Fallback Term", definition: "Static." },
  ],
}));

import { getGlossaryEntries, getGlossaryBySlug } from "@/lib/glossary-db";

// ─── Tests ───────────────────────────────────────────────────────────

describe("getGlossaryEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    throwOnCreate = false;
    selectResult = { data: [], error: null };
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("maps DB rows to GlossaryEntry shape (with category undefined when null)", async () => {
    selectResult = {
      data: [
        { slug: "etf", term: "ETF", definition: "...", category: "basics" },
        { slug: "afsl", term: "AFSL", definition: "...", category: null },
      ],
      error: null,
    };

    const rows = await getGlossaryEntries();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      slug: "etf",
      term: "ETF",
      definition: "...",
      category: "basics",
    });
    expect(rows[1]).toEqual({
      slug: "afsl",
      term: "AFSL",
      definition: "...",
      category: undefined,
    });
  });

  it("falls back to static GLOSSARY_ENTRIES when Supabase returns an error", async () => {
    selectResult = { data: null, error: { message: "db down" } };
    const rows = await getGlossaryEntries();
    expect(rows[0]?.slug).toBe("fallback-term");
  });

  it("falls back to static GLOSSARY_ENTRIES when createClient throws", async () => {
    throwOnCreate = true;
    const rows = await getGlossaryEntries();
    expect(rows[0]?.slug).toBe("fallback-term");
  });

  it("returns [] when the DB returns an empty list (not a failure)", async () => {
    selectResult = { data: [], error: null };
    const rows = await getGlossaryEntries();
    expect(rows).toEqual([]);
  });
});

describe("getGlossaryBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = {
      data: [
        { slug: "etf", term: "ETF", definition: "...", category: "basics" },
        { slug: "afsl", term: "AFSL", definition: "...", category: null },
      ],
      error: null,
    };
  });

  it("returns the matching entry by slug", async () => {
    const entry = await getGlossaryBySlug("afsl");
    expect(entry).toEqual({
      slug: "afsl",
      term: "AFSL",
      definition: "...",
      category: undefined,
    });
  });

  it("returns null when the slug isn't found", async () => {
    const entry = await getGlossaryBySlug("does-not-exist");
    expect(entry).toBeNull();
  });
});
