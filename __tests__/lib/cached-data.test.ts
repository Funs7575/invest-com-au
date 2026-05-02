import { describe, it, expect, vi, beforeEach } from "vitest";

// Bypass the Next.js unstable_cache wrapper so functions run directly.
vi.mock("@/lib/cache", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cache")>("@/lib/cache");
  return { ...actual, cached: (fn: unknown) => fn };
});

// ------------------------------------------------------------------
// Shared Supabase chain stub.
// All chainable query methods return `chain` so any combination of
// .select().eq().order().limit().maybeSingle() etc. works without
// per-function wiring.  Tests set `dbData` / `dbError` before calling.
// ------------------------------------------------------------------
let dbData: unknown = null;
let dbError: unknown = null;

const chain: Record<string, unknown> = {
  maybeSingle: async () => ({ data: dbData, error: dbError }),
  single: async () => ({ data: dbData, error: dbError }),
  // Makes `await supabase.from(...).select(...).eq(...).order(...)` work
  // (query is awaited without a terminal .single() call).
  then: (
    res: (v: { data: unknown; error: unknown }) => unknown,
    rej?: (e: unknown) => unknown
  ) => Promise.resolve({ data: dbData, error: dbError }).then(res, rej),
};
for (const m of ["select", "eq", "neq", "order", "limit", "or", "not", "contains"]) {
  chain[m] = () => chain;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: vi.fn(() => chain) })),
}));

import {
  getActiveBrokersListing,
  getActiveBrokersFull,
  getBrokerBySlug,
  getBrokerReviewStats,
  getBrokerReviews,
  getBrokerQuestions,
  getBrokerArticles,
  getBrokerSwitchStories,
  getBrokerFeeHistory,
  getPublishedArticles,
  getArticleBySlug,
  getRecentArticles,
  getRelatedArticles,
  getScenarios,
  getQuizQuestions,
  getApprovedSwitchStories,
  getFxBrokers,
} from "@/lib/cached-data";

beforeEach(() => {
  dbData = null;
  dbError = null;
});

// ── getActiveBrokersListing ──────────────────────────────────────────

describe("getActiveBrokersListing", () => {
  it("returns [] when data is null", async () => {
    expect(await getActiveBrokersListing()).toEqual([]);
  });

  it("returns the broker array from the DB", async () => {
    dbData = [{ id: 1, name: "CommSec", slug: "commsec" }];
    const result = await getActiveBrokersListing();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("CommSec");
  });
});

// ── getActiveBrokersFull ─────────────────────────────────────────────

describe("getActiveBrokersFull", () => {
  it("returns [] when data is null", async () => {
    expect(await getActiveBrokersFull()).toEqual([]);
  });

  it("returns brokers array", async () => {
    dbData = [{ id: 2, name: "SelfWealth", slug: "selfwealth" }];
    expect(await getActiveBrokersFull()).toHaveLength(1);
  });
});

// ── getBrokerBySlug ──────────────────────────────────────────────────

describe("getBrokerBySlug", () => {
  it("returns null when broker not found", async () => {
    dbData = null;
    expect(await getBrokerBySlug("unknown-broker")).toBeNull();
  });

  it("returns the broker when found", async () => {
    dbData = { id: 3, name: "Stake", slug: "stake" };
    const broker = await getBrokerBySlug("stake");
    expect(broker?.name).toBe("Stake");
    expect(broker?.slug).toBe("stake");
  });
});

// ── getBrokerReviewStats ─────────────────────────────────────────────

describe("getBrokerReviewStats", () => {
  it("returns null when no stats found", async () => {
    expect(await getBrokerReviewStats(99)).toBeNull();
  });

  it("returns stats when found", async () => {
    dbData = { broker_id: 1, review_count: 42, average_rating: 4.5 };
    const stats = await getBrokerReviewStats(1);
    expect(stats?.review_count).toBe(42);
    expect(stats?.average_rating).toBe(4.5);
  });
});

// ── getBrokerReviews ─────────────────────────────────────────────────

describe("getBrokerReviews", () => {
  it("returns [] when data is null", async () => {
    expect(await getBrokerReviews("commsec")).toEqual([]);
  });

  it("returns reviews array", async () => {
    dbData = [{ id: 10, rating: 4, title: "Great" }];
    const reviews = await getBrokerReviews("commsec");
    expect(reviews).toHaveLength(1);
    expect(reviews[0].title).toBe("Great");
  });
});

// ── getBrokerQuestions ───────────────────────────────────────────────

describe("getBrokerQuestions", () => {
  it("returns [] when data is null", async () => {
    expect(await getBrokerQuestions("stake")).toEqual([]);
  });

  it("returns questions with nested answers", async () => {
    dbData = [
      { id: 5, question: "Is CHESS sponsored?", broker_answers: [{ id: 1, answer: "Yes." }] },
    ];
    const qs = await getBrokerQuestions("stake");
    expect(qs[0].question).toBe("Is CHESS sponsored?");
    expect(qs[0].broker_answers).toHaveLength(1);
  });
});

// ── getBrokerArticles ────────────────────────────────────────────────

describe("getBrokerArticles", () => {
  it("returns [] when data is null", async () => {
    expect(await getBrokerArticles("commsec")).toEqual([]);
  });

  it("returns articles array", async () => {
    dbData = [{ id: 20, title: "Best Brokers", slug: "best-brokers" }];
    const articles = await getBrokerArticles("commsec");
    expect(articles[0].title).toBe("Best Brokers");
  });
});

