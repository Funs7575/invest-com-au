/**
 * Tests for /api/account/digest-prefs — digest email preferences (W2 Phase 2).
 *
 *   GET — read prefs from investor_profiles.meta (default false per key)
 *   PUT — merge supplied keys into meta (withValidatedBody → Body)
 *
 * DB access is delegated to lib/investor-profiles helpers, which are
 * mocked here; the route itself only does auth + meta merge logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockGetProfile, mockUpsertProfile } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetProfile: vi.fn(),
  mockUpsertProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...args: unknown[]) => mockGetProfile(...args),
  upsertInvestorProfile: (...args: unknown[]) => mockUpsertProfile(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET, PUT } from "@/app/api/account/digest-prefs/route";

const USER = { id: "user-digest-1", email: "digest@test.com" };

function makePut(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/digest-prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

describe("GET /api/account/digest-prefs", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "unauthorized" });
  });

  it("defaults both prefs to false when profile has no meta", async () => {
    mockGetProfile.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      prefs: { watchlist_digest: false, advisor_digest: false },
    });
  });

  it("reflects stored truthy meta flags", async () => {
    mockGetProfile.mockResolvedValueOnce({
      meta: { watchlist_digest: true, advisor_digest: false, unrelated: 1 },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      prefs: { watchlist_digest: true, advisor_digest: false },
    });
    expect(mockGetProfile).toHaveBeenCalledWith(USER.id);
  });
});

describe("PUT /api/account/digest-prefs", () => {
  it("returns 400 when a pref value is not a boolean", async () => {
    const res = await PUT(makePut({ watchlist_digest: "yes" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PUT(makePut({ watchlist_digest: true }));
    expect(res.status).toBe(401);
  });

  it("merges supplied keys into existing meta, preserving untouched keys", async () => {
    mockGetProfile.mockResolvedValueOnce({
      meta: { advisor_digest: true, other: "keep" },
    });
    mockUpsertProfile.mockResolvedValueOnce(true);

    const res = await PUT(makePut({ watchlist_digest: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      prefs: { watchlist_digest: true, advisor_digest: true },
    });
    // Existing keys preserved; only watchlist_digest added.
    expect(mockUpsertProfile).toHaveBeenCalledWith(USER.id, {
      meta: { advisor_digest: true, other: "keep", watchlist_digest: true },
    });
  });

  it("returns 500 when the upsert fails", async () => {
    mockGetProfile.mockResolvedValueOnce({ meta: {} });
    mockUpsertProfile.mockResolvedValueOnce(false);
    const res = await PUT(makePut({ advisor_digest: true }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "update_failed" });
  });

  it("starts from an empty meta object when no profile exists", async () => {
    mockGetProfile.mockResolvedValueOnce(null);
    mockUpsertProfile.mockResolvedValueOnce(true);
    const res = await PUT(makePut({ advisor_digest: true }));
    expect(res.status).toBe(200);
    expect(mockUpsertProfile).toHaveBeenCalledWith(USER.id, {
      meta: { advisor_digest: true },
    });
  });
});
