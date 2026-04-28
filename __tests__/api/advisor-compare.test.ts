import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/advisor-compare/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(slugs: string[] = []): NextRequest {
  const url = new URL("http://localhost/api/advisor-compare");
  for (const s of slugs) url.searchParams.append("slugs", s);
  return new NextRequest(url.toString(), { method: "GET" });
}

function makeChain(result: { data: unknown[] | null; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const ADVISOR_A = { id: 1, slug: "alice-fp", name: "Alice" };
const ADVISOR_B = { id: 2, slug: "bob-fp", name: "Bob" };
const ADVISOR_C = { id: 3, slug: "carol-fp", name: "Carol" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-compare", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty advisors array when no slugs provided", async () => {
    const res = await GET(makeGet([]));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisors).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns advisors in requested slug order", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: [ADVISOR_B, ADVISOR_A], error: null }),
    );
    const res = await GET(makeGet(["alice-fp", "bob-fp"]));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisors[0].slug).toBe("alice-fp");
    expect(json.advisors[1].slug).toBe("bob-fp");
  });

  it("filters out slugs not found in DB result", async () => {
    // Only ADVISOR_A returned — ADVISOR_B slug not in DB
    mockFrom.mockReturnValue(
      makeChain({ data: [ADVISOR_A], error: null }),
    );
    const res = await GET(makeGet(["alice-fp", "missing-slug"]));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisors).toHaveLength(1);
    expect(json.advisors[0].slug).toBe("alice-fp");
  });

  it("caps slugs at 4 even if more than 4 are passed", async () => {
    const fiveSlugs = ["a", "b", "c", "d", "e"];
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    await GET(makeGet(fiveSlugs));
    // The .in() call should have been passed at most 4 slugs
    const chain = mockFrom.mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>;
    const inCall = (chain.in as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string[]];
    expect(inCall[1]).toHaveLength(4);
    expect(inCall[1]).not.toContain("e");
  });

  it("returns 500 when DB query errors", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "db failure" } }),
    );
    const res = await GET(makeGet(["alice-fp"]));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns all three advisors ordered correctly when three slugs match", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: [ADVISOR_C, ADVISOR_A, ADVISOR_B], error: null }),
    );
    const res = await GET(makeGet(["alice-fp", "bob-fp", "carol-fp"]));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisors.map((a: { slug: string }) => a.slug)).toEqual([
      "alice-fp",
      "bob-fp",
      "carol-fp",
    ]);
  });
});