// ── getBrokerSwitchStories ───────────────────────────────────────────

describe("getBrokerSwitchStories", () => {
  it("returns [] when data is null", async () => {
    expect(await getBrokerSwitchStories("commsec")).toEqual([]);
  });

  it("returns switch stories array", async () => {
    dbData = [{ id: 7, source_broker_slug: "commsec", dest_broker_slug: "stake" }];
    const stories = await getBrokerSwitchStories("commsec");
    expect(stories).toHaveLength(1);
    expect(stories[0].source_broker_slug).toBe("commsec");
  });
});

// ── getBrokerFeeHistory ──────────────────────────────────────────────

describe("getBrokerFeeHistory", () => {
  it("returns [] when data is null", async () => {
    expect(await getBrokerFeeHistory("commsec")).toEqual([]);
  });

  it("returns fee history array", async () => {
    dbData = [{ id: 8, field_name: "asx_fee", old_value: "19.95", new_value: "9.95" }];
    const history = await getBrokerFeeHistory("commsec");
    expect(history[0].field_name).toBe("asx_fee");
  });
});

// ── getPublishedArticles ─────────────────────────────────────────────

describe("getPublishedArticles", () => {
  it("returns [] when data is null", async () => {
    expect(await getPublishedArticles()).toEqual([]);
  });

  it("returns all published articles", async () => {
    dbData = [{ id: 1, title: "Article A" }, { id: 2, title: "Article B" }];
    const articles = await getPublishedArticles();
    expect(articles).toHaveLength(2);
  });
});

// ── getArticleBySlug ─────────────────────────────────────────────────

describe("getArticleBySlug", () => {
  it("returns null when article not found", async () => {
    expect(await getArticleBySlug("missing-article")).toBeNull();
  });

  it("returns article with author join", async () => {
    dbData = { id: 9, slug: "best-brokers", author: { name: "Alice" } };
    const article = await getArticleBySlug("best-brokers");
    expect(article?.slug).toBe("best-brokers");
  });
});

// ── getRecentArticles ────────────────────────────────────────────────

describe("getRecentArticles", () => {
  it("returns [] when data is null", async () => {
    expect(await getRecentArticles()).toEqual([]);
  });

  it("returns recent articles respecting the limit", async () => {
    dbData = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const articles = await getRecentArticles(3);
    expect(articles).toHaveLength(3);
  });
});

// ── getRelatedArticles ───────────────────────────────────────────────

describe("getRelatedArticles", () => {
  it("returns [] when data is null", async () => {
    expect(await getRelatedArticles("brokers", "current-slug")).toEqual([]);
  });

  it("returns related articles for a category", async () => {
    dbData = [{ id: 11, slug: "another-article" }];
    const articles = await getRelatedArticles("brokers", "current-slug");
    expect(articles[0].slug).toBe("another-article");
  });
});

// ── getScenarios ─────────────────────────────────────────────────────

describe("getScenarios", () => {
  it("returns [] when data is null", async () => {
    expect(await getScenarios()).toEqual([]);
  });

  it("returns scenarios array", async () => {
    dbData = [{ id: 1, title: "Long-term investor" }, { id: 2, title: "Day trader" }];
    const scenarios = await getScenarios();
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0].title).toBe("Long-term investor");
  });
});

// ── getQuizQuestions ─────────────────────────────────────────────────

describe("getQuizQuestions", () => {
  it("returns [] when data is null", async () => {
    expect(await getQuizQuestions()).toEqual([]);
  });

  it("returns active quiz questions in order", async () => {
    dbData = [
      { id: 1, question: "What is your goal?", order_index: 1 },
      { id: 2, question: "How much experience?", order_index: 2 },
    ];
    const qs = await getQuizQuestions();
    expect(qs).toHaveLength(2);
    expect(qs[0].question).toBe("What is your goal?");
  });
});

// ── getApprovedSwitchStories ─────────────────────────────────────────

describe("getApprovedSwitchStories", () => {
  it("returns [] when data is null (no broker filter)", async () => {
    expect(await getApprovedSwitchStories()).toEqual([]);
  });

  it("returns stories without broker filter", async () => {
    dbData = [{ id: 1, source_broker_slug: "commsec" }];
    expect(await getApprovedSwitchStories()).toHaveLength(1);
  });

  it("returns [] when data is null (with broker filter)", async () => {
    expect(await getApprovedSwitchStories("stake")).toEqual([]);
  });

  it("returns stories with broker filter applied", async () => {
    dbData = [{ id: 2, dest_broker_slug: "stake" }];
    const stories = await getApprovedSwitchStories("stake");
    expect(stories[0].dest_broker_slug).toBe("stake");
  });
});

// ── getFxBrokers ─────────────────────────────────────────────────────

describe("getFxBrokers", () => {
  it("returns [] when data is null", async () => {
    expect(await getFxBrokers()).toEqual([]);
  });

  it("returns brokers with FX rates", async () => {
    dbData = [
      { id: 1, name: "Interactive Brokers", fx_rate: 0.5 },
      { id: 2, name: "Stake", fx_rate: 0.6 },
    ];
    const brokers = await getFxBrokers();
    expect(brokers).toHaveLength(2);
    expect(brokers[0].fx_rate).toBe(0.5);
  });
});
