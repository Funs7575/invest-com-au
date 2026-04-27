import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

import { PATCH } from "@/app/api/advisor-auth/profile/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePatch(
  body: Record<string, unknown>,
  cookie?: string,
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers,
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/profile", () => {
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
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await PATCH(makePatch({ bio: "hi" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when no auth user and no legacy session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makePatch({ bio: "hi" }));
    expect(res.status).toBe(401);
  });

  it("updates allowed fields when authed via supabase", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "a@b.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 99 }, error: null }),
        );
      }
      return b;
    });

    const res = await PATCH(
      makePatch({
        bio: "New bio",
        website: "https://example.com",
        // Disallowed field — should be silently dropped
        verified: true,
        rating: 5,
      }),
    );
    expect(res.status).toBe(200);

    // Server client (createClient) is what runs the update
    const proCalls = supabaseCalls.professionals || [];
    const updateCall = proCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const args = updateCall?.args[0] as Record<string, unknown>;
    expect(args.bio).toBe("New bio");
    expect(args.website).toBe("https://example.com");
    // Disallowed fields must NOT leak into the update
    expect(args.verified).toBeUndefined();
    expect(args.rating).toBeUndefined();
    expect(typeof args.updated_at).toBe("string");
  });

  it("returns 500 when the update query errors", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-2", email: "a@b.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 99 }, error: null }),
        );
      }
      return b;
    });
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        // Override the awaited update result
        b.eq = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "db error" } }),
        );
      }
      return b;
    });

    const res = await PATCH(makePatch({ bio: "hi" }));
    expect(res.status).toBe(500);
  });

  it("authenticates via legacy session cookie when supabase user is absent", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const futureExpiry = new Date(Date.now() + 86400 * 1000).toISOString();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: 88, expires_at: futureExpiry },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await PATCH(
      makePatch({ bio: "from legacy" }, "legacy-cookie"),
    );
    expect(res.status).toBe(200);
  });

  it("returns 401 when legacy session is expired", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const pastExpiry = new Date(Date.now() - 1000).toISOString();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_sessions") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: 88, expires_at: pastExpiry },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await PATCH(makePatch({ bio: "x" }, "stale-cookie"));
    expect(res.status).toBe(401);
  });
});
