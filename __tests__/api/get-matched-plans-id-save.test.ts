/**
 * Tests for POST /api/get-matched/plans/[id]/save
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
const mockUpdatePlan = vi.fn();
vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
  updatePlan: (...args: unknown[]) => mockUpdatePlan(...args),
  createPlan: vi.fn(),
  toggleChecklistItem: vi.fn(() => []),
  getPlanByToken: vi.fn(),
  claimPlanForUser: vi.fn(),
  linkBriefToPlan: vi.fn(),
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/save/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/plans/1/save", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const MOCK_PLAN = {
  id: 1,
  session_id: "sess1",
  auth_user_id: null,
  status: "draft",
};

describe("POST /api/get-matched/plans/[id]/save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetPlanById.mockResolvedValue(MOCK_PLAN);
    mockUpdatePlan.mockResolvedValue({ id: 1, share_token: "tok123" });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ email: "a@b.com" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric plan id", async () => {
    const res = await POST(makeReq({ email: "a@b.com" }), { params: Promise.resolve({ id: "xyz" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/plans/1/save", {
      method: "POST",
      body: "!!!",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(makeReq({ email: "not-an-email" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when plan not found", async () => {
    mockGetPlanById.mockResolvedValue(null);
    const res = await POST(makeReq({ email: "a@b.com" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with share token on success", async () => {
    const res = await POST(makeReq({ email: "a@b.com" }), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.share_token).toBe("tok123");
    expect(json.view_url).toBe("/plans/tok123");
  });
});
