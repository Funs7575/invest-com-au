import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: () => mockGetUser() } })
  ),
}));

const mockGetAdminEmails = vi.fn<() => string[]>(() => ["admin@invest.com.au"]);
vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => mockGetAdminEmails(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/admin/verify/route";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/verify", () => {
  afterEach(() => vi.resetAllMocks());

  it("returns 401 when getUser returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("auth error"),
    });

    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.admin).toBe(false);
  });

  it("returns 401 when no user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.admin).toBe(false);
  });

  it("returns 403 when user email is not in admin list", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "regular@example.com" } },
      error: null,
    });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);

    const res = await GET();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.admin).toBe(false);
    expect(json.email).toBe("regular@example.com");
  });

  it("returns 200 when user is an admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } },
      error: null,
    });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.admin).toBe(true);
    expect(json.email).toBe("admin@invest.com.au");
  });

  it("compares email case-insensitively (admin list is lowercased)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "Admin@Invest.Com.Au" } },
      error: null,
    });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);

    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns 403 when user.email is undefined", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: undefined } },
      error: null,
    });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 500 on unexpected throw", async () => {
    mockGetUser.mockRejectedValue(new Error("network failure"));

    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.admin).toBe(false);
  });
});
