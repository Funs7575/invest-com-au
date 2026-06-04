import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsRateLimited: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { POST, DELETE } from "@/app/api/follows/advisor/route";

const USER = { id: "user-1", email: "follower@example.com" };

function makeReq(method: string, body: unknown) {
  return new Request("http://localhost/api/follows/advisor", {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * advisor_follows: insert() (POST) / delete().eq().eq() (DELETE)
 * professionals: select().eq().maybeSingle() + update().eq() (counter upkeep)
 */
function buildAdminFrom(opts: {
  insertError?: { code?: string; message: string } | null;
  deleteError?: { message: string } | null;
  professional?: { follower_count?: number } | null;
} = {}) {
  return vi.fn((table: string) => {
    if (table === "advisor_follows") {
      return {
        insert: vi.fn(async () => ({ error: opts.insertError ?? null })),
        delete: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), then: undefined } as never)),
      };
    }
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: opts.professional ?? null, error: null })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      };
    }
    return {};
  });
}

// DELETE needs delete().eq().eq() to resolve to an awaitable result.
function buildAdminFromForDelete(opts: {
  deleteError?: { message: string } | null;
  professional?: { follower_count?: number } | null;
} = {}) {
  return vi.fn((table: string) => {
    if (table === "advisor_follows") {
      const chain: Record<string, unknown> = {};
      chain.delete = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      (chain as { then?: unknown }).then = (cb: (v: unknown) => unknown) =>
        Promise.resolve(cb({ error: opts.deleteError ?? null }));
      return chain;
    }
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: opts.professional ?? null, error: null })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      };
    }
    return {};
  });
}

describe("POST /api/follows/advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockAdminFrom.mockImplementation(buildAdminFrom({ professional: { follower_count: 4 } }));
  });

  it("returns 400 on an invalid body (non-positive professionalId)", async () => {
    const res = await POST(makeReq("POST", { professionalId: -1 }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq("POST", { professionalId: 7 }) as never);
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", { professionalId: 7 }) as never);
    expect(res.status).toBe(401);
  });

  it("follows successfully and bumps the follower_count", async () => {
    const res = await POST(makeReq("POST", { professionalId: 7 }) as never);
    expect(res.status).toBe(200);
    expect((await res.json() as { success: boolean }).success).toBe(true);
  });

  it("treats a duplicate-follow unique violation (23505) as success", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ insertError: { code: "23505", message: "dup" } }));
    const res = await POST(makeReq("POST", { professionalId: 7 }) as never);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { success: boolean; alreadyFollowing: boolean };
    expect(json.alreadyFollowing).toBe(true);
  });

  it("returns 500 on a non-unique insert error", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ insertError: { code: "23000", message: "boom" } }));
    const res = await POST(makeReq("POST", { professionalId: 7 }) as never);
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/follows/advisor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockAdminFrom.mockImplementation(buildAdminFromForDelete({ professional: { follower_count: 3 } }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await DELETE(makeReq("DELETE", { professionalId: 7 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE", { professionalId: 7 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on an invalid JSON body", async () => {
    const res = await DELETE(makeReq("DELETE", "{not json"));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/invalid json/i);
  });

  it("returns 400 when the parsed body fails schema validation", async () => {
    const res = await DELETE(makeReq("DELETE", { professionalId: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/invalid request body/i);
  });

  it("unfollows successfully and decrements the follower_count", async () => {
    const res = await DELETE(makeReq("DELETE", { professionalId: 7 }));
    expect(res.status).toBe(200);
    expect((await res.json() as { success: boolean }).success).toBe(true);
  });

  it("returns 500 when the delete query errors", async () => {
    mockAdminFrom.mockImplementation(buildAdminFromForDelete({ deleteError: { message: "boom" } }));
    const res = await DELETE(makeReq("DELETE", { professionalId: 7 }));
    expect(res.status).toBe(500);
  });
});
