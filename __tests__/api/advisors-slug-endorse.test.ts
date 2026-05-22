import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ───────────────────────────────────────────────────────

const { mockIsRateLimited, mockGetUser, mockServerFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<() => Promise<boolean>>(async () => false),
  mockGetUser: vi.fn(async () => ({
    data: { user: { id: "user-1" } },
    error: null,
  })),
  mockServerFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (_schema: unknown, handler: (req: NextRequest, body: unknown) => unknown) =>
    async (req: NextRequest) => {
      const body = await req.json().catch(() => ({}));
      return handler(req, body);
    },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  return new Request(url, {
    method,
    headers: { "x-forwarded-for": "10.0.0.1", "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;
}

const ENDORSE_URL = "http://localhost/api/advisors/jane-smith/endorse";

// ── Route under test (imported after all mocks) ─────────────────────────────

import { POST, GET } from "@/app/api/advisors/[slug]/endorse/route";

// ── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisors/[slug]/endorse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const req = makeReq("POST", ENDORSE_URL, { skill: "Tax Planning" });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = makeReq("POST", ENDORSE_URL, { skill: "Tax Planning" });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  it("returns 404 when advisor slug does not resolve to an active professional", async () => {
    mockServerFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const req = makeReq("POST", ENDORSE_URL, { skill: "Tax Planning" });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/advisor not found/i);
  });

  it("returns 200 with endorsed=true and count when endorsement is new (insert path)", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount += 1;
      // resolveAdvisorId → professionals table
      if (callCount === 1) return makeChain({ data: { id: 55 }, error: null });
      // check existing endorsement → none found
      if (callCount === 2) return makeChain({ data: null, error: null });
      // insert new endorsement
      if (callCount === 3) return makeChain({ data: null, error: null });
      // count query
      return makeChain({ data: null, error: null, count: 3 });
    });
    const req = makeReq("POST", ENDORSE_URL, { skill: "Tax Planning" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.endorsed).toBe(true);
    expect(json.count).toBe(3);
  });

  it("returns 200 with endorsed=false and count when endorsement is toggled off (delete path)", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount += 1;
      // resolveAdvisorId → professionals table
      if (callCount === 1) return makeChain({ data: { id: 55 }, error: null });
      // check existing endorsement → found
      if (callCount === 2) return makeChain({ data: { id: 77 }, error: null });
      // delete existing endorsement
      if (callCount === 3) return makeChain({ data: null, error: null });
      // count query
      return makeChain({ data: null, error: null, count: 2 });
    });
    const req = makeReq("POST", ENDORSE_URL, { skill: "Tax Planning" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.endorsed).toBe(false);
    expect(json.count).toBe(2);
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("unexpected failure");
    });
    const req = makeReq("POST", ENDORSE_URL, { skill: "Tax Planning" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to toggle endorsement/i);
  });

  it("returns 200 with count=0 when count is null from DB", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 55 }, error: null });
      if (callCount === 2) return makeChain({ data: null, error: null });
      if (callCount === 3) return makeChain({ data: null, error: null });
      // count returns null/undefined
      return makeChain({ data: null, error: null, count: undefined });
    });
    const req = makeReq("POST", ENDORSE_URL, { skill: "Tax Planning" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(0);
  });
});

// ── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisors/[slug]/endorse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const req = makeReq("GET", ENDORSE_URL);
    const res = await GET(req, { params: Promise.resolve({ slug: "jane-smith" }) });
    expect(res.status).toBe(429);
  });

  it("returns 404 when advisor slug is not found", async () => {
    mockServerFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const req = makeReq("GET", ENDORSE_URL);
    const res = await GET(req, { params: Promise.resolve({ slug: "jane-smith" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with skills array for an unauthenticated visitor", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const endorsementRows = [
      { skill: "Tax Planning" },
      { skill: "Tax Planning" },
      { skill: "SMSF" },
    ];
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount += 1;
      // resolveAdvisorId
      if (callCount === 1) return makeChain({ data: { id: 55 }, error: null });
      // all endorsements for counts
      if (callCount === 2) return makeChain({ data: endorsementRows, error: null });
      // no user → no myEndorsements call
      return makeChain({ data: null, error: null });
    });
    const req = makeReq("GET", ENDORSE_URL);
    const res = await GET(req, { params: Promise.resolve({ slug: "jane-smith" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("skills");
    expect(json.skills.length).toBe(2);
    const taxEntry = json.skills.find((s: { skill: string }) => s.skill === "Tax Planning");
    expect(taxEntry?.count).toBe(2);
    expect(taxEntry?.endorsedByMe).toBe(false);
  });

  it("returns 200 with endorsedByMe=true for skills the user has endorsed", async () => {
    const endorsementRows = [{ skill: "SMSF" }, { skill: "Tax Planning" }];
    const myRows = [{ skill: "SMSF" }];
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return makeChain({ data: { id: 55 }, error: null });
      if (callCount === 2) return makeChain({ data: endorsementRows, error: null });
      // user's own endorsements
      return makeChain({ data: myRows, error: null });
    });
    const req = makeReq("GET", ENDORSE_URL);
    const res = await GET(req, { params: Promise.resolve({ slug: "jane-smith" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    const smsfEntry = json.skills.find((s: { skill: string }) => s.skill === "SMSF");
    expect(smsfEntry?.endorsedByMe).toBe(true);
    const taxEntry = json.skills.find((s: { skill: string }) => s.skill === "Tax Planning");
    expect(taxEntry?.endorsedByMe).toBe(false);
  });

  it("returns 500 on unexpected error", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("kaboom");
    });
    const req = makeReq("GET", ENDORSE_URL);
    const res = await GET(req, { params: Promise.resolve({ slug: "jane-smith" }) });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch endorsements/i);
  });
});
