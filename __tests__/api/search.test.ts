import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const { rateLimitedFn, searchAllFn } = vi.hoisted(() => ({
  rateLimitedFn: vi.fn<() => Promise<boolean>>(() => Promise.resolve(false)),
  searchAllFn: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: rateLimitedFn,
}));

vi.mock("@/lib/search", () => ({
  searchAll: searchAllFn,
  sanitiseQuery: (q: string) => q.replace(/[\x00-\x1f]/g, "").slice(0, 200).trim(),
}));

import { GET } from "@/app/api/search/route";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/search");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

const EMPTY_RESULTS = {
  brokers: [],
  advisors: [],
  articles: [],
  glossary: [],
  tools: [],
  durationMs: 5,
};

const SAMPLE_RESULTS = {
  brokers: [{ slug: "commsec", name: "CommSec", tagline: "Australia's #1 broker" }],
  advisors: [{ slug: "jane-smith", name: "Jane Smith", type: "financial-planner", location_display: "Sydney NSW", firm_name: "Smith Wealth" }],
  articles: [{ slug: "cgt-guide", title: "CGT Guide", excerpt: "How CGT works in Australia.", category: "tax" }],
  glossary: [{ slug: "cgt", term: "CGT", definition: "Capital Gains Tax", category: "Tax" }],
  tools: [{ slug: "cgt-calculator", title: "CGT Calculator", description: "Capital gains estimator", href: "/cgt-calculator" }],
  durationMs: 12,
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitedFn.mockResolvedValue(false);
    searchAllFn.mockResolvedValue(EMPTY_RESULTS);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when q is missing", async () => {
    const res = await GET(makeReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 400 when q is too short (< 2 chars)", async () => {
    const res = await GET(makeReq({ q: "a" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
  });

  it("returns 400 when q exceeds 200 chars", async () => {
    const res = await GET(makeReq({ q: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("returns 400 with code=validation_error for invalid params", async () => {
    const res = await GET(makeReq({ q: "a" }));
    const json = await res.json();
    expect(json.code).toBe("validation_error");
    expect(Array.isArray(json.issues)).toBe(true);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    rateLimitedFn.mockResolvedValue(true);
    const res = await GET(makeReq({ q: "CommSec" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many/i);
  });

  it("calls isRateLimited with the right key prefix", async () => {
    await GET(makeReq({ q: "CommSec" }));
    expect(rateLimitedFn).toHaveBeenCalledWith(
      expect.stringContaining("search:"),
      expect.any(Number),
      expect.any(Number)
    );
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 200 with categorised results for a valid query", async () => {
    searchAllFn.mockResolvedValue(SAMPLE_RESULTS);
    const res = await GET(makeReq({ q: "CommSec CGT" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty("brokers");
    expect(json).toHaveProperty("advisors");
    expect(json).toHaveProperty("articles");
    expect(json).toHaveProperty("glossary");
    expect(json).toHaveProperty("tools");
    expect(json).toHaveProperty("durationMs");
  });

  it("passes the sanitised query to searchAll", async () => {
    await GET(makeReq({ q: "CommSec" }));
    expect(searchAllFn).toHaveBeenCalledWith("CommSec", expect.any(Object));
  });

  it("result arrays contain expected shape (broker)", async () => {
    searchAllFn.mockResolvedValue(SAMPLE_RESULTS);
    const res = await GET(makeReq({ q: "CommSec" }));
    const json = await res.json();
    const broker = json.brokers[0];
    expect(broker).toHaveProperty("slug");
    expect(broker).toHaveProperty("name");
  });

  it("result arrays contain expected shape (article)", async () => {
    searchAllFn.mockResolvedValue(SAMPLE_RESULTS);
    const res = await GET(makeReq({ q: "CGT" }));
    const json = await res.json();
    const article = json.articles[0];
    expect(article).toHaveProperty("slug");
    expect(article).toHaveProperty("title");
  });

  it("sets a Cache-Control header on success", async () => {
    const res = await GET(makeReq({ q: "CommSec" }));
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage/);
  });

  // ── Cap overrides ─────────────────────────────────────────────────────────

  it("passes numeric cap overrides to searchAll", async () => {
    await GET(makeReq({ q: "CommSec", brokers: "10", articles: "15" }));
    expect(searchAllFn).toHaveBeenCalledWith(
      "CommSec",
      expect.objectContaining({ brokers: 10, articles: 15 })
    );
  });

  it("ignores invalid (non-numeric) cap values — returns 400", async () => {
    const res = await GET(makeReq({ q: "CommSec", brokers: "notanumber" }));
    // Zod coerces NaN from non-numeric → fails integer check
    expect(res.status).toBe(400);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it("returns 500 when searchAll throws", async () => {
    searchAllFn.mockRejectedValue(new Error("DB unavailable"));
    const res = await GET(makeReq({ q: "CommSec" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});
