import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

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

type DueItem = { id: number; article_id: number; title: string };

// Shared state across mocks
let dueItemsToReturn: DueItem[] = [];
let queryError: { message: string } | null = null;
let articleUpdateError: { message: string } | null = null;

// Capture all calls so tests can assert on them
const articleUpdateCalls: {
  articleId: number;
  payload: Record<string, unknown>;
}[] = [];
const calendarUpdateCalls: {
  calendarId: number;
  payload: Record<string, unknown>;
}[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "content_calendar") {
    return {
      // The GET path's read chain
      select: () => ({
        eq: () => ({
          lte: () => ({
            not: async () => ({
              data: queryError ? null : dueItemsToReturn,
              error: queryError,
            }),
          }),
        }),
      }),
      // The calendar-update chain (after article publish)
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, calendarId: number) => {
          calendarUpdateCalls.push({ calendarId, payload });
          return { data: null, error: null };
        },
      }),
    };
  }

  if (table === "articles") {
    return {
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, articleId: number) => {
          articleUpdateCalls.push({ articleId, payload });
          return { data: null, error: articleUpdateError };
        },
      }),
    };
  }

  throw new Error(`unexpected table in test: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null), // default: auth OK
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/auto-publish/route";
import { requireCronAuth } from "@/lib/cron-auth";

// Helper to fake a NextRequest
function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/auto-publish") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/auto-publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dueItemsToReturn = [];
    queryError = null;
    articleUpdateError = null;
    articleUpdateCalls.length = 0;
    calendarUpdateCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("exports edge runtime and maxDuration = 30", () => {
    expect(runtime).toBe("edge");
    expect(maxDuration).toBe(30);
  });

  it("returns 401-style response from requireCronAuth when auth fails", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    // DB should never have been touched
    expect(articleUpdateCalls).toHaveLength(0);
    expect(calendarUpdateCalls).toHaveLength(0);
  });

  it("returns 500 when the initial query errors", async () => {
    queryError = { message: "db exploded" };

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("db exploded");
    expect(articleUpdateCalls).toHaveLength(0);
  });

  it("returns counts = 0 when nothing is due", async () => {
    dueItemsToReturn = [];

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ checked: 0, published: 0, articles: [] });
  });

  it("publishes each due article and stamps the calendar item", async () => {
    dueItemsToReturn = [
      { id: 1, article_id: 101, title: "Alpha" },
      { id: 2, article_id: 102, title: "Beta" },
    ];

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checked).toBe(2);
    expect(json.published).toBe(2);
    expect(json.articles).toEqual([
      { calendarId: 1, articleId: 101, title: "Alpha" },
      { calendarId: 2, articleId: 102, title: "Beta" },
    ]);

    // Each article got a publish payload
    expect(articleUpdateCalls).toHaveLength(2);
    for (const call of articleUpdateCalls) {
      expect(call.payload.status).toBe("published");
      expect(call.payload.published_at).toEqual(expect.any(String));
      expect(call.payload.publish_date).toEqual(expect.any(String));
    }

    // Each calendar item got stamped
    expect(calendarUpdateCalls).toHaveLength(2);
    for (const call of calendarUpdateCalls) {
      expect(call.payload.status).toBe("published");
      // actual_publish_date is the YYYY-MM-DD slice of today
      expect(call.payload.actual_publish_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("skips the calendar stamp when the article update fails, keeps counted=checked but published=0", async () => {
    dueItemsToReturn = [{ id: 1, article_id: 101, title: "Alpha" }];
    articleUpdateError = { message: "article update failed" };

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    // checked includes items we looked at; published only increments
    // after a successful article publish.
    expect(json.checked).toBe(1);
    expect(json.published).toBe(0);
    expect(json.articles).toEqual([]);

    // article update attempted, calendar stamp skipped (continue in loop)
    expect(articleUpdateCalls).toHaveLength(1);
    expect(calendarUpdateCalls).toHaveLength(0);
  });
});
