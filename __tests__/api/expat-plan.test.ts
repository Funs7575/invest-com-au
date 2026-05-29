import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockGetUser, mockFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(
    async () => ({ data: { user: { id: "user-uuid-1" } } }),
  ),
  mockFrom: vi.fn(),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// isKnownIntentCountry: pass "uk", "us", etc. through; reject unknown codes.
vi.mock("@/lib/intent-context", () => ({
  isKnownIntentCountry: (v: string) => ["uk", "us", "cn", "in", "jp", "sg", "hk", "kr", "my", "nz", "ae", "sa"].includes(v),
}));

// planProgressKey: return a deterministic key for testing.
vi.mock("@/lib/expat-plan", () => ({
  planProgressKey: (code: string) => `expat_plan_progress_${code}`,
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/expat-plan/route";

// ── Chain builder (supports maybeSingle, upsert, etc.) ───────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "single", "like", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn(async () => ({ data: res.data ?? null, error: res.error ?? null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

// ── Request helpers ───────────────────────────────────────────────────────────

function makeGet(country?: string): NextRequest {
  const url = country
    ? `http://localhost/api/expat-plan?country=${country}`
    : "http://localhost/api/expat-plan";
  return new NextRequest(url, { method: "GET" });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/expat-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests: GET ────────────────────────────────────────────────────────────────

describe("GET /api/expat-plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-uuid-1" } } });
  });

  it("returns 400 when country param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/country/i);
  });

  it("returns 400 for an unknown country code", async () => {
    const res = await GET(makeGet("xx"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown country/i);
  });

  it("returns 401 when user is not signed in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeGet("uk"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when the DB read fails", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "read error" } }));
    const res = await GET(makeGet("uk"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/something went wrong/i);
  });

  it("returns { progress: null } when no state row exists", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeGet("uk"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.progress).toBeNull();
  });

  it("returns { progress: null } when state exists but has no entry for the country key", async () => {
    const stateRow = { state: { expat_plan_progress_us: { source: "expat-plan", data: { doneIds: ["step-1"], updatedAt: "2026-01-01T00:00:00.000Z" } } } };
    mockFrom.mockReturnValue(makeChain({ data: stateRow, error: null }));
    const res = await GET(makeGet("uk")); // "uk" key not in state
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.progress).toBeNull();
  });

  it("returns progress when a valid state entry exists for the country", async () => {
    const stateRow = {
      state: {
        expat_plan_progress_uk: {
          source: "expat-plan",
          data: { doneIds: ["step-1", "step-2"], updatedAt: "2026-05-01T00:00:00.000Z" },
        },
      },
    };
    mockFrom.mockReturnValue(makeChain({ data: stateRow, error: null }));
    const res = await GET(makeGet("uk"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.progress).not.toBeNull();
    expect(json.progress.doneIds).toEqual(["step-1", "step-2"]);
    expect(json.progress.updatedAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("filters out non-string doneIds and uses epoch fallback for missing updatedAt", async () => {
    const stateRow = {
      state: {
        expat_plan_progress_uk: {
          source: "expat-plan",
          data: { doneIds: ["step-1", 42, null], updatedAt: undefined },
        },
      },
    };
    mockFrom.mockReturnValue(makeChain({ data: stateRow, error: null }));
    const res = await GET(makeGet("uk"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.progress.doneIds).toEqual(["step-1"]);
    expect(json.progress.updatedAt).toBe(new Date(0).toISOString());
  });

  it("returns 503 when an unexpected exception is thrown", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("network failure"));
    const res = await GET(makeGet("uk"));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/connection issue/i);
  });
});

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/expat-plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-uuid-1" } } });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when user is not signed in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makePost({ country: "uk", doneIds: ["step-1"] }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost({ country: "uk", doneIds: [] }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/slow down/i);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/expat-plan", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid body");
  });

  it("returns 400 when body is missing required fields", async () => {
    const res = await POST(makePost({ country: "uk" })); // missing doneIds
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid body");
  });

  it("returns 400 for an unknown country code in body", async () => {
    const res = await POST(makePost({ country: "xx", doneIds: [] }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown country/i);
  });

  it("returns 500 when upsert fails", async () => {
    // maybeSingle for the read step (returns empty state)
    const readChain = makeChain({ data: null, error: null });
    // upsert chain — make it resolve with an error
    const upsertChain: Record<string, unknown> = {};
    for (const m of ["select", "upsert", "eq", "in", "not"]) {
      upsertChain[m] = vi.fn(() => upsertChain);
    }
    upsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ data: null, error: { message: "upsert error" } }));
    upsertChain.catch = () => upsertChain;

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return readChain; // read existing state
      return upsertChain; // write merged state
    });

    const res = await POST(makePost({ country: "uk", doneIds: ["step-1"] }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/save failed/i);
  });

  it("saves progress and returns { ok: true } on success", async () => {
    const existingState = {
      state: {
        expat_plan_progress_us: {
          source: "expat-plan",
          data: { doneIds: ["other-step"], updatedAt: "2026-01-01T00:00:00.000Z" },
          captured_at: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    const readChain = makeChain({ data: existingState, error: null });

    // upsert chain returns no error
    const upsertChain: Record<string, unknown> = {};
    for (const m of ["select", "upsert", "eq", "in", "not"]) {
      upsertChain[m] = vi.fn(() => upsertChain);
    }
    upsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ data: null, error: null }));
    upsertChain.catch = () => upsertChain;

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return readChain;
      return upsertChain;
    });

    const res = await POST(makePost({ country: "uk", doneIds: ["step-1", "step-2"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("saves progress with empty doneIds (clearing plan)", async () => {
    const readChain = makeChain({ data: null, error: null });

    const upsertChain: Record<string, unknown> = {};
    for (const m of ["select", "upsert", "eq", "in", "not"]) {
      upsertChain[m] = vi.fn(() => upsertChain);
    }
    upsertChain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ data: null, error: null }));
    upsertChain.catch = () => upsertChain;

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return readChain;
      return upsertChain;
    });

    const res = await POST(makePost({ country: "sg", doneIds: [] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 503 when an unexpected exception is thrown", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("unexpected db failure"));
    const res = await POST(makePost({ country: "uk", doneIds: [] }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/connection issue/i);
  });
});
