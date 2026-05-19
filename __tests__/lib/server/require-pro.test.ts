import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
let subData: { status: string } | null = null;

const mockFrom = vi.fn(() => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: subData, error: null }),
  };
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import {
  requirePro,
  gateContent,
  truncateText,
  truncateHtml,
} from "@/lib/server/require-pro";

describe("requirePro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subData = null;
  });

  it("returns isPro=false for anonymous users", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await requirePro();
    expect(res.isPro).toBe(false);
    expect(res.user).toBeNull();
  });

  it("returns isPro=true for active subscription", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = { status: "active" };
    const res = await requirePro();
    expect(res.isPro).toBe(true);
  });

  it("returns isPro=false for past_due subscription", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    subData = { status: "past_due" };
    const res = await requirePro();
    expect(res.isPro).toBe(false);
  });
});

describe("gateContent", () => {
  it("returns premium content when isPro is true", () => {
    expect(gateContent(true, "premium", "free")).toBe("premium");
  });

  it("returns free content when isPro is false", () => {
    expect(gateContent(false, "premium", "free")).toBe("free");
  });

  it("works with arrays", () => {
    expect(gateContent(true, [1, 2, 3], [1])).toEqual([1, 2, 3]);
    expect(gateContent(false, [1, 2, 3], [1])).toEqual([1]);
  });
});

describe("truncateText", () => {
  it("returns input unchanged when shorter than max", () => {
    expect(truncateText("short", 100)).toBe("short");
  });

  it("returns empty string for empty input", () => {
    expect(truncateText("", 10)).toBe("");
  });

  it("truncates at word boundary when possible", () => {
    const out = truncateText("the quick brown fox jumps over the lazy dog", 20);
    expect(out.endsWith("…")).toBe(true);
    const prefix = out.slice(0, -1);
    // Prefix must be a clean word-aligned cut: a complete prefix of the
    // original text and not end with whitespace.
    expect("the quick brown fox jumps over the lazy dog".startsWith(prefix)).toBe(true);
    expect(prefix).not.toMatch(/\s$/);
  });

  it("falls back to hard cut when no word boundary in range", () => {
    const out = truncateText("aaaaaaaaaaaaaaaaaaaaaa", 10);
    expect(out).toBe("aaaaaaaaaa…");
  });
});

describe("truncateHtml", () => {
  it("returns input unchanged when visible text shorter than max", () => {
    expect(truncateHtml("<p>short</p>", 100)).toBe("<p>short</p>");
  });

  it("counts only visible characters, not tag chars", () => {
    const html = "<div class='huge-class-name-that-is-very-long'>abc</div>";
    expect(truncateHtml(html, 100)).toBe(html);
  });

  it("truncates to roughly max visible chars", () => {
    const longHtml = "<p>" + "a".repeat(100) + "</p><p>" + "b".repeat(100) + "</p>";
    const out = truncateHtml(longHtml, 50);
    expect(out.endsWith("…")).toBe(true);
    const visibleText = out.replace(/<[^>]*>/g, "").replace(/…$/, "");
    expect(visibleText.length).toBeLessThanOrEqual(55);
  });

  it("returns empty string for empty input", () => {
    expect(truncateHtml("", 10)).toBe("");
  });
});
