import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  getAdminCapabilities,
  hasAdminCapability,
  ALL_CAPABILITIES,
} from "@/lib/admin-rbac";

function dbAdmin(result: { data: unknown; error?: { message: string } | null }) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve(result) }),
      }),
    }),
  };
}

describe("admin-rbac getAdminCapabilities", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    vi.stubEnv("ADMIN_EMAILS", "boss@invest.com.au");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns empty for blank email", async () => {
    expect((await getAdminCapabilities("")).size).toBe(0);
    expect((await getAdminCapabilities(null)).size).toBe(0);
  });

  it("env admin is a superuser (all capabilities)", async () => {
    const caps = await getAdminCapabilities("boss@invest.com.au");
    expect(caps.size).toBe(ALL_CAPABILITIES.length);
    for (const c of ALL_CAPABILITIES) expect(caps.has(c)).toBe(true);
    // didn't even hit the DB
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("env match is case-insensitive", async () => {
    const caps = await getAdminCapabilities("  BOSS@Invest.com.au ");
    expect(caps.size).toBe(ALL_CAPABILITIES.length);
  });

  it("non-env admin resolves DB role capabilities", async () => {
    mockFrom.mockReturnValue(
      dbAdmin({
        data: {
          role_id: 3,
          active: true,
          admin_roles: {
            admin_role_capabilities: [
              { capability: "can_view_pii" },
              { capability: "can_moderate" },
            ],
          },
        },
        error: null,
      }),
    );
    const caps = await getAdminCapabilities("support@example.com");
    expect([...caps].sort()).toEqual(["can_moderate", "can_view_pii"]);
  });

  it("non-admin (no row) → empty", async () => {
    mockFrom.mockReturnValue(dbAdmin({ data: null, error: null }));
    expect((await getAdminCapabilities("nobody@example.com")).size).toBe(0);
  });
});

describe("hasAdminCapability", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    vi.stubEnv("ADMIN_EMAILS", "boss@invest.com.au");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("true for an env superuser on any capability", async () => {
    expect(await hasAdminCapability("boss@invest.com.au", "can_change_pricing")).toBe(true);
  });

  it("false for a scoped DB admin lacking the capability", async () => {
    const row = {
      data: { role_id: 4, active: true, admin_roles: { admin_role_capabilities: [{ capability: "can_view_audit" }] } },
      error: null,
    };
    mockFrom.mockReturnValue(dbAdmin(row));
    expect(await hasAdminCapability("readonly@example.com", "can_change_pricing")).toBe(false);
    mockFrom.mockReturnValue(dbAdmin(row));
    expect(await hasAdminCapability("readonly@example.com", "can_view_audit")).toBe(true);
  });
});
