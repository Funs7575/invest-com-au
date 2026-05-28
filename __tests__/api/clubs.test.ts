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
  const terminal = { data, error, count: Array.isArray(data) ? data.length : data ? 1 : 0 };
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(terminal)),
  };
  for (const m of ["select", "eq", "neq", "gte", "lt", "in", "order", "limit", "insert", "update", "delete", "upsert"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["maybeSingle"] = vi.fn(async () => terminal);
  chain["single"] = vi.fn(async () => terminal);
  return chain;
}

const mockFrom = vi.fn();
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { GET as getClubs, POST as createClub } from "@/app/api/clubs/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, path = "/api/clubs"): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGet(path = "/api/clubs"): NextRequest {
  return new NextRequest(`http://localhost${path}`);
}

const VALID_CREATE_BODY = {
  name: "ETF Enthusiasts AUS",
  description: "Sharing ETF research",
  displayName: "Alex",
};

// ── GET /api/clubs ─────────────────────────────────────────────────────────────

describe("GET /api/clubs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockReturnValue(makeChain([
      {
        role: "owner",
        joined_at: "2026-05-01T00:00:00Z",
        display_name: "Alex",
        investment_clubs: {
          id: "club-1",
          name: "ETF Enthusiasts",
          slug: "etf-enthusiasts-123",
          description: null,
          member_limit: 20,
          created_by: "user-1",
          created_at: "2026-05-01T00:00:00Z",
        },
      },
    ]));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await getClubs(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await getClubs(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns clubs list for authenticated user", async () => {
    const res = await getClubs(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json() as { clubs: unknown[] };
    expect(json.clubs).toHaveLength(1);
    expect((json.clubs[0] as Record<string, unknown>).name).toBe("ETF Enthusiasts");
  });

  it("returns empty clubs array when user has no memberships", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await getClubs(makeGet());
    const json = await res.json() as { clubs: unknown[] };
    expect(json.clubs).toHaveLength(0);
  });
});

// ── POST /api/clubs ────────────────────────────────────────────────────────────

describe("POST /api/clubs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      switch (callIndex) {
        case 1: // club count check
          return { ...makeChain([]), count: 0 };
        case 2: // insert club
          return makeChain({ id: "club-new", slug: "etf-enthusiasts-12345" });
        case 3: // insert owner membership
          return makeChain(null);
        default:
          return makeChain(null);
      }
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await createClub(makePost(VALID_CREATE_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await createClub(makePost(VALID_CREATE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is too short", async () => {
    const res = await createClub(makePost({ ...VALID_CREATE_BODY, name: "A" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when displayName is missing", async () => {
    const res = await createClub(makePost({ name: "Test Club" }));
    expect(res.status).toBe(400);
  });

  it("returns 422 when user already has 10 clubs", async () => {
    // The club count check reads .count from the resolved terminal object
    const countChain = makeChain([], null);
    // Override the `then` to resolve with count: 10
    countChain["then"] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ data: [], error: null, count: 10 }));
    mockFrom.mockReturnValue(countChain);
    const res = await createClub(makePost(VALID_CREATE_BODY));
    expect(res.status).toBe(422);
  });

  it("returns 201 on success with clubId and slug", async () => {
    const res = await createClub(makePost(VALID_CREATE_BODY));
    expect(res.status).toBe(201);
    const json = await res.json() as { ok: boolean; clubId: string; slug: string };
    expect(json.ok).toBe(true);
    expect(json.clubId).toBe("club-new");
    expect(json.slug).toContain("etf");
  });

  it("returns 500 when club insert fails", async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return { ...makeChain([]), count: 0 };
      return makeChain(null, { message: "db error" });
    });
    const res = await createClub(makePost(VALID_CREATE_BODY));
    expect(res.status).toBe(500);
  });
});
