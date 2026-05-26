import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "127.0.0.1",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

function makeChain(data: unknown, error: unknown = null) {
  const terminal = { data, error };
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(terminal)),
  };
  for (const m of ["select", "eq", "neq", "gte", "lt", "in", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["maybeSingle"] = vi.fn(async () => terminal);
  chain["single"] = vi.fn(async () => terminal);
  return chain;
}

const mockFromServer = vi.fn();
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromServer,
  })),
}));

const mockFromAdmin = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFromAdmin,
  })),
}));

import { GET } from "@/app/api/feed/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(params = ""): NextRequest {
  return new NextRequest(`http://localhost/api/feed${params ? `?${params}` : ""}`);
}

const SAMPLE_EVENT = {
  id: "evt-1",
  event_type: "rate_change",
  ref_id: "rc-1",
  headline: "CommBank raised savings rate by 10 bps",
  summary: null,
  actor_name: "CommBank",
  actor_slug: "commbank",
  entity_slug: "commbank",
  image_url: null,
  score_base: 70,
  published_at: new Date(Date.now() - 3600 * 1000).toISOString(),
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFromAdmin.mockReturnValue(makeChain([SAMPLE_EVENT]));
    mockFromServer.mockReturnValue(makeChain([])); // follows
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid cursor", async () => {
    const res = await GET(makeGet("cursor=not-a-date"));
    expect(res.status).toBe(400);
  });

  it("returns events array and nextCursor for unauthenticated caller", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json() as { events: unknown[]; nextCursor: unknown };
    expect(Array.isArray(json.events)).toBe(true);
    expect("nextCursor" in json).toBe(true);
  });

  it("returns nextCursor null when fewer events than limit", async () => {
    // Only 1 event, limit defaults to 20 — hasMore=false
    mockFromAdmin.mockReturnValue(makeChain([SAMPLE_EVENT]));
    const res = await GET(makeGet());
    const json = await res.json() as { nextCursor: unknown };
    expect(json.nextCursor).toBeNull();
  });

  it("returns nextCursor when events count exceeds limit", async () => {
    // Return limit+1 events to trigger hasMore
    const events = Array.from({ length: 21 }, (_, i) => ({
      ...SAMPLE_EVENT,
      id: `evt-${i}`,
      published_at: new Date(Date.now() - i * 60000).toISOString(),
    }));
    mockFromAdmin.mockReturnValue(makeChain(events));
    const res = await GET(makeGet("limit=20"));
    const json = await res.json() as { nextCursor: string | null; events: unknown[] };
    expect(json.nextCursor).not.toBeNull();
    expect(json.events).toHaveLength(20); // limit not limit+1
  });

  it("returns 500 when DB query fails", async () => {
    mockFromAdmin.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("accepts markets tab and filters event_type accordingly", async () => {
    const res = await GET(makeGet("tab=markets"));
    expect(res.status).toBe(200);
    // Verify the .in() call was made with correct types
    const chainCall = mockFromAdmin.mock.results[0]?.value as Record<string, unknown>;
    const inFn = chainCall?.["in"] as ReturnType<typeof vi.fn> | undefined;
    expect(inFn).toBeDefined();
    expect(inFn?.mock?.calls?.[0]).toEqual(["event_type", ["rate_change", "deal"]]);
  });

  it("accepts community tab", async () => {
    const res = await GET(makeGet("tab=community"));
    expect(res.status).toBe(200);
  });

  it("accepts advisors tab", async () => {
    const res = await GET(makeGet("tab=advisors"));
    expect(res.status).toBe(200);
  });

  it("falls back to for_you tab for unknown tab value", async () => {
    const res = await GET(makeGet("tab=unknown_tab"));
    expect(res.status).toBe(200);
    // for_you tab should not call .in() for type filter
    const chainCall = mockFromAdmin.mock.results[0]?.value as Record<string, unknown>;
    const inFn = chainCall?.["in"] as ReturnType<typeof vi.fn> | undefined;
    expect(inFn?.mock?.calls?.length ?? 0).toBe(0);
  });

  it("fetches advisor follows when authenticated on for_you tab", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockFromServer.mockReturnValue(makeChain([{ following_professional_id: 42 }]));
    const res = await GET(makeGet("tab=for_you"));
    expect(res.status).toBe(200);
    // The server client's from() should have been called for advisor_follows
    expect(mockFromServer).toHaveBeenCalled();
  });

  it("clamps limit to MAX_LIMIT (40)", async () => {
    const events = Array.from({ length: 41 }, (_, i) => ({
      ...SAMPLE_EVENT,
      id: `evt-${i}`,
    }));
    mockFromAdmin.mockReturnValue(makeChain(events));
    const res = await GET(makeGet("limit=9999"));
    const json = await res.json() as { events: unknown[] };
    // clamped to 40
    expect(json.events.length).toBeLessThanOrEqual(40);
  });
});
