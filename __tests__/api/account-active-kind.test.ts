/**
 * Tests for /api/account/active-kind — workspace cookie switcher (W2 Phase 2.5).
 *
 *   GET  — memberships + currently-active kind (best-effort; no 401)
 *   POST — validate membership, set iv_active_kind cookie, return portal URL
 *
 * The lib/account-kinds helpers are mocked. isWorkspaceKind / portalForKind
 * are pure, so the mocks reproduce the real behaviour to keep the route's
 * branching honest.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetUser,
  mockGetKindsForUser,
  mockGetActiveKind,
  mockSetActiveKind,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetKindsForUser: vi.fn(),
  mockGetActiveKind: vi.fn(),
  mockSetActiveKind: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/account-kinds", () => {
  const KNOWN = new Set([
    "advisor",
    "broker_partner",
    "investor",
    "business_owner",
    "listing_owner",
  ]);
  return {
    getKindsForUser: (...args: unknown[]) => mockGetKindsForUser(...args),
    getActiveKind: (...args: unknown[]) => mockGetActiveKind(...args),
    setActiveKind: (...args: unknown[]) => mockSetActiveKind(...args),
    isWorkspaceKind: (v: string) => KNOWN.has(v),
    portalForKind: (kind: string, fallback = "/account") => {
      switch (kind) {
        case "advisor":
          return "/advisor-portal";
        case "broker_partner":
          return "/broker-portal";
        case "business_owner":
          return "/business-portal";
        case "listing_owner":
          return "/invest/my-listings";
        default:
          return fallback;
      }
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, POST } from "@/app/api/account/active-kind/route";

const USER = { id: "user-kind-1", email: "kind@test.com" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/active-kind", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

describe("GET /api/account/active-kind", () => {
  it("returns an empty state for unauthenticated callers (no 401)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ memberships: [], active: null });
  });

  it("maps memberships and surfaces the active kind cookie", async () => {
    mockGetKindsForUser.mockResolvedValueOnce([
      {
        kind: "advisor",
        kindId: "adv-1",
        status: "active",
        displayLabel: "Jane Advisor",
      },
    ]);
    mockGetActiveKind.mockResolvedValueOnce("advisor");

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      memberships: [
        {
          kind: "advisor",
          kind_id: "adv-1",
          status: "active",
          display_label: "Jane Advisor",
        },
      ],
      active: "advisor",
    });
  });
});

describe("POST /api/account/active-kind", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makePost({ kind: "advisor" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an unknown kind", async () => {
    const res = await POST(makePost({ kind: "wizard" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "unknown_kind" });
    expect(mockSetActiveKind).not.toHaveBeenCalled();
  });

  it("returns 403 when the user does not hold the requested kind", async () => {
    mockGetKindsForUser.mockResolvedValueOnce([{ kind: "investor" }]);
    const res = await POST(makePost({ kind: "advisor" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "no_membership" });
    expect(mockSetActiveKind).not.toHaveBeenCalled();
  });

  it("sets the cookie and returns the portal redirect for a held kind", async () => {
    mockGetKindsForUser.mockResolvedValueOnce([{ kind: "advisor" }]);
    mockSetActiveKind.mockResolvedValueOnce(undefined);
    const res = await POST(makePost({ kind: "advisor" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      kind: "advisor",
      redirect: "/advisor-portal",
    });
    expect(mockSetActiveKind).toHaveBeenCalledWith("advisor");
  });

  it("allows investor for any signed-in user even without an explicit membership", async () => {
    mockGetKindsForUser.mockResolvedValueOnce([]);
    mockSetActiveKind.mockResolvedValueOnce(undefined);
    const res = await POST(makePost({ kind: "investor" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, kind: "investor", redirect: "/account" });
    expect(mockSetActiveKind).toHaveBeenCalledWith("investor");
  });
});
