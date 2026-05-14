import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, PUT } from "@/app/api/account/watchlist/alerts/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makePut(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/watchlist/alerts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Builds a thenable chain stub that returns the given final result.
function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "maybeSingle"]) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeUpsertChain(result: { error: unknown }) {
  return {
    upsert: vi.fn(() => Promise.resolve(result)),
  };
}

describe("GET /api/account/watchlist/alerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's current preference", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(
      makeSelectChain({
        data: { alerts_opted_in: true, last_digest_sent_at: "2026-05-05T09:00:00Z" },
        error: null,
      }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      alerts_opted_in: true,
      last_digest_sent_at: "2026-05-05T09:00:00Z",
    });
  });

  it("defaults to opted_in=false when no row exists", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      alerts_opted_in: false,
      last_digest_sent_at: null,
    });
  });

  it("returns 500 when the read errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(
      makeSelectChain({ data: null, error: { message: "boom" } }),
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/account/watchlist/alerts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PUT(makePut({ alerts_opted_in: true }));
    expect(res.status).toBe(401);
  });

  it("upserts the preference and echoes it back", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const upsertChain = makeUpsertChain({ error: null });
    mockFrom.mockReturnValueOnce(upsertChain);
    const res = await PUT(makePut({ alerts_opted_in: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ alerts_opted_in: true });
    expect(upsertChain.upsert).toHaveBeenCalledOnce();
    const upsertArgs = upsertChain.upsert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(upsertArgs[0]).toMatchObject({ user_id: USER.id, alerts_opted_in: true });
  });

  it("rejects invalid body via validation wrapper", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PUT(makePut({ alerts_opted_in: "yes" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when the upsert errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeUpsertChain({ error: { message: "boom" } }));
    const res = await PUT(makePut({ alerts_opted_in: false }));
    expect(res.status).toBe(500);
  });
});
