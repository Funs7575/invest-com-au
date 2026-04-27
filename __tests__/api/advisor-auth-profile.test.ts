import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { PATCH } from "@/app/api/advisor-auth/profile/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "update", "eq", "or", "in"]) c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve();
  });
  return c;
}

function patch(body: Record<string, unknown>) {
  return PATCH(makeRequest("/api/advisor-auth/profile", body, { method: "PATCH" }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const res = await patch({ bio: "hello" });
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated (no Supabase user, no cookie)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await patch({ bio: "hello" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Not authenticated" });
  });

  it("returns 200 on successful update via Supabase auth", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "uid-1", email: "a@a.com" } },
    });
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 99 }, error: null }));
    mockServerFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await patch({ bio: "New bio" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
  });

  it("only passes allowed fields — disallowed fields (status, verified) are excluded", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "uid-1", email: "a@a.com" } },
    });
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 99 }, error: null }));
    const serverChain = makeChain({ data: null, error: null });
    mockServerFrom.mockReturnValue(serverChain);
    await patch({ bio: "Safe bio", status: "inactive", verified: true, rating: 5 });
    const updateArg = serverChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArg).toHaveProperty("bio", "Safe bio");
    expect(updateArg).not.toHaveProperty("status");
    expect(updateArg).not.toHaveProperty("verified");
    expect(updateArg).not.toHaveProperty("rating");
  });

  it("returns 500 when DB update fails", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "uid-1", email: "a@a.com" } },
    });
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 99 }, error: null }));
    mockServerFrom.mockReturnValue(makeChain({ data: null, error: { message: "constraint violation" } }));
    const res = await patch({ bio: "bio" });
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Update failed" });
  });
});
