import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockClaimPlanForUser, mockLogEvent } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetUser: vi.fn(),
  mockClaimPlanForUser: vi.fn(),
  mockLogEvent: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/getmatched/action-plans", () => ({
  claimPlanForUser: mockClaimPlanForUser,
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: mockLogEvent,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/claim/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/get-matched/plans/5/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

function ctx(id = "5") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/get-matched/plans/[id]/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockLogEvent.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq(), ctx());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("returns 400 for a non-numeric plan id", async () => {
    const res = await POST(makeReq(), ctx("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid plan id." });
  });

  it("claims the plan, logs an event, and returns it", async () => {
    const plan = { id: 5, session_id: "sess-1", auth_user_id: USER.id, status: "claimed" };
    mockClaimPlanForUser.mockResolvedValueOnce(plan);
    const res = await POST(makeReq(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, plan });
    expect(mockClaimPlanForUser).toHaveBeenCalledWith({
      planId: 5,
      authUserId: USER.id,
      email: USER.email,
    });
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "account_created", sessionId: "sess-1" }),
    );
  });

  it("returns 500 when claimPlanForUser throws", async () => {
    mockClaimPlanForUser.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq(), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to claim plan." });
  });
});
