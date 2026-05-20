import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockGetInvestorProfile = vi.fn();
const mockUpsertInvestorProfile = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...a: unknown[]) => mockGetInvestorProfile(...a),
  upsertInvestorProfile: (...a: unknown[]) => mockUpsertInvestorProfile(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, PATCH } from "@/app/api/account/investor-profile/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/investor-profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/account/investor-profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("returns the profile for an authenticated user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockGetInvestorProfile.mockResolvedValueOnce({ user_id: USER.id, is_fhb: true });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toEqual({ user_id: USER.id, is_fhb: true });
    expect(mockGetInvestorProfile).toHaveBeenCalledWith(USER.id);
  });

  it("returns null when the user has no profile yet", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockGetInvestorProfile.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).profile).toBeNull();
  });
});

// ── PATCH tests ─────────────────────────────────────────────────────────────────

describe("PATCH /api/account/investor-profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on invalid JSON (withValidatedBody envelope)", async () => {
    const res = await PATCH(makePatch("not-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON body");
  });

  it("returns 400 when a field has the wrong type", async () => {
    const res = await PATCH(makePatch({ is_fhb: "yes-please" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("validation_error");
  });

  it("returns 400 for an out-of-range enum value", async () => {
    const res = await PATCH(makePatch({ budget_band: "gigantic" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makePatch({ is_fhb: true }));
    expect(res.status).toBe(401);
    expect(mockUpsertInvestorProfile).not.toHaveBeenCalled();
  });

  it("returns 500 when the upsert fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockUpsertInvestorProfile.mockResolvedValueOnce(false);
    const res = await PATCH(makePatch({ is_fhb: true }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("update_failed");
  });

  it("patches only the supplied fields, coerces empty strings to null, and returns the fresh profile", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockUpsertInvestorProfile.mockResolvedValueOnce(true);
    mockGetInvestorProfile.mockResolvedValueOnce({ user_id: USER.id, is_hnw: true });

    const res = await PATCH(
      makePatch({ is_hnw: true, budget_band: "", display_name: "Al" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.profile).toEqual({ user_id: USER.id, is_hnw: true });

    expect(mockUpsertInvestorProfile).toHaveBeenCalledWith(USER.id, {
      is_hnw: true,
      budget_band: null,
      display_name: "Al",
    });
  });

  it("accepts a valid country snapshot enum", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockUpsertInvestorProfile.mockResolvedValueOnce(true);
    mockGetInvestorProfile.mockResolvedValueOnce({ user_id: USER.id });
    const res = await PATCH(makePatch({ intent_country_snapshot: "uk" }));
    expect(res.status).toBe(200);
    expect(mockUpsertInvestorProfile).toHaveBeenCalledWith(USER.id, {
      intent_country_snapshot: "uk",
    });
  });
});
