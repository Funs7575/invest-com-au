import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockEmbedText = vi.fn();
vi.mock("@/lib/embeddings", () => ({
  embedText: (...args: unknown[]) => mockEmbedText(...args),
}));

const mockRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ rpc: mockRpc })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { GET } from "@/app/api/search-semantic/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/search-semantic");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

const SAMPLE_HIT = {
  document_type: "article",
  document_id: "art-1",
  title: "Best ETFs Australia",
  body_excerpt: "An overview of the top ETFs...",
  distance: 0.2,
};

const STUB_EMBEDDING = {
  vector: [0.1, 0.2, 0.3],
  provider: "stub" as const,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/search-semantic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockEmbedText.mockResolvedValue(STUB_EMBEDDING);
    mockRpc.mockResolvedValue({ data: [SAMPLE_HIT], error: null });
  });

  it("returns 400 when query is too short (1 char)", async () => {
    const res = await GET(makeGet({ q: "a" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too short/i);
  });

  it("returns 400 when query is too long (>200 chars)", async () => {
    const res = await GET(makeGet({ q: "a".repeat(201) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too long/i);
  });

  it("returns 400 when type param is unknown", async () => {
    const res = await GET(makeGet({ q: "super fund", type: "invalid-type" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown type/i);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet({ q: "best broker" }));
    expect(res.status).toBe(429);
  });

  it("returns 200 with degraded:true when embedText returns null", async () => {
    mockEmbedText.mockResolvedValue(null);
    const res = await GET(makeGet({ q: "best broker" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.degraded).toBe(true);
    expect(json.hits).toEqual([]);
  });

  it("returns 200 with degraded:true when rpc returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc error" } });
    const res = await GET(makeGet({ q: "best broker" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.degraded).toBe(true);
    expect(json.hits).toEqual([]);
  });

  it("returns 200 with hits and provider on success", async () => {
    const res = await GET(makeGet({ q: "best ETFs" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.provider).toBe("stub");
    expect(json.hits).toHaveLength(1);
    const hit = json.hits[0];
    expect(hit.type).toBe("article");
    expect(hit.id).toBe("art-1");
    // score = 1 - distance = 1 - 0.2 = 0.8
    expect(hit.score).toBeCloseTo(0.8, 5);
  });

  it("passes type filter to rpc when provided", async () => {
    await GET(makeGet({ q: "best ETFs", type: "article" }));
    const args = mockRpc.mock.calls[0]!;
    expect((args[1] as Record<string, unknown>).match_type).toBe("article");
  });

  it("passes null match_type to rpc when type not provided", async () => {
    await GET(makeGet({ q: "best ETFs" }));
    const args = mockRpc.mock.calls[0]!;
    expect((args[1] as Record<string, unknown>).match_type).toBeNull();
  });

  it("clamps limit to 20 when over-specified", async () => {
    await GET(makeGet({ q: "best ETFs", limit: "50" }));
    const args = mockRpc.mock.calls[0]!;
    expect((args[1] as Record<string, unknown>).match_limit).toBe(20);
  });

  it("clamps limit to 1 minimum", async () => {
    await GET(makeGet({ q: "best ETFs", limit: "0" }));
    const args = mockRpc.mock.calls[0]!;
    expect((args[1] as Record<string, unknown>).match_limit).toBe(1);
  });

  it("defaults limit to 10 when not provided", async () => {
    await GET(makeGet({ q: "best ETFs" }));
    const args = mockRpc.mock.calls[0]!;
    expect((args[1] as Record<string, unknown>).match_limit).toBe(10);
  });

  it("accepts all 5 valid type values", async () => {
    for (const type of ["article", "broker", "advisor", "qa", "scenario"]) {
      const res = await GET(makeGet({ q: "best ETFs", type }));
      expect(res.status).toBe(200);
    }
  });
});
