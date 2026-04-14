import { describe, it, expect, vi, beforeEach } from "vitest";

// Track every call and the args it got
const calls: Array<{ tag: string; profile: unknown }> = [];

vi.mock("next/cache", () => ({
  revalidateTag: (tag: string, profile: unknown) => {
    calls.push({ tag, profile });
  },
}));

import {
  revalidateBrokerTags,
  revalidateArticleTags,
  revalidateAdvisorTags,
  revalidateReviewTags,
  revalidateAllPublicTags,
} from "@/lib/revalidation";

beforeEach(() => {
  calls.length = 0;
});

describe("revalidateBrokerTags", () => {
  it("invalidates the full broker tag set", () => {
    revalidateBrokerTags();
    const tags = calls.map((c) => c.tag);
    expect(tags).toContain("brokers");
    expect(tags).toContain("brokers-listing");
    expect(tags).toContain("brokers-full");
    expect(tags).toContain("brokers-fx");
    expect(tags).toContain("broker-detail");
  });

  it("adds a slug-specific tag when a slug is provided", () => {
    revalidateBrokerTags("vanguard");
    const tags = calls.map((c) => c.tag);
    expect(tags).toContain("broker-detail-vanguard");
  });

  it("omits the slug-specific tag when slug is null", () => {
    revalidateBrokerTags(null);
    const tags = calls.map((c) => c.tag);
    expect(tags.some((t) => t.startsWith("broker-detail-"))).toBe(false);
  });

  it("always passes a compat profile as 2nd arg", () => {
    revalidateBrokerTags("x");
    for (const c of calls) {
      expect(c.profile).toEqual({ expire: 0 });
    }
  });
});

describe("revalidateArticleTags", () => {
  it("invalidates the article tag set with optional slug", () => {
    revalidateArticleTags("how-to-broker");
    const tags = calls.map((c) => c.tag);
    expect(tags).toContain("articles");
    expect(tags).toContain("article-detail-how-to-broker");
  });
});

describe("revalidateAdvisorTags", () => {
  it("invalidates professionals + optional slug", () => {
    revalidateAdvisorTags("jane-doe");
    const tags = calls.map((c) => c.tag);
    expect(tags).toContain("professionals");
    expect(tags).toContain("professional-jane-doe");
  });
});

describe("revalidateReviewTags", () => {
  it("invalidates both broker-review tag families", () => {
    revalidateReviewTags("vanguard");
    const tags = calls.map((c) => c.tag);
    expect(tags).toContain("broker-reviews");
    expect(tags).toContain("broker-review-stats");
    expect(tags).toContain("broker-reviews-vanguard");
  });
});

describe("revalidateAllPublicTags", () => {
  it("calls every individual invalidator", () => {
    revalidateAllPublicTags();
    const tags = calls.map((c) => c.tag);
    expect(tags).toContain("brokers");
    expect(tags).toContain("articles");
    expect(tags).toContain("professionals");
    expect(tags).toContain("broker-reviews");
  });
});
