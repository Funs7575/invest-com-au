import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

let mockUser: { id: string; email: string | null } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null }),
    },
  })),
}));

// requireAdmin reads getAdminEmails() each call — mock via env.
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { requireAdmin } from "@/lib/require-admin";

describe("requireAdmin", () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    // Known allowlist for the suite
    process.env.ADMIN_EMAILS = "admin@invest.com.au,finn@invest.com.au";
    mockUser = null;
  });

  afterEach(() => {
    if (originalAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it("returns 401 when no user is logged in", async () => {
    mockUser = null;
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const json = await result.response.json();
      expect(json.error).toBe("Unauthorized");
    }
  });

  it("returns 401 when user has no email (e.g. anonymous auth)", async () => {
    mockUser = { id: "u1", email: null };
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when the logged-in email is not in the admin allowlist", async () => {
    mockUser = { id: "u1", email: "notadmin@invest.com.au" };
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const json = await result.response.json();
      expect(json.error).toBe("Forbidden");
    }
  });

  it("returns ok=true with email + userId for an allowlisted user", async () => {
    mockUser = { id: "user-42", email: "admin@invest.com.au" };
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("admin@invest.com.au");
      expect(result.userId).toBe("user-42");
    }
  });

  it("is case-insensitive on the email check (allowlist is lowercased)", async () => {
    mockUser = { id: "user-42", email: "ADMIN@INVEST.COM.AU" };
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
  });

  it("respects runtime ADMIN_EMAILS changes (not just import-time)", async () => {
    process.env.ADMIN_EMAILS = "runtime-only@example.com";
    mockUser = { id: "u1", email: "runtime-only@example.com" };
    const result = await requireAdmin();
    expect(result.ok).toBe(true);
  });

  it("rejects users from the 'looks-similar' address space (exact match only)", async () => {
    // Don't want a regression that matches by substring or prefix
    mockUser = { id: "u1", email: "admin@invest.com.au.attacker.com" };
    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });
});
