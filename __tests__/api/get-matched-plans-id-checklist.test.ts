/**
 * Tests for POST /api/get-matched/plans/[id]/checklist
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockGetPlanById = vi.fn();
const mockToggleChecklistItem = vi.fn();
const mockUpdatePlan = vi.fn();

vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
  toggleChecklistItem: (...args: unknown[]) => mockToggleChecklistItem(...args),
  updatePlan: (...args: unknown[]) => mockUpdatePlan(...args),
  createPlan: vi.fn(),
  getPlanByToken: vi.fn(),
  claimPlanForUser: vi.fn(),
  linkBriefToPlan: vi.fn(),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/checklist/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/plans/1/checklist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const MOCK_PLAN = {
  id: 1,
  checklist: [{ label: "Step 1", done: false }],
};

describe("POST /api/get-matched/plans/[id]/checklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetPlanById.mockResolvedValue(MOCK_PLAN);
    mockToggleChecklistItem.mockReturnValue([{ label: "Step 1", done: true }]);
    mockUpdatePlan.mockResolvedValue({ id: 1, checklist: [{ label: "Step 1", done: true }] });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ index: 0 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric plan id", async () => {
    const res = await POST(makeReq({ index: 0 }), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/plans/1/checklist", {
      method: "POST",
      body: "bad json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body fails schema (index missing)", async () => {
    const res = await POST(makeReq({}), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when plan not found", async () => {
    mockGetPlanById.mockResolvedValue(null);
    const res = await POST(makeReq({ index: 0 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated checklist on success", async () => {
    const res = await POST(makeReq({ index: 0 }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checklist).toBeDefined();
  });
});
