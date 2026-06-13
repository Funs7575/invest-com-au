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

const mockLinkProfessionalAuthUser = vi.fn();
vi.mock("@/lib/professional-auth-link", () => ({
  linkProfessionalAuthUser: (...a: unknown[]) => mockLinkProfessionalAuthUser(...a),
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
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "pro@example.com" } } });
    mockSetActiveKind.mockResolvedValue(undefined);
    mockLinkProfessionalAuthUser.mockResolvedValue(0); // default: nothing to heal
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

  it("redirects an unauthenticated visitor to /auth/login?next= the portal path (A-19 migration)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(enforcePortalKind("advisor")).rejects.toThrow(/REDIRECT/);
    // Must point at the real sign-in route (/auth/login?next=), not the legacy
    // /account/login?redirect= URL that only existed as a next.config.ts hop.
    expect(mockRedirect).toHaveBeenCalledWith(
      `/auth/login?next=${encodeURIComponent("/advisor-portal")}`,
    );
    expect(mockGetActiveKind).not.toHaveBeenCalled();
  });

  it("preserves the actual requested deep-link path in next= when given (Campaign 3 P3)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(
      enforcePortalKind("investor", "/account/holdings"),
    ).rejects.toThrow(/REDIRECT/);
    // Without the requestedPath arg the gate would default to /account and drop
    // the /account/holdings deep-link before the page's own redirect can run.
    expect(mockRedirect).toHaveBeenCalledWith(
      `/auth/login?next=${encodeURIComponent("/account/holdings")}`,
    );
    expect(mockGetActiveKind).not.toHaveBeenCalled();
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

  // AJ-12 real root cause: setActiveKind writes a cookie, which throws during a
  // Server Component render. The gate must NOT crash — it should still allow the
  // entitled user through (best-effort cookie write).
  it("does NOT crash the portal when the cookie write is blocked during render (AJ-12)", async () => {
    mockGetActiveKind.mockResolvedValue(null);
    mockGetKindsForUser.mockResolvedValue([{ kind: "advisor" }]);
    mockSetActiveKind.mockRejectedValue(
      new Error("Cookies can only be modified in a Server Action or Route Handler"),
    );
    await expect(enforcePortalKind("advisor")).resolves.toBeUndefined();
  });

  it("0-kind investor default survives a blocked cookie write (AJ-10 + AJ-12)", async () => {
    mockGetActiveKind.mockResolvedValue(null);
    mockGetKindsForUser.mockResolvedValue([]);
    mockSetActiveKind.mockRejectedValue(new Error("blocked"));
    await expect(enforcePortalKind("investor")).resolves.toBeUndefined();
  });

  // P0: ~98% of active advisors have a NULL auth_user_id, so the membership
  // view reports zero kinds and the gate would lock them out of their own
  // portal. The gate self-heals the link on email match and re-resolves.
  it("self-heals an unlinked advisor (NULL auth_user_id) and lets them into the portal", async () => {
    mockGetActiveKind.mockResolvedValue(null);
    // First resolve: view still reports no kinds (unlinked). After the heal
    // links the row, the second resolve surfaces the advisor kind.
    mockGetKindsForUser
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ kind: "advisor" }]);
    mockLinkProfessionalAuthUser.mockResolvedValue(1);

    await expect(enforcePortalKind("advisor")).resolves.toBeUndefined();

    expect(mockLinkProfessionalAuthUser).toHaveBeenCalledWith("u1", "pro@example.com");
    expect(mockGetKindsForUser).toHaveBeenCalledTimes(2); // re-resolved after heal
    expect(mockSetActiveKind).toHaveBeenCalledWith("advisor");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("still bounces to the chooser when self-heal finds no matching professional", async () => {
    mockGetActiveKind.mockResolvedValue(null);
    mockGetKindsForUser.mockResolvedValue([]); // never resolves a kind
    mockLinkProfessionalAuthUser.mockResolvedValue(0); // nothing to heal

    await expect(enforcePortalKind("advisor")).rejects.toThrow(/select-workspace/);
    expect(mockGetKindsForUser).toHaveBeenCalledTimes(1); // no re-resolve when 0 linked
  });
});
