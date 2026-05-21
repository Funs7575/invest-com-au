import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

// getAdminEmails is called at module scope in lib/admin, and getAdminEmails() is called in route
vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

import { GET } from "@/app/api/admin/verify/route";

describe("GET /api/admin/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.admin).toBe(false);
  });

  it("returns 401 when auth errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error("auth fail") });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated but not admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "regular@example.com" } },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.admin).toBe(false);
  });

  it("returns 200 with admin:true for admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.admin).toBe(true);
    expect(json.email).toBe("admin@invest.com.au");
  });
});
