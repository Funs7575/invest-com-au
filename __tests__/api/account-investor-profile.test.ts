import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetInvestorProfile = vi.fn(async () => ({
  authUserId: "u1",
  displayName: null,
  isFhb: false,
  isPreRetiree: false,
  isBusinessOwner: false,
  isCrossBorder: false,
  isHnw: false,
  intentCountrySnapshot: null,
  budgetBand: null,
  experienceLevel: null,
  primaryVertical: null,
  meta: {},
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
}));
const mockUpsertInvestorProfile = vi.fn(async () => true);

vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...args: unknown[]) => mockGetInvestorProfile(...args),
  upsertInvestorProfile: (...args: unknown[]) => mockUpsertInvestorProfile(...args),
}));

import { GET, PATCH } from "@/app/api/account/investor-profile/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost/api/account/investor-profile`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/account/investor-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockGetInvestorProfile.mockResolvedValue({
      authUserId: "u1",
      displayName: null,
      isFhb: false,
      meta: {},
    });
    mockUpsertInvestorProfile.mockResolvedValue(true);
  });

  it("GET rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns profile for authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("profile");
  });

  it("PATCH rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq("PATCH", { is_fhb: true }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 for invalid experience_level", async () => {
    const res = await PATCH(makeReq("PATCH", { experience_level: "expert" }));
    expect(res.status).toBe(400);
  });

  it("PATCH updates profile successfully", async () => {
    const res = await PATCH(makeReq("PATCH", { is_fhb: true, experience_level: "beginner" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("profile");
  });

  it("PATCH returns 500 when upsert fails", async () => {
    mockUpsertInvestorProfile.mockResolvedValue(false);
    const res = await PATCH(makeReq("PATCH", { is_fhb: true }));
    expect(res.status).toBe(500);
  });

  it("PATCH normalises empty string budget_band to null", async () => {
    const res = await PATCH(makeReq("PATCH", { budget_band: "" }));
    expect(res.status).toBe(200);
  });
});
