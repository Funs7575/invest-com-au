import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: () => mockGetUser() } })),
}));

const mockGetActiveKind = vi.fn();
const mockGetKindsForUser = vi.fn();
const mockSetActiveKind = vi.fn();
vi.mock("@/lib/account-kinds", () => ({
  getActiveKind: () => mockGetActiveKind(),
  getKindsForUser: (id: string) => mockGetKindsForUser(id),
  setActiveKind: (k: string) => mockSetActiveKind(k),
}));

// redirect() throws in Next; emulate so we can assert on it.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

import { enforcePortalKind } from "@/lib/portal-gate";

describe("enforcePortalKind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSetActiveKind.mockResolvedValue(undefined);
  });

  it("allows a brand-new 0-kind user into the investor workspace (AJ-10)", async () => {
    mockGetActiveKind.mockResolvedValue(null);
    mockGetKindsForUser.mockResolvedValue([]);
    await expect(enforcePortalKind("investor")).resolves.toBeUndefined();
    expect(mockSetActiveKind).toHaveBeenCalledWith("investor");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does NOT default non-investor portals for a 0-kind user", async () => {
    mockGetActiveKind.mockResolvedValue(null);
    mockGetKindsForUser.mockResolvedValue([]);
    await expect(enforcePortalKind("advisor")).rejects.toThrow(/REDIRECT/);
    expect(mockSetActiveKind).not.toHaveBeenCalled();
  });

  it("bounces a user who holds other kinds but not investor to the chooser (strict separation)", async () => {
    mockGetActiveKind.mockResolvedValue("advisor");
    mockGetKindsForUser.mockResolvedValue([{ kind: "advisor" }]);
    await expect(enforcePortalKind("investor")).rejects.toThrow(/select-workspace/);
    expect(mockSetActiveKind).not.toHaveBeenCalled();
  });

  it("allows the happy path (active matches + holds the kind)", async () => {
    mockGetActiveKind.mockResolvedValue("investor");
    mockGetKindsForUser.mockResolvedValue([{ kind: "investor" }]);
    await expect(enforcePortalKind("investor")).resolves.toBeUndefined();
    expect(mockSetActiveKind).not.toHaveBeenCalled();
  });

  it("sets the active-kind cookie when none is set but the user holds the kind", async () => {
    mockGetActiveKind.mockResolvedValue(null);
    mockGetKindsForUser.mockResolvedValue([{ kind: "investor" }]);
    await expect(enforcePortalKind("investor")).resolves.toBeUndefined();
    expect(mockSetActiveKind).toHaveBeenCalledWith("investor");
  });
});
