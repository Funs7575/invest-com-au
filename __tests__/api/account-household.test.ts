import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

/**
 * Route tests for /api/account/household{,/accept,/leave,/share}.
 *
 * Focus: flag-off invisibility (the dormancy contract), auth gating, and the
 * status-code mapping for each lib result. The household state machine itself
 * is covered by __tests__/lib/households.test.ts; here we mock the lib so we
 * test the HTTP envelope, not the data layer twice.
 */

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const {
  mockIsFlagEnabled,
  mockIsRateLimited,
  mockGetUser,
  mockCreateHousehold,
  mockGetContext,
  mockDeleteHousehold,
  mockClaimInvite,
  mockLeave,
  mockRevoke,
  mockSetItemShared,
  mockSendInvite,
  mockSendAccepted,
  mockGetInvestorProfile,
} = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
  mockIsRateLimited: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => false),
  mockGetUser: vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({
    data: { user: { id: "u1", email: "owner@example.com" } },
    error: null,
  })),
  mockCreateHousehold: vi.fn(),
  mockGetContext: vi.fn(),
  mockDeleteHousehold: vi.fn(),
  mockClaimInvite: vi.fn(),
  mockLeave: vi.fn(),
  mockRevoke: vi.fn(),
  mockSetItemShared: vi.fn(),
  mockSendInvite: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
  mockSendAccepted: vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true),
  mockGetInvestorProfile: vi.fn<(...a: unknown[]) => Promise<{ displayName: string }>>(
    async () => ({ displayName: "Owner" }),
  ),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a),
}));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    // accept route reads the owner roster row via the user client
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { invited_email: "owner@example.com" }, error: null })),
          })),
        })),
      })),
    })),
  })),
}));
vi.mock("@/lib/households", () => ({
  HOUSEHOLDS_FLAG: "households",
  HOUSEHOLD_NAME_MAX: 60,
  createHouseholdWithInvite: (...a: unknown[]) => mockCreateHousehold(...a),
  getHouseholdContextForUser: (...a: unknown[]) => mockGetContext(...a),
  deleteHousehold: (...a: unknown[]) => mockDeleteHousehold(...a),
  claimInvite: (...a: unknown[]) => mockClaimInvite(...a),
  leaveHousehold: (...a: unknown[]) => mockLeave(...a),
  revokeMember: (...a: unknown[]) => mockRevoke(...a),
  setItemShared: (...a: unknown[]) => mockSetItemShared(...a),
  partnerLabel: () => "Partner",
}));
vi.mock("@/lib/household-emails", () => ({
  sendHouseholdInvite: (...a: unknown[]) => mockSendInvite(...a),
  sendHouseholdAcceptedNotice: (...a: unknown[]) => mockSendAccepted(...a),
}));
vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...a: unknown[]) => mockGetInvestorProfile(...a),
}));
vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => /@/.test(e),
  isDisposableEmail: () => false,
}));

import { GET, POST, DELETE } from "@/app/api/account/household/route";
import { POST as ACCEPT } from "@/app/api/account/household/accept/route";
import { POST as LEAVE } from "@/app/api/account/household/leave/route";
import { POST as SHARE } from "@/app/api/account/household/share/route";

function makeReq(url: string, method = "POST", body?: unknown): NextRequest {
  return new Request(`http://localhost${url}`, {
    method,
    ...(body !== undefined
      ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsFlagEnabled.mockResolvedValue(true);
  mockIsRateLimited.mockResolvedValue(false);
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "owner@example.com" } }, error: null });
});

describe("GET /api/account/household — flag-off invisibility", () => {
  it("flag OFF → { household: null } (feature invisible, no error)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.household).toBeNull();
    // getHouseholdContextForUser must NOT be called when the flag is off.
    expect(mockGetContext).not.toHaveBeenCalled();
  });

  it("unauthenticated → 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("flag ON + in household → strips invite tokens from the roster", async () => {
    mockGetContext.mockResolvedValue({
      household: { id: "hh1", name: "Our household" },
      myRole: "owner",
      members: [
        { id: "m1", user_id: "u1", invited_email: "owner@example.com", role: "owner", status: "accepted", invite_token: "SECRET" },
      ],
      partner: null,
    });
    const res = await GET();
    const body = await res.json();
    expect(body.household.name).toBe("Our household");
    expect(JSON.stringify(body)).not.toContain("SECRET");
    expect(body.members[0].is_me).toBe(true);
  });
});

