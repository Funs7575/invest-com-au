import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";
import { createChainableBuilder, makeCronRequest } from "@/__tests__/helpers";

type SupabaseResult = { data: unknown; error: unknown };
type FetchFn = typeof fetch;

// ─── Mocks ───────────────────────────────────────────────────────────

const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

const mockFrom = vi.fn((table: string) => createChainableBuilder(table, supabaseCalls));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import the handler AFTER mocks
import { GET, runtime, maxDuration } from "@/app/api/cron/content-staleness/route";

// ─── Helpers ─────────────────────────────────────────────────────────

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "test-article",
    title: "Test Article",
    updated_at: new Date().toISOString(),
    evergreen: true,
    related_brokers: [],
    ...overrides,
  };
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Set up mockFrom to return articles and recently-changed brokers. */
function setupMocks(
  articles: Record<string, unknown>[],
  changedBrokerSlugs: string[] = []
) {
  mockFrom.mockImplementation((table: string) => {
    const builder = createChainableBuilder(table, supabaseCalls);

    if (table === "articles") {
      // The select().eq() chain resolves via .then
      builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
        cb({ data: articles, error: null });
        return Promise.resolve();
      });
    }

    if (table === "brokers") {
      builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
        cb({
          data: changedBrokerSlugs.map((slug) => ({ slug })),
          error: null,
        });
        return Promise.resolve();
      });
    }

    return builder;
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/content-staleness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(supabaseCalls)) {
      delete supabaseCalls[key];
    }
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.ADMIN_EMAIL = "admin@test.com";
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Config ──

  it("exports edge runtime and maxDuration = 60", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(60);
  });

  // ── Auth ──

  it("returns 401 without authorization header", async () => {
    const req = new Request("http://localhost/api/cron/content-staleness", {
      method: "GET",
    });
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 with wrong bearer token", async () => {
    const req = new Request("http://localhost/api/cron/content-staleness", {
      method: "GET",
      headers: { Authorization: "Bearer wrong" },
    });
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  // ── Scoring: old article (>120 days) ──

  it("scores article updated >120 days ago as stale (score >= 50)", async () => {
    const article = makeArticle({
      id: 10,
      slug: "old-article",
      title: "Very Old Article",
      updated_at: daysAgo(150),
      evergreen: true,
      related_brokers: [],
    });

    setupMocks([article]);

    const req = makeCronRequest("/api/cron/content-staleness");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.audited).toBe(1);
    expect(json.stale).toBe(1);
    expect(json.articles).toHaveLength(1);
    expect(json.articles[0].score).toBeGreaterThanOrEqual(50);
    expect(json.articles[0].needsUpdate).toBe(true);
  });

  // ── Scoring: recent evergreen article is not stale ──

  it("scores recent evergreen article as not stale (score < 30)", async () => {
    const article = makeArticle({
      id: 20,
      slug: "fresh-article",
      title: "Fresh Evergreen Article",
      updated_at: daysAgo(10),
      evergreen: true,
      related_brokers: [],
    });

    setupMocks([article]);

    const req = makeCronRequest("/api/cron/content-staleness");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.audited).toBe(1);
    expect(json.stale).toBe(0);
    // No stale articles returned in the filtered list
    expect(json.articles).toHaveLength(0);
  });

  // ── Scoring: +20 when referenced broker recently changed ──

  it("adds 20 points when a referenced broker recently changed", async () => {
    // Article is 70 days old (30 points for >60 days), not evergreen (+10), broker changed (+20) = 60
    const article = makeArticle({
      id: 30,
      slug: "broker-ref-article",
      title: "Broker Reference Article",
      updated_at: daysAgo(70),
      evergreen: false,
      related_brokers: ["stake", "selfwealth"],
    });

    setupMocks([article], ["stake"]);

    const req = makeCronRequest("/api/cron/content-staleness");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.stale).toBe(1);
    expect(json.articles[0].score).toBe(60); // 30 (>60 days) + 10 (not evergreen) + 20 (broker changed)
    expect(json.articles[0].needsUpdate).toBe(true);
  });

  // ── Non-evergreen article at 70 days gets score 40 (30 + 10) ──

  it("adds 10 points for non-evergreen articles", async () => {
    const article = makeArticle({
      id: 40,
      slug: "non-evergreen",
      title: "Non-Evergreen Article",
      updated_at: daysAgo(70),
      evergreen: false,
      related_brokers: [],
    });

    setupMocks([article]);

    const req = makeCronRequest("/api/cron/content-staleness");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.articles[0].score).toBe(40); // 30 (>60 days) + 10 (not evergreen)
  });

  // ── Sends email when stale count > 0 ──

  it("sends admin email when stale articles are found", async () => {
    const article = makeArticle({
      id: 50,
      slug: "stale-email",
      title: "Stale Article For Email",
      updated_at: daysAgo(130),
      evergreen: true,
    });

    setupMocks([article]);

    const emailCalls: { url: string; body?: string }[] = [];
    const originalFetch = globalThis.fetch;
    (globalThis.fetch as unknown as FetchFn) = vi.fn((...args: Parameters<FetchFn>) => {
      const url = typeof args[0] === "string" ? args[0] : "";
      if (url.includes("resend.com")) {
        emailCalls.push({ url, body: typeof args[1]?.body === "string" ? args[1].body : undefined });
        return Promise.resolve(new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }));
      }
      return (originalFetch as FetchFn)(...args);
    });

    const req = makeCronRequest("/api/cron/content-staleness");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);

    expect(emailCalls).toHaveLength(1);
    const emailBody = JSON.parse(emailCalls[0].body!);
    expect(emailBody.to).toBe("admin@test.com");
    expect(emailBody.subject).toContain("need updating");

    globalThis.fetch = originalFetch;
  });

  // ── Does not send email when no stale articles ──

  it("does not send email when all articles are fresh", async () => {
    const article = makeArticle({
      id: 60,
      slug: "fresh",
      title: "Fresh Article",
      updated_at: daysAgo(5),
      evergreen: true,
    });

    setupMocks([article]);

    const emailCalls: string[] = [];
    const originalFetch = globalThis.fetch;
    (globalThis.fetch as unknown as FetchFn) = vi.fn((...args: Parameters<FetchFn>) => {
      const url = typeof args[0] === "string" ? args[0] : "";
      if (url.includes("resend.com")) {
        emailCalls.push(url);
        return Promise.resolve(new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }));
      }
      return (originalFetch as FetchFn)(...args);
    });

    const req = makeCronRequest("/api/cron/content-staleness");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.stale).toBe(0);
    expect(emailCalls).toHaveLength(0);

    globalThis.fetch = originalFetch;
  });
});
