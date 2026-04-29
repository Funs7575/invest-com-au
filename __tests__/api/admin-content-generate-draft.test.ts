import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Import ────────────────────────────────────────────────────────────────────

import { POST } from "@/app/api/admin/content/generate-draft/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/content/generate-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: authHeader ?? `Bearer test-cron-secret`,
    },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const self: Record<string, (...a: unknown[]) => unknown> = {};
  ["select", "eq", "update", "insert", "order", "limit", "filter"].forEach((k) => {
    self[k] = () => self;
  });
  self["single"] = () => Promise.resolve(result);
  self["maybeSingle"] = () => Promise.resolve(result);
  self["then"] = (cb: (v: unknown) => unknown) =>
    Promise.resolve(result).then(cb as Parameters<Promise<unknown>["then"]>[0]);
  return self;
}

const CALENDAR_ITEM = {
  id: 1,
  title: "Best ETF Brokers in Australia",
  article_type: "article",
  category: "brokers",
  target_keyword: "best etf brokers",
  secondary_keywords: ["cheap etfs", "asx etfs"],
  brief: "Compare ETF broker fees.",
  related_tools: ["/fee-impact"],
  related_brokers: ["commsec", "selfwealth"],
  assigned_author_id: null,
  assigned_reviewer_id: null,
};

const ARTICLE_BODY = {
  title: "Best ETF Brokers",
  content: "Full article body here.",
  excerpt: "Compare ETF brokers.",
  meta_title: "Best ETF Brokers AU",
  meta_description: "Find the best ETF broker for you.",
  sections: [],
  tags: ["etfs", "brokers"],
  read_time: 7,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/content/generate-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns 401 when authorization header is wrong", async () => {
    const res = await POST(makePost({ calendarId: 1 }, "Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when ANTHROPIC_API_KEY not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(makePost({ calendarId: 1 }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns 400 when calendarId missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/calendarId/);
  });

  it("returns 404 when calendar item not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await POST(makePost({ calendarId: 999 }));
    expect(res.status).toBe(404);
  });

  it("returns 502 when Anthropic API returns non-ok response", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      // First call: calendar item lookup succeeds
      // Subsequent: brokers, articles, update status
      if (callCount === 1) {
        return makeChain({ data: CALENDAR_ITEM, error: null });
      }
      return makeChain({ data: [], error: null });
    });
    mockFetch.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("Internal server error"),
    });
    const res = await POST(makePost({ calendarId: 1 }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/Anthropic/i);
  });

  it("returns 500 when article insert fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      // 1=calendar item, 2=brokers, 3=articles, 4=update drafting status, 5=articles insert
      if (callCount === 1) return makeChain({ data: CALENDAR_ITEM, error: null });
      if (callCount === 5) return makeChain({ data: null, error: { message: "slug conflict" } });
      return makeChain({ data: [], error: null });
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ text: JSON.stringify(ARTICLE_BODY) }],
        }),
    });
    const res = await POST(makePost({ calendarId: 1 }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/draft/i);
  });

  it("returns 200 success with articleId when Anthropic responds with valid JSON", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      // 1=calendar, 2=brokers, 3=existing-articles, 4=update-drafting, 5=insert-article, 6=update-draft-ready
      if (callCount === 1) return makeChain({ data: CALENDAR_ITEM, error: null });
      if (callCount === 5) return makeChain({ data: { id: 42 }, error: null });
      return makeChain({ data: [], error: null });
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ text: JSON.stringify(ARTICLE_BODY) }],
        }),
    });
    const res = await POST(makePost({ calendarId: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.articleId).toBe(42);
    expect(typeof body.slug).toBe("string");
  });

  it("handles raw non-JSON AI response gracefully (fallback to raw content)", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: CALENDAR_ITEM, error: null });
      if (callCount === 5) return makeChain({ data: { id: 99 }, error: null });
      return makeChain({ data: [], error: null });
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ text: "This is plain text, not JSON." }],
        }),
    });
    const res = await POST(makePost({ calendarId: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
