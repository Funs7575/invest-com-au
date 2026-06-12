/**
 * Tests for GET /api/get-matched/supply (Showcase G5).
 *
 * Mocks both Supabase clients with a chainable head-count query builder so we
 * can assert the per-lane filters (brokers active, professionals
 * active+verified+type, listings active+vertical) and the fail-soft 503.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, serverFrom, adminFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  serverFrom: vi.fn(),
  adminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: serverFrom })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET } from "@/app/api/get-matched/supply/route";

/**
 * Build a chainable query mock that resolves (via await / .then) to
 * `{ count, error }`. `.eq()` records its calls so tests can assert filters.
 */
function makeQuery(result: { count: number | null; error: unknown }) {
  const eqCalls: Array<[string, unknown]> = [];
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    return query;
  });
  // Make it thenable so `await query` resolves to the result.
  query.then = (resolve: (v: unknown) => unknown) => resolve(result);
  (query as { __eqCalls: typeof eqCalls }).__eqCalls = eqCalls;
  return query;
}

function makeReq(qs = ""): NextRequest {
  return new NextRequest(`http://localhost/api/get-matched/supply${qs}`, {
    method: "GET",
  });
}

describe("GET /api/get-matched/supply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  function wire(counts: { brokers: number; professionals: number; listings: number }) {
    const brokersQ = makeQuery({ count: counts.brokers, error: null });
    const listingsQ = makeQuery({ count: counts.listings, error: null });
    const profQ = makeQuery({ count: counts.professionals, error: null });
    serverFrom.mockImplementation((table: string) =>
      table === "brokers" ? brokersQ : listingsQ,
    );
    adminFrom.mockImplementation(() => profQ);
    return { brokersQ, listingsQ, profQ };
  }

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns the three lane counts with no filters", async () => {
    wire({ brokers: 147, professionals: 89, listings: 1240 });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ platforms: 147, advisors: 89, listings: 1240 });
  });

  it("filters brokers by active status", async () => {
    const { brokersQ } = wire({ brokers: 10, professionals: 5, listings: 3 });
    await GET(makeReq());
    expect((brokersQ as { __eqCalls: Array<[string, unknown]> }).__eqCalls).toContainEqual([
      "status",
      "active",
    ]);
  });

  it("filters professionals by active + verified + mapped type", async () => {
    const { profQ } = wire({ brokers: 10, professionals: 5, listings: 3 });
    await GET(makeReq("?advisor_type=mortgage-broker"));
    const calls = (profQ as { __eqCalls: Array<[string, unknown]> }).__eqCalls;
    expect(calls).toContainEqual(["status", "active"]);
    expect(calls).toContainEqual(["verified", true]);
    expect(calls).toContainEqual(["type", "mortgage_broker"]);
  });

  it("does not add a type filter for an unknown / not-sure advisor_type", async () => {
    const { profQ } = wire({ brokers: 10, professionals: 5, listings: 3 });
    await GET(makeReq("?advisor_type=not-sure"));
    const calls = (profQ as { __eqCalls: Array<[string, unknown]> }).__eqCalls;
    expect(calls.some(([c]) => c === "type")).toBe(false);
  });

  it("filters listings by mapped vertical", async () => {
    const { listingsQ } = wire({ brokers: 10, professionals: 5, listings: 3 });
    await GET(makeReq("?vertical=property"));
    const calls = (listingsQ as { __eqCalls: Array<[string, unknown]> }).__eqCalls;
    expect(calls).toContainEqual(["status", "active"]);
    expect(calls).toContainEqual(["vertical", "property"]);
  });

  it("ignores an invalid vertical (permissive — no 400, no vertical filter)", async () => {
    const { listingsQ } = wire({ brokers: 10, professionals: 5, listings: 3 });
    const res = await GET(makeReq("?vertical=not-a-real-vertical"));
    expect(res.status).toBe(200);
    const calls = (listingsQ as { __eqCalls: Array<[string, unknown]> }).__eqCalls;
    expect(calls.some(([c]) => c === "vertical")).toBe(false);
  });

  it("fails soft with 503 when a count query errors", async () => {
    const brokersQ = makeQuery({ count: null, error: { message: "boom" } });
    serverFrom.mockImplementation(() => brokersQ);
    adminFrom.mockImplementation(() => makeQuery({ count: 5, error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
  });

  it("sets an s-maxage cache header", async () => {
    wire({ brokers: 1, professionals: 1, listings: 1 });
    const res = await GET(makeReq());
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });
});
