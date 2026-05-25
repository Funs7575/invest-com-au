import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));
vi.mock("@/lib/text-moderation", () => ({
  detectForwardLookingStatements: vi.fn(() => []),
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

import { GET, POST, PATCH } from "@/app/api/admin/commodity-news-briefs/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/commodity-news-briefs", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/commodity-news-briefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    // Default builder returns empty list
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  // GET
  it("GET denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns items list when admin", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when missing required fields", async () => {
    const res = await POST(makeReq("POST", { sector_slug: "gold" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid event_date format", async () => {
    const res = await POST(
      makeReq("POST", {
        sector_slug: "gold",
        event_title: "Gold rises",
        event_date: "not-a-date",
        article_slug: "gold-rises",
        body: "A".repeat(350) + " general advice warning applies.",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for non-kebab article_slug", async () => {
    const res = await POST(
      makeReq("POST", {
        sector_slug: "gold",
        event_title: "Gold rises",
        event_date: "2025-01-01",
        article_slug: "Gold Rises!",
        body: "A".repeat(350) + " general advice warning applies.",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST creates brief when valid body", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await POST(
      makeReq("POST", {
        sector_slug: "gold",
        event_title: "Gold rises",
        event_date: "2025-01-01",
        article_slug: "gold-rises-2025",
        body: "A".repeat(350) + " general advice warning applies.",
        source_url: "https://example.com/gold",
        excerpt: "Gold rose",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  // PATCH
  it("PATCH denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PATCH(makeReq("PATCH", { id: 1, action: "publish" }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 when missing id or action", async () => {
    const res = await PATCH(makeReq("PATCH", { id: 1 }));
    expect(res.status).toBe(400);
  });

  it("PATCH returns 404 when brief not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await PATCH(makeReq("PATCH", { id: 99, action: "publish" }));
    expect(res.status).toBe(404);
  });

  it("PATCH publishes brief when found", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { article_slug: "gold-rises-2025" }, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { id: 1, action: "publish" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("PATCH retires brief when found", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { article_slug: "gold-rises-2025" }, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { id: 1, action: "retire" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("retired");
  });

  it("PATCH returns 400 for unknown action", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { article_slug: "gold-rises-2025" }, error: null }),
    );
    const res = await PATCH(makeReq("PATCH", { id: 1, action: "vaporize" }));
    expect(res.status).toBe(400);
  });
});
