import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsFlagEnabled, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
  mockGetUser: vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({
    data: { user: { id: "u1", email: "user@example.com" } },
    error: null,
  })),
  mockFrom: vi.fn(() => ({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { state: "NSW" } })) })) })),
  })),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom, auth: { getUser: mockGetUser } })),
}));

const { mockGetInvestorProfile } = vi.hoisted(() => ({
  mockGetInvestorProfile: vi.fn(async () => null),
}));
vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: mockGetInvestorProfile,
}));

const { mockGetLatestForUser } = vi.hoisted(() => ({
  mockGetLatestForUser: vi.fn(async () => null),
}));
vi.mock("@/lib/quiz-history", () => ({
  getLatestForUser: mockGetLatestForUser,
}));

const { mockActivate, mockSetStatus, mockGetProspect } = vi.hoisted(() => ({
  mockActivate: vi.fn(async () => ({
    id: "p1",
    user_id: "u1",
    snapshot: { state: "NSW" },
    status: "active",
    expires_at: "2026-08-01T00:00:00Z",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  })),
  mockSetStatus: vi.fn(async () => true),
  mockGetProspect: vi.fn(async () => null),
}));
vi.mock("@/lib/prospect-pool", () => ({
  activateProspect: mockActivate,
  setProspectStatus: mockSetStatus,
  getProspectForUser: mockGetProspect,
  effectiveStatus: vi.fn(() => "active"),
}));

import { GET, POST } from "@/app/api/open-to-offers/opt-in/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/open-to-offers/opt-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockIsFlagEnabled.mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
  mockActivate.mockClear();
  mockSetStatus.mockClear();
});

describe("POST /api/open-to-offers/opt-in — flag gating", () => {
  it("404s when the open_to_offers flag is off (dormant)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await POST(postReq({ action: "activate" }));
    expect(res.status).toBe(404);
    expect(mockActivate).not.toHaveBeenCalled();
  });

  it("GET 404s when the flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await GET(new NextRequest("http://localhost/api/open-to-offers/opt-in"));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/open-to-offers/opt-in — auth", () => {
  it("401s when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(postReq({ action: "activate" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/open-to-offers/opt-in — actions", () => {
  it("activate builds + persists an anonymised snapshot and returns active", async () => {
    const res = await POST(postReq({ action: "activate" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("active");
    expect(mockActivate).toHaveBeenCalledTimes(1);
    // The snapshot passed to activate must carry only the allowlisted fields.
    const snap = (mockActivate.mock.calls[0] as unknown[])[1] as Record<string, unknown>;
    expect(JSON.stringify(snap).toLowerCase()).not.toContain("email");
  });

  it("pause flips status to paused", async () => {
    const res = await POST(postReq({ action: "pause" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "paused" });
    expect(mockSetStatus).toHaveBeenCalledWith("u1", "paused");
  });

  it("withdraw flips status to expired (off)", async () => {
    const res = await POST(postReq({ action: "withdraw" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "off" });
    expect(mockSetStatus).toHaveBeenCalledWith("u1", "expired");
  });

  it("rejects an invalid action with 400", async () => {
    const res = await POST(postReq({ action: "nope" }));
    expect(res.status).toBe(400);
  });
});
