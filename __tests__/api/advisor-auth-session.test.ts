import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSignOut = vi.fn(() => Promise.resolve({ error: null }));
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser, signOut: mockSignOut },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { GET, DELETE } from "@/app/api/advisor-auth/session/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function reqWithCookie(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/session", {
    method: "GET",
    headers,
  });
}

function deleteReqWithCookie(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/session", {
    method: "DELETE",
    headers,
  });
}

const ADVISOR = {
  id: 7,
  name: "Test Advisor",
  slug: "test-advisor",
  email: "advisor@test.com",
  status: "active",
  auth_user_id: null,
};

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 401 when no auth user and no legacy cookie", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(reqWithCookie());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  it("returns advisor with authMethod=supabase when supabase user is linked", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-123", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({
            data: { ...ADVISOR, auth_user_id: "u-123" },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(reqWithCookie());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.authMethod).toBe("supabase");
    expect(json.advisor.id).toBe(7);
  });

  it("links auth_user_id when not yet set on advisor row", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-456", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({
            data: { ...ADVISOR, auth_user_id: null },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(reqWithCookie());
    expect(res.status).toBe(200);
    // Should have called update on professionals to backfill auth_user_id
    const proCalls = supabaseCalls.professionals || [];
    const updateCall = proCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.auth_user_id).toBe("u-456");
  });

  it("returns advisor with authMethod=legacy for valid legacy session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const futureExpiry = new Date(Date.now() + 86400 * 1000).toISOString();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: 7, expires_at: futureExpiry },
            error: null,
          }),
        );
      }
      if (table === "professionals") {
        b.single = vi.fn(() => Promise.resolve({ data: ADVISOR, error: null }));
      }
      return b;
    });

    const res = await GET(reqWithCookie("legacy-token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.authMethod).toBe("legacy");
  });

  it("returns 401 and clears cookie when legacy session is expired", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const pastExpiry = new Date(Date.now() - 86400 * 1000).toISOString();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: 7, expires_at: pastExpiry },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(reqWithCookie("legacy-stale"));
    expect(res.status).toBe(401);
    // Cookie should be cleared via Set-Cookie with empty/expiry
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("advisor_session=");
  });
});

describe("DELETE /api/advisor-auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("signs out and clears cookie even with no legacy session", async () => {
    const res = await DELETE(deleteReqWithCookie());
    expect(res.status).toBe(200);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("deletes legacy session row when cookie is present", async () => {
    const res = await DELETE(deleteReqWithCookie("legacy-token"));
    expect(res.status).toBe(200);
    const sessCalls = supabaseCalls.advisor_sessions || [];
    expect(sessCalls.some((c) => c.method === "delete")).toBe(true);
  });

  it("still returns success when supabase signOut throws", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("network blip"));
    const res = await DELETE(deleteReqWithCookie("legacy-token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
