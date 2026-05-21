import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetPlanById, mockToggleChecklistItem, mockUpdatePlan } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetPlanById: vi.fn(),
  mockToggleChecklistItem: vi.fn(),
  mockUpdatePlan: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: mockGetPlanById,
  toggleChecklistItem: mockToggleChecklistItem,
  updatePlan: mockUpdatePlan,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/checklist/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/get-matched/plans/5/checklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "5") {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/get-matched/plans/[id]/checklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ index: 0 }), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 400 for a non-numeric plan id", async () => {
    const res = await POST(makeReq({ index: 0 }), ctx("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid plan id." });
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/get-matched/plans/5/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod fails (negative index)", async () => {
    const res = await POST(makeReq({ index: -1 }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when the plan is not found", async () => {
    mockGetPlanById.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ index: 0 }), ctx());
    expect(res.status).toBe(404);
  });

  it("toggles the checklist item and returns the updated checklist", async () => {
    mockGetPlanById.mockResolvedValueOnce({ id: 5, checklist: [{ label: "a", done: false }] });
    const next = [{ label: "a", done: true }];
    mockToggleChecklistItem.mockReturnValueOnce(next);
    mockUpdatePlan.mockResolvedValueOnce({ id: 5, checklist: next });
    const res = await POST(makeReq({ index: 0 }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checklist: next });
    expect(mockUpdatePlan).toHaveBeenCalledWith({ id: 5, checklist: next });
  });

  it("returns 500 when updatePlan throws", async () => {
    mockGetPlanById.mockResolvedValueOnce({ id: 5, checklist: [] });
    mockToggleChecklistItem.mockReturnValueOnce([]);
    mockUpdatePlan.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq({ index: 0 }), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to update checklist." });
  });
});
