/**
 * Test for POST /api/pros/onboarding-done (C3).
 *
 * Stamps `professionals.onboarding_done_at` for the calling user.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockIsAllowed, mockUpdate, mockEq } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockUpdate: vi.fn(),
  mockEq: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/onboarding-done/route";

const USER = { id: "user-uuid-1", email: "pro@example.com" };

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/onboarding-done", {
    method: "POST",
  });
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockIsAllowed.mockReset();
  mockUpdate.mockReset();
  mockEq.mockReset();
  // .update(...).eq(...) returns a thenable that resolves to { error }.
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
});

describe("POST /api/pros/onboarding-done", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("stamps onboarding_done_at on the calling pro's row", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
    const updatePayload = mockUpdate.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(typeof updatePayload.onboarding_done_at).toBe("string");
    // ISO-8601 stamp.
    expect(updatePayload.onboarding_done_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    // Scoped to the calling user.
    expect(mockEq).toHaveBeenCalledWith("auth_user_id", USER.id);
  });

  it("returns 500 when the DB update errors", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockEq.mockResolvedValueOnce({ error: { message: "db down" } });
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });
});
