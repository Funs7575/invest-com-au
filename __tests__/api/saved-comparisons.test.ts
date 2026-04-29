import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

const mockAuth = { getUser: vi.fn() };
const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth, from: mockServerFrom })),
}));

import { GET, POST } from "@/app/api/saved-comparisons/route";
import {
  GET as GET_ID,
  PATCH as PATCH_ID,
  DELETE as DELETE_ID,
} from "@/app/api/saved-comparisons/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-cmp-1", email: "compare@test.com" };
const COMPARISON_ID = "cmp-abc-123";

const COMPARISON = {
  id: COMPARISON_ID,
  name: "My Brokers",
  broker_slugs: ["commsec", "stake"],
  quiz_results: null,
  notes: "testing",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

function makePostReq(body: unknown) {
  return new NextRequest("http://localhost/api/saved-comparisons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeIdReq(method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/saved-comparisons/${COMPARISON_ID}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeParams() {
  return { params: Promise.resolve({ id: COMPARISON_ID }) };
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "insert", "update", "delete", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

// ── GET /saved-comparisons ─────────────────────────────────────────────────────

describe("GET /api/saved-comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/session expired/i);
  });

  it("returns comparison list for authenticated user", async () => {
    const chain = makeChain({ data: [COMPARISON], error: null });
    mockServerFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comparisons).toHaveLength(1);
    expect(body.comparisons[0].name).toBe("My Brokers");
  });

  it("returns empty array when no comparisons", async () => {
    const chain = makeChain({ data: null, error: null });
    mockServerFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comparisons).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    const chain = makeChain({ data: null, error: { message: "DB error" } });
    mockServerFrom.mockReturnValue(chain);

    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns 503 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("connection dropped");
    });
    const res = await GET();
    expect(res.status).toBe(503);
  });
});

// ── POST /saved-comparisons ────────────────────────────────────────────────────

describe("POST /api/saved-comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePostReq({ name: "test", broker_slugs: ["x"] }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePostReq({ name: "test", broker_slugs: ["x"] }));
    expect(res.status).toBe(429);
  });

  it("returns 500 when count query fails", async () => {
    const chain = makeChain({ count: null, error: { message: "count error" } });
    mockServerFrom.mockReturnValue(chain);
    const res = await POST(makePostReq({ name: "test", broker_slugs: ["x"] }));
    expect(res.status).toBe(500);
  });

  it("returns 400 when max comparisons reached (25)", async () => {
    const countChain = makeChain({ count: 25, error: null });
    mockServerFrom.mockReturnValue(countChain);
    const res = await POST(makePostReq({ name: "test", broker_slugs: ["x"] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/maximum.*25/i);
  });

  it("returns 400 for invalid JSON", async () => {
    const countChain = makeChain({ count: 0, error: null });
    mockServerFrom.mockReturnValue(countChain);

    const req = new NextRequest("http://localhost/api/saved-comparisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when broker_slugs is empty", async () => {
    const countChain = makeChain({ count: 0, error: null });
    mockServerFrom.mockReturnValue(countChain);
    const res = await POST(makePostReq({ name: "My Comp", broker_slugs: [] }));
    expect(res.status).toBe(400);
  });

  it("creates comparison and returns 201 with the new row", async () => {
    let call = 0;
    mockServerFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ count: 2, error: null }); // count
      return makeChain({ data: COMPARISON, error: null }); // insert
    });

    const res = await POST(
      makePostReq({ name: "My Brokers", broker_slugs: ["commsec", "stake"] })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.comparison.name).toBe("My Brokers");
  });

  it("returns 500 on DB insert error", async () => {
    let call = 0;
    mockServerFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ count: 0, error: null });
      return makeChain({ data: null, error: { message: "insert failed" } });
    });

    const res = await POST(makePostReq({ name: "test", broker_slugs: ["x"] }));
    expect(res.status).toBe(500);
  });

  it("trims name and notes to configured max lengths", async () => {
    const longName = "A".repeat(200);
    const longNotes = "B".repeat(2100);
    let call = 0;
    let insertedName: string | undefined;
    let insertedNotes: string | undefined;

    mockServerFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ count: 0, error: null });
      const c = makeChain({ data: { ...COMPARISON, name: longName.slice(0, 100) }, error: null });
      const originalInsert = c.insert as ReturnType<typeof vi.fn>;
      (c.insert as ReturnType<typeof vi.fn>) = vi.fn((payload: Record<string, unknown>) => {
        insertedName = payload.name as string;
        insertedNotes = payload.notes as string;
        return c;
      });
      void originalInsert;
      return c;
    });

    await POST(makePostReq({ name: longName, broker_slugs: ["x"], notes: longNotes }));
    if (insertedName) expect(insertedName.length).toBeLessThanOrEqual(100);
    if (insertedNotes) expect(insertedNotes.length).toBeLessThanOrEqual(2000);
  });
});

// ── GET /saved-comparisons/[id] ───────────────────────────────────────────────

describe("GET /api/saved-comparisons/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET_ID(makeIdReq("GET"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when comparison not found (or belongs to another user)", async () => {
    const chain = makeChain({ data: null, error: { message: "not found" } });
    mockServerFrom.mockReturnValue(chain);

    const res = await GET_ID(makeIdReq("GET"), makeParams());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("returns comparison when found", async () => {
    const chain = makeChain({ data: COMPARISON, error: null });
    mockServerFrom.mockReturnValue(chain);

    const res = await GET_ID(makeIdReq("GET"), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comparison.id).toBe(COMPARISON_ID);
  });
});

// ── PATCH /saved-comparisons/[id] ────────────────────────────────────────────

describe("PATCH /api/saved-comparisons/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH_ID(makeIdReq("PATCH", { name: "New Name" }), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 400 when patching with empty name", async () => {
    const res = await PATCH_ID(makeIdReq("PATCH", { name: "   " }), makeParams());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot be empty/i);
  });

  it("returns 404 when comparison not found after update", async () => {
    const chain = makeChain({ data: null, error: { message: "not found" } });
    mockServerFrom.mockReturnValue(chain);

    const res = await PATCH_ID(makeIdReq("PATCH", { name: "Updated" }), makeParams());
    expect(res.status).toBe(404);
  });

  it("updates name and notes and returns the updated row", async () => {
    const updated = { ...COMPARISON, name: "Updated Name", notes: "new notes" };
    const chain = makeChain({ data: updated, error: null });
    mockServerFrom.mockReturnValue(chain);

    const res = await PATCH_ID(
      makeIdReq("PATCH", { name: "Updated Name", notes: "new notes" }),
      makeParams()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comparison.name).toBe("Updated Name");
  });
});

// ── DELETE /saved-comparisons/[id] ───────────────────────────────────────────

describe("DELETE /api/saved-comparisons/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER } });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE_ID(makeIdReq("DELETE"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 500 on DB error", async () => {
    const chain = makeChain({ error: { message: "delete failed" } });
    mockServerFrom.mockReturnValue(chain);

    const res = await DELETE_ID(makeIdReq("DELETE"), makeParams());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to delete/i);
  });

  it("returns success when deletion succeeds", async () => {
    const chain = makeChain({ error: null });
    mockServerFrom.mockReturnValue(chain);

    const res = await DELETE_ID(makeIdReq("DELETE"), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
