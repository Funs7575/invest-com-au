import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockDetect = vi.fn();
vi.mock("@/lib/text-moderation", () => ({
  detectForwardLookingStatements: (...a: unknown[]) => mockDetect(...a),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST, PATCH } from "@/app/api/admin/commodity-news-briefs/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN = { ok: true as const, email: "admin@test.com", userId: "uid-1" };
const DENY = {
  ok: false as const,
  response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
};

function makeRequest(method: string, body?: unknown, url = "http://localhost/api/admin/commodity-news-briefs"): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function makeChain(result: unknown) {
  const self: Record<string, (...a: unknown[]) => unknown> = {};
  ["select", "eq", "update", "insert", "upsert", "delete", "order", "limit", "filter"].forEach((k) => {
    self[k] = () => self;
  });
  self["single"] = () => Promise.resolve(result);
  self["maybeSingle"] = () => Promise.resolve(result);
  self["then"] = (cb: (v: unknown) => unknown) =>
    Promise.resolve(result).then(cb as Parameters<Promise<unknown>["then"]>[0]);
  return self;
}

// Body must be >=300 chars and contain "general advice" to auto-publish
const LONG_BODY =
  "This is general advice only and has been prepared without taking into account your personal objectives, financial situation or needs. " +
  "Crude oil prices surged today following OPEC+ supply cut announcements, pushing WTI above USD 90 per barrel. " +
  "Australian energy companies listed on the ASX saw significant gains, with Woodside Energy and Santos both rising over 3%. " +
  "The broader commodity rally has implications for inflation expectations and the RBA interest rate outlook.";

const BASE_POST_BODY = {
  sector_slug: "energy",
  event_title: "Crude oil prices surge",
  event_date: "2026-04-29",
  article_slug: "crude-oil-prices-surge",
  source_url: "https://example.com/source",
  body: LONG_BODY,
  excerpt: "Oil up.",
  category: "news",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/commodity-news-briefs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValue(DENY);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns items list", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    const items = [{ id: 1, event_title: "Brief A" }, { id: 2, event_title: "Brief B" }];
    mockAdminFrom.mockReturnValue(makeChain({ data: items, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
  });

  it("returns 500 on DB error", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/commodity-news-briefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDetect.mockReturnValue([]);
  });

  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValue(DENY);
    const res = await POST(makeRequest("POST", BASE_POST_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    const res = await POST(makeRequest("POST", { sector_slug: "energy" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 for invalid event_date format", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    const res = await POST(makeRequest("POST", { ...BASE_POST_BODY, event_date: "29-04-2026" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/YYYY-MM-DD/);
  });

  it("returns 400 for non-kebab article_slug", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    const res = await POST(makeRequest("POST", { ...BASE_POST_BODY, article_slug: "Bad Slug Here" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/kebab/i);
  });

  it("saves as draft when forward-looking statements detected", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    mockDetect.mockReturnValue(["will outperform"]);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makeRequest("POST", BASE_POST_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("draft");
    expect(body.compliance_flags).toContain("forward_looking:will outperform");
  });

  it("auto-publishes when no compliance flags", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    mockDetect.mockReturnValue([]);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makeRequest("POST", BASE_POST_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("published");
    expect(body.compliance_flags).toHaveLength(0);
  });

  it("returns 500 when article upsert fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    mockDetect.mockReturnValue([]);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "article insert failed" } }));
    const res = await POST(makeRequest("POST", BASE_POST_BODY));
    expect(res.status).toBe(500);
  });

  it("flags missing_general_advice_warning when body lacks disclaimer", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    mockDetect.mockReturnValue([]);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const shortBody = { ...BASE_POST_BODY, body: "A".repeat(400) }; // no "general advice" phrase
    const res = await POST(makeRequest("POST", shortBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.compliance_flags).toContain("missing_general_advice_warning_in_body");
    expect(body.status).toBe("draft");
  });
});

describe("PATCH /api/admin/commodity-news-briefs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when requireAdmin denies", async () => {
    mockRequireAdmin.mockResolvedValue(DENY);
    const res = await PATCH(makeRequest("PATCH", { id: 1, action: "publish" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    const res = await PATCH(makeRequest("PATCH", { action: "publish" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await PATCH(makeRequest("PATCH", { id: 99, action: "publish" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 on publish and stamps both tables", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // lookup
        return makeChain({ data: { article_slug: "my-article" }, error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await PATCH(makeRequest("PATCH", { id: 1, action: "publish" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("published");
  });

  it("returns 200 on retire", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: { article_slug: "my-article" }, error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await PATCH(makeRequest("PATCH", { id: 1, action: "retire" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("retired");
  });

  it("returns 400 for unknown action", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN);
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: { article_slug: "my-article" }, error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await PATCH(makeRequest("PATCH", { id: 1, action: "delete" }));
    expect(res.status).toBe(400);
  });
});
