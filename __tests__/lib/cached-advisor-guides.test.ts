import { describe, it, expect, vi } from "vitest";

// Stub the cache wrapper so cached() returns the fn unchanged, and
// stub supabase-js createClient so the module load doesn't connect.
vi.mock("@/lib/cache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cache")>(
    "@/lib/cache",
  );
  return {
    ...actual,
    cached: (fn: unknown) => fn,
  };
});

const mockSingle = vi.fn();
const mockSelectAll = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: (cols: string) => {
        if (cols === "slug") {
          return {
            // simulate .select('slug') — awaitable directly in lib
            then: (cb: (v: unknown) => unknown) =>
              Promise.resolve(cb(mockSelectAll())),
          };
        }
        return {
          eq: () => ({ single: async () => mockSingle() }),
        };
      },
    })),
  })),
}));

import {
  getAdvisorGuide,
  getAllAdvisorGuideSlugs,
} from "@/lib/cached-advisor-guides";

describe("getAdvisorGuide", () => {
  it("returns undefined when no row is found", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "no row" } });
    expect(await getAdvisorGuide("unknown")).toBeUndefined();
  });

  it("returns undefined on DB error", async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    expect(await getAdvisorGuide("x")).toBeUndefined();
  });

  it("transforms DB row into AdvisorGuide shape", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        slug: "choose-smsf",
        advisor_type: "smsf_accountant",
        title: "Choose SMSF",
        meta_description: "Meta",
        intro: "Intro",
        sections: [{ heading: "A", body: "B" }],
        checklist: ["c1"],
        red_flags: ["r1"],
        faqs: [{ question: "Q1", answer: "A1" }],
        cost_guide: null,
      },
      error: null,
    });
    const guide = await getAdvisorGuide("choose-smsf");
    expect(guide?.slug).toBe("choose-smsf");
    expect(guide?.type).toBe("smsf_accountant");
    expect(guide?.title).toBe("Choose SMSF");
    expect(guide?.metaDescription).toBe("Meta");
    expect(guide?.intro).toBe("Intro");
    expect(guide?.sections).toEqual([{ heading: "A", body: "B" }]);
    expect(guide?.checklist).toEqual(["c1"]);
    expect(guide?.redFlags).toEqual(["r1"]);
    // FAQ normalised from {question,answer} to {q,a}
    expect(guide?.faqs).toEqual([{ q: "Q1", a: "A1" }]);
  });

  it("coerces nullable text fields to empty strings + nullable arrays to []", async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 1,
        slug: "x",
        advisor_type: "financial_planner",
        title: "T",
        meta_description: null,
        intro: null,
        sections: null,
        checklist: null,
        red_flags: null,
        faqs: null,
        cost_guide: null,
      },
      error: null,
    });
    const guide = await getAdvisorGuide("x");
    expect(guide?.metaDescription).toBe("");
    expect(guide?.intro).toBe("");
    expect(guide?.sections).toEqual([]);
    expect(guide?.checklist).toEqual([]);
    expect(guide?.redFlags).toEqual([]);
    expect(guide?.faqs).toEqual([]);
  });
});

describe("getAllAdvisorGuideSlugs", () => {
  it("returns list of slugs from the table", async () => {
    mockSelectAll.mockReturnValueOnce({
      data: [{ slug: "a" }, { slug: "b" }, { slug: "c" }],
    });
    const slugs = await getAllAdvisorGuideSlugs();
    expect(slugs).toEqual(["a", "b", "c"]);
  });

  it("returns [] when data is null", async () => {
    mockSelectAll.mockReturnValueOnce({ data: null });
    expect(await getAllAdvisorGuideSlugs()).toEqual([]);
  });
});
