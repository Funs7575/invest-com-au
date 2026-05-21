import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetPlanById, mockUpdatePlan, mockLogEvent } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetPlanById: vi.fn(),
  mockUpdatePlan: vi.fn(),
  mockLogEvent: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: mockGetPlanById,
  updatePlan: mockUpdatePlan,
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: mockLogEvent,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/save/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/get-matched/plans/5/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "5") {
  return { params: Promise.resolve({ id }) };
}

const VALID = { email: "alice@example.com" };

describe("POST /api/get-matched/plans/[id]/save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockLogEvent.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 400 for a non-numeric plan id", async () => {
    const res = await POST(makeReq(VALID), ctx("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/get-matched/plans/5/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod fails (invalid email)", async () => {
    const res = await POST(makeReq({ email: "nope" }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when plan not found", async () => {
    mockGetPlanById.mockResolvedValueOnce(null);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(404);
  });

  it("saves the plan and returns share token + view url", async () => {
    mockGetPlanById.mockResolvedValueOnce({ id: 5, session_id: "sess-1", auth_user_id: null, status: "new" });
    mockUpdatePlan.mockResolvedValueOnce({ id: 5, share_token: "tok-abc" });
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      share_token: "tok-abc",
      view_url: "/plans/tok-abc",
    });
    expect(mockUpdatePlan).toHaveBeenCalledWith({
      id: 5,
      email: "alice@example.com",
      status: "saved",
    });
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "plan_saved" }),
    );
  });

  it("preserves a converted status instead of overwriting to saved", async () => {
    mockGetPlanById.mockResolvedValueOnce({ id: 5, session_id: "sess-1", auth_user_id: null, status: "converted" });
    mockUpdatePlan.mockResolvedValueOnce({ id: 5, share_token: "tok-x" });
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(200);
    expect(mockUpdatePlan).toHaveBeenCalledWith(
      expect.objectContaining({ status: "converted" }),
    );
  });

  it("returns 500 when updatePlan throws", async () => {
    mockGetPlanById.mockResolvedValueOnce({ id: 5, session_id: "s", auth_user_id: null, status: "new" });
    mockUpdatePlan.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to save plan." });
  });
});
