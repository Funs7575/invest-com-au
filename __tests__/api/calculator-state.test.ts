import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsRateLimited = vi.fn(async () => false);
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockGetUser = vi.fn(async () => ({ data: { user: { id: "u1", email: "user@test.com" } }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { GET, POST } from "@/app/api/calculator-state/route";

function makePostReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/calculator-state", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

describe("/api/calculator-state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@test.com" } }, error: null });
    mockFrom.mockReturnValue(makeBuilder({ data: { state: {}, updated_at: null }, error: null }));
  });

  // GET tests
  it("GET returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns 200 with state", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("state");
  });

  it("GET returns 500 when DB errors", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: "DB error" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("GET returns empty state when no row", async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.state).toEqual({});
  });

  // POST tests
  it("POST returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePostReq({ calculator: "home-loan", source: "form", data: {} }));
    expect(res.status).toBe(401);
  });

  it("POST returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePostReq({ calculator: "home-loan", source: "form", data: {} }));
    expect(res.status).toBe(429);
  });

  it("POST returns 400 when body invalid", async () => {
    const res = await POST(makePostReq({ something: "wrong" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when calculator empty string", async () => {
    const res = await POST(makePostReq({ calculator: "", source: "form", data: {} }));
    expect(res.status).toBe(400);
  });

  it("POST returns 200 on success", async () => {
    // First call is maybeSingle (read), second is upsert
    mockFrom.mockReturnValue(makeBuilder({ data: { state: {} }, error: null }));
    const res = await POST(makePostReq({ calculator: "home-loan", source: "form", data: { loanAmount: 500000 } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("POST returns 500 when upsert fails", async () => {
    // Return success on select, error on upsert by tracking call count
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeBuilder({ data: { state: {} }, error: null });
      }
      return makeBuilder({ data: null, error: { message: "upsert failed" } });
    });
    const res = await POST(makePostReq({ calculator: "home-loan", source: "form", data: {} }));
    expect(res.status).toBe(500);
  });
});
