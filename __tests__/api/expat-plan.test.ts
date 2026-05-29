import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockServerFrom, mockGetUser } = vi.hoisted(() => ({
  mockServerFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const { mockIsRateLimited } = vi.hoisted(() => ({ mockIsRateLimited: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/intent-context", () => ({
  isKnownIntentCountry: (code: string) =>
    ["uk", "us", "cn", "in", "jp", "sg", "hk", "kr", "my", "nz", "ae", "sa"].includes(code),
}));

vi.mock("@/lib/expat-plan", () => ({
  planProgressKey: (code: string) => `expat_plan_progress_${code}`,
}));

import { GET, POST } from "@/app/api/expat-plan/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "maybeSingle", "single",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const AUTHED_USER = { id: "user-abc", email: "test@example.com" };

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/expat-plan");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/expat-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET tests ────────────────────────────────────────────────────────────────

describe("GET /api/expat-plan — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 400 when ?country= is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/country/i);
  });

  it("returns 400 for an unknown country code", async () => {
    const res = await GET(makeGet({ country: "zz" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet({ country: "uk" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/sign in/i);
  });
});

describe("GET /api/expat-plan — authenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns { progress: null } when no state row exists", async () => {
    mockServerFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeGet({ country: "uk" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toBeNull();
  });

  it("returns { progress: null } when state row exists but key is absent", async () => {
    mockServerFrom.mockReturnValue(makeBuilder({ state: {} }));
    const res = await GET(makeGet({ country: "uk" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).toBeNull();
  });

  it("returns progress data when key exists in state map", async () => {
    const state = {
      expat_plan_progress_uk: {
        source: "expat-plan",
        data: { doneIds: ["firb", "tax"], updatedAt: "2026-01-01T00:00:00.000Z" },
        captured_at: "2026-01-01T00:00:00.000Z",
      },
    };
    mockServerFrom.mockReturnValue(makeBuilder({ state }));
    const res = await GET(makeGet({ country: "uk" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.progress).not.toBeNull();
    expect(body.progress.doneIds).toEqual(["firb", "tax"]);
    expect(body.progress.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns 500 on DB error", async () => {
    mockServerFrom.mockReturnValue(makeBuilder(null, { message: "db boom" }));
    const res = await GET(makeGet({ country: "uk" }));
    expect(res.status).toBe(500);
  });

  it("returns 503 when createClient throws", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockRejectedValueOnce(new Error("connection refused"));
    const res = await GET(makeGet({ country: "uk" }));
    expect(res.status).toBe(503);
  });

  it("accepts all known country codes (spot check us, sg, nz)", async () => {
    for (const country of ["us", "sg", "nz"]) {
      mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });
      mockServerFrom.mockReturnValue(makeBuilder(null));
      const res = await GET(makeGet({ country }));
      expect(res.status).toBe(200);
    }
  });
});

// ─── POST tests ───────────────────────────────────────────────────────────────

describe("POST /api/expat-plan — auth + rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ country: "uk", doneIds: ["firb"] }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ country: "uk", doneIds: [] }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/slow down/i);
  });
});

describe("POST /api/expat-plan — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/expat-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when country is missing from body", async () => {
    const res = await POST(makePost({ doneIds: ["firb"] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid body");
  });

  it("returns 400 when country is unknown", async () => {
    const res = await POST(makePost({ country: "xx", doneIds: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/country/i);
  });

  it("returns 400 when doneIds exceeds max of 20", async () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `item-${i}`);
    const res = await POST(makePost({ country: "uk", doneIds: tooMany }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/expat-plan — successful write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns { ok: true } on successful upsert", async () => {
    // First call: select existing state, second: upsert
    mockServerFrom
      .mockReturnValueOnce(makeBuilder(null))
      .mockReturnValueOnce(makeBuilder(null));
    const res = await POST(makePost({ country: "uk", doneIds: ["firb", "tax"] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("merges new progress into existing state (read-merge-write)", async () => {
    const existing = {
      state: { expat_plan_progress_us: { source: "expat-plan", data: { doneIds: ["firb"] } } },
    };
    const upsertBuilder = makeBuilder(null);
    mockServerFrom
      .mockReturnValueOnce(makeBuilder(existing))
      .mockReturnValueOnce(upsertBuilder);

    await POST(makePost({ country: "uk", doneIds: ["tax"] }));

    const upsertCalls = (upsertBuilder.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls.length).toBeGreaterThan(0);
    const upsertPayload = upsertCalls[0]?.[0] as Record<string, unknown>;
    const state = upsertPayload.state as Record<string, unknown>;
    // Should preserve existing US key and add UK key
    expect(state).toHaveProperty("expat_plan_progress_uk");
    expect(state).toHaveProperty("expat_plan_progress_us");
  });

  it("returns 500 on upsert DB error", async () => {
    mockServerFrom
      .mockReturnValueOnce(makeBuilder(null))
      .mockReturnValueOnce(makeBuilder(null, { message: "upsert fail" }));
    const res = await POST(makePost({ country: "uk", doneIds: [] }));
    expect(res.status).toBe(500);
  });

  it("returns 503 when createClient throws during POST", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockRejectedValueOnce(new Error("timeout"));
    const res = await POST(makePost({ country: "uk", doneIds: [] }));
    expect(res.status).toBe(503);
  });
});