describe("POST /api/account/household — create + invite", () => {
  it("flag OFF → 404 (dormant)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await POST(makeReq("/api/account/household", "POST", { partner_email: "p@x.com" }));
    expect(res.status).toBe(404);
    expect(mockCreateHousehold).not.toHaveBeenCalled();
  });

  it("rate limited → 429", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq("/api/account/household", "POST", { partner_email: "p@x.com" }));
    expect(res.status).toBe(429);
  });

  it("already_in_household → 409", async () => {
    mockCreateHousehold.mockResolvedValue({ ok: false, error: "already_in_household" });
    const res = await POST(makeReq("/api/account/household", "POST", { partner_email: "p@x.com" }));
    expect(res.status).toBe(409);
  });

  it("success → 201 + fires the invite email", async () => {
    mockCreateHousehold.mockResolvedValue({
      ok: true,
      household: { id: "hh1", name: "Our household" },
      invite: { invite_token: "tok", invited_email: "p@x.com" },
    });
    const res = await POST(makeReq("/api/account/household", "POST", { partner_email: "p@x.com" }));
    expect(res.status).toBe(201);
    expect(mockSendInvite).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/account/household/accept", () => {
  it("flag OFF → 404", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await ACCEPT(makeReq("/api/account/household/accept", "POST", { token: "t" }));
    expect(res.status).toBe(404);
  });

  it("wrong_email → 403", async () => {
    mockClaimInvite.mockResolvedValue({ ok: false, error: "wrong_email" });
    const res = await ACCEPT(makeReq("/api/account/household/accept", "POST", { token: "t" }));
    expect(res.status).toBe(403);
  });

  it("already_in_household → 409", async () => {
    mockClaimInvite.mockResolvedValue({ ok: false, error: "already_in_household" });
    const res = await ACCEPT(makeReq("/api/account/household/accept", "POST", { token: "t" }));
    expect(res.status).toBe(409);
  });

  it("success → 200", async () => {
    mockClaimInvite.mockResolvedValue({ ok: true, household: { id: "hh1", name: "Our household" }, member: {} });
    const res = await ACCEPT(makeReq("/api/account/household/accept", "POST", { token: "t" }));
    expect(res.status).toBe(200);
  });
});

describe("POST /api/account/household/leave", () => {
  it("flag OFF → 404", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await LEAVE(makeReq("/api/account/household/leave", "POST", { action: "leave" }));
    expect(res.status).toBe(404);
  });

  it("leave forbidden (owner) → 403", async () => {
    mockLeave.mockResolvedValue({ ok: false, error: "forbidden" });
    const res = await LEAVE(makeReq("/api/account/household/leave", "POST", { action: "leave" }));
    expect(res.status).toBe(403);
  });

  it("revoke success → 200", async () => {
    mockRevoke.mockResolvedValue({ ok: true });
    const res = await LEAVE(
      makeReq("/api/account/household/leave", "POST", {
        action: "revoke",
        member_id: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockRevoke).toHaveBeenCalled();
  });

  it("revoke with a non-uuid member_id → 400 (schema reject)", async () => {
    const res = await LEAVE(
      makeReq("/api/account/household/leave", "POST", { action: "revoke", member_id: "not-a-uuid" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/account/household/share", () => {
  it("flag OFF → 404", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await SHARE(
      makeReq("/api/account/household/share", "POST", { kind: "goal", item_id: 1, shared: true }),
    );
    expect(res.status).toBe(404);
  });

  it("not_in_household → 409", async () => {
    mockSetItemShared.mockResolvedValue({ ok: false, error: "not_in_household" });
    const res = await SHARE(
      makeReq("/api/account/household/share", "POST", { kind: "goal", item_id: 1, shared: true }),
    );
    expect(res.status).toBe(409);
  });

  it("success → 200", async () => {
    mockSetItemShared.mockResolvedValue({ ok: true });
    const res = await SHARE(
      makeReq("/api/account/household/share", "POST", { kind: "balance", item_id: "uuid-1", shared: false }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shared).toBe(false);
  });

  it("invalid kind → 400 (schema reject)", async () => {
    const res = await SHARE(
      makeReq("/api/account/household/share", "POST", { kind: "nope", item_id: 1, shared: true }),
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/account/household", () => {
  it("flag OFF → 404", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await DELETE();
    expect(res.status).toBe(404);
  });

  it("forbidden (not owner) → 403", async () => {
    mockDeleteHousehold.mockResolvedValue({ ok: false, error: "forbidden" });
    const res = await DELETE();
    expect(res.status).toBe(403);
  });

  it("success → 200", async () => {
    mockDeleteHousehold.mockResolvedValue({ ok: true });
    const res = await DELETE();
    expect(res.status).toBe(200);
  });
});
