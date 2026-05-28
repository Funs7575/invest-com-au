import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const mockIsRateLimited = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

// withValidatedBody: run real Zod validation so 400 cases fire correctly.
vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody:
    (
      schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } },
      handler: (req: NextRequest, body: unknown) => unknown,
    ) =>
    async (req: NextRequest) => {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: "Invalid request body." }), { status: 400 });
      }
      return handler(req, parsed.data);
    },
}));

import { POST, DELETE } from "@/app/api/follows/advisor/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = "user-111";
const PRO_ID = 42;

function makePostRequest(body?: unknown) {
  return new NextRequest("http://localhost/api/follows/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeDeleteRequest(body?: unknown) {
  return new Request("http://localhost/api/follows/advisor", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeInsertBuilder(error: unknown = null) {
  return { insert: vi.fn(() => Promise.resolve({ error })) };
}

function makeDeleteBuilder(error: unknown = null) {
  return {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (cb: (v: unknown) => unknown) => Promise.resolve(cb({ error })),
  };
}

function makeMaybySingleBuilder(data: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
  };
}

function makeUpdateBuilder(error: unknown = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ error })),
  };
}

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/follows/advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePostRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePostRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing professionalId", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 and alreadyFollowing:true on duplicate (23505)", async () => {
    mockAdminFrom.mockImplementationOnce(() =>
      makeInsertBuilder({ code: "23505", message: "duplicate key" }),
    );
    const res = await POST(makePostRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alreadyFollowing).toBe(true);
  });

  it("returns 500 on non-duplicate insert error", async () => {
    mockAdminFrom.mockImplementationOnce(() =>
      makeInsertBuilder({ code: "42501", message: "permission denied" }),
    );
    const res = await POST(makePostRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(500);
  });

  it("returns 200 and increments follower_count on success", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeInsertBuilder(null))                       // follow insert
      .mockImplementationOnce(() => makeMaybySingleBuilder({ follower_count: 5 })) // read count
      .mockImplementationOnce(() => makeUpdateBuilder(null));                       // update count
    const res = await POST(makePostRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("still returns 200 when follower_count increment fails (best-effort)", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeInsertBuilder(null))
      .mockImplementationOnce(() => makeMaybySingleBuilder({ follower_count: 3 }))
      .mockImplementationOnce(() => makeUpdateBuilder({ message: "lock timeout" }));
    const res = await POST(makePostRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(200);
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/follows/advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await DELETE(makeDeleteRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeDeleteRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/follows/advisor", { method: "DELETE", body: "not-json" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing professionalId", async () => {
    const res = await DELETE(makeDeleteRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 500 when delete fails", async () => {
    mockAdminFrom.mockImplementationOnce(() => ({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (cb: (v: unknown) => unknown) =>
        Promise.resolve(cb({ error: { message: "delete failed" } })),
    }));
    const res = await DELETE(makeDeleteRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(500);
  });

  it("returns 200 and decrements follower_count on success", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeDeleteBuilder(null))                        // unfollow delete
      .mockImplementationOnce(() => makeMaybySingleBuilder({ follower_count: 4 }))  // read count
      .mockImplementationOnce(() => makeUpdateBuilder(null));                        // decrement count
    const res = await DELETE(makeDeleteRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("clamps follower_count to 0 (no negative counts)", async () => {
    mockAdminFrom
      .mockImplementationOnce(() => makeDeleteBuilder(null))
      .mockImplementationOnce(() => makeMaybySingleBuilder({ follower_count: 0 }))
      .mockImplementationOnce(() => makeUpdateBuilder(null));
    const res = await DELETE(makeDeleteRequest({ professionalId: PRO_ID }));
    expect(res.status).toBe(200);
  });
});
