import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockIpKey } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockIpKey: vi.fn(() => "ip:1.2.3.4"),
}));
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET } from "@/app/api/listings/by-slugs/route";

function makeReq(slugs?: string): NextRequest {
  const url = slugs === undefined
    ? "http://localhost/api/listings/by-slugs"
    : `http://localhost/api/listings/by-slugs?slugs=${encodeURIComponent(slugs)}`;
  return new NextRequest(url, { method: "GET" });
}

// from().select().in().eq() — eq() resolves the query.
function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("GET /api/listings/by-slugs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeReq("a,b"));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Rate limited" });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns an empty list when no slugs are provided", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listings: [] });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns an empty list when slugs param is blank/whitespace", async () => {
    const res = await GET(makeReq(" , , "));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listings: [] });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fetches active listings filtered to the requested slugs", async () => {
    const rows = [{ id: 1, slug: "foo" }, { id: 2, slug: "bar" }];
    const chain = makeSelectChain({ data: rows, error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await GET(makeReq("foo,bar"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listings: rows });
    expect(mockFrom).toHaveBeenCalledWith("investment_listings");
    expect(chain.in).toHaveBeenCalledWith("slug", ["foo", "bar"]);
    expect(chain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("caps the number of slugs at 4", async () => {
    const chain = makeSelectChain({ data: [], error: null });
    mockFrom.mockReturnValueOnce(chain);
    await GET(makeReq("a,b,c,d,e,f"));
    expect(chain.in).toHaveBeenCalledWith("slug", ["a", "b", "c", "d"]);
  });

  it("returns an empty list (200) when the query errors", async () => {
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: null, error: { message: "boom" } }));
    const res = await GET(makeReq("foo"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listings: [] });
  });

  it("returns an empty list (200) when the data is null but no error", async () => {
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: null, error: null }));
    const res = await GET(makeReq("foo"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listings: [] });
  });

  it("swallows a thrown client error and returns an empty list (200)", async () => {
    mockFrom.mockImplementationOnce(() => {
      throw new Error("client blew up");
    });
    const res = await GET(makeReq("foo"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ listings: [] });
  });
});
