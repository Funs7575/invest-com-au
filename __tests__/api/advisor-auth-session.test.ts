import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();
const mockAdminFrom = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser, signOut: mockSignOut },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, DELETE } from "@/app/api/advisor-auth/session/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADVISOR = {
  id: 42,
  name: "Alice",
  email: "alice@example.com",
  auth_user_id: "user-uuid-1",
  status: "active",
};

function makeReq(method: string, cookie?: string): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/session", {
    method,
    headers: cookie ? { Cookie: cookie } : {},
  });
}

function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "update", "delete", "eq", "or", "in"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: null, error: null });
    return Promise.resolve();
  });
  return c;
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no user and no cookie", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Not authenticated" });
  });

  it("returns 200 with authMethod=supabase when Supabase user has linked advisor", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-uuid-1", email: ADVISOR.email } },
    });
    mockAdminFrom.mockReturnValue(makeChain({ data: ADVISOR, error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authMethod).toBe("supabase");
    expect(body.advisor.id).toBe(42);
  });

  it("triggers admin update to link auth_user_id when null on the advisor record", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-uuid-1", email: ADVISOR.email } },
    });
    const chain = makeChain({ data: { ...ADVISOR, auth_user_id: null }, error: null });
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq("GET"));
    expect(chain.update).toHaveBeenCalled();
  });

  it("falls back to legacy cookie path when Supabase returns no user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") {
        return makeChain({
          data: {
            professional_id: 42,
            expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          },
          error: null,
        });
      }
      return makeChain({ data: ADVISOR, error: null });
    });
    const res = await GET(makeReq("GET", "advisor_session=tok-abc"));
    expect(res.status).toBe(200);
    expect((await res.json()).authMethod).toBe("legacy");
  });

  it("returns 401 and clears cookie when legacy session is expired", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockAdminFrom.mockReturnValue(
      makeChain({
        data: {
          professional_id: 42,
          expires_at: new Date(Date.now() - 1_000).toISOString(),
        },
        error: null,
      }),
    );
    const res = await GET(makeReq("GET", "advisor_session=expired-tok"));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Session expired" });
  });

  it("returns 500 on unexpected error", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("DB down"));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Failed" });
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs out and returns 200 when no legacy cookie", async () => {
    mockSignOut.mockResolvedValueOnce({});
    const res = await DELETE(makeReq("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("deletes legacy session row when cookie is present", async () => {
    mockSignOut.mockResolvedValueOnce({});
    const chain = makeChain({ data: null, error: null });
    mockAdminFrom.mockReturnValue(chain);
    await DELETE(makeReq("DELETE", "advisor_session=tok-123"));
    expect(chain.delete).toHaveBeenCalled();
  });

  it("swallows signOut exceptions and still returns 200", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("auth service down"));
    const res = await DELETE(makeReq("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
  });
});
