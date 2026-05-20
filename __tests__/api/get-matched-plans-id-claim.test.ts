/**
 * Tests for POST /api/get-matched/plans/[id]/claim
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const mockGetUser = vi.fn(async () => ({ data: { user: { id: "u1", email: "user@example.com" } } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockClaimPlanForUser = vi.fn();
vi.mock("@/lib/getmatched/action-plans", () => ({
  claimPlanForUser: (...args: unknown[]) => mockClaimPlanForUser(...args),
  getPlanById: vi.fn(),
  updatePlan: vi.fn(),
  createPlan: vi.fn(),
  toggleChecklistItem: vi.fn(() => []),
  getPlanByToken: vi.fn(),
  linkBriefToPlan: vi.fn(),
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/claim/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/get-matched/plans/1/claim", {
    method: "POST",
  }) as unknown as NextRequest;
}

describe("POST /api/get-matched/plans/[id]/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } } });
    mockClaimPlanForUser.mockResolvedValue({ id: 1, session_id: "sess1", auth_user_id: "u1" });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 401 when user not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for non-numeric plan id", async () => {
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 200 with success on happy path", async () => {
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.plan).toBeDefined();
  });

  it("returns 500 when claimPlanForUser throws", async () => {
    mockClaimPlanForUser.mockRejectedValue(new Error("db fail"));
    const res = await POST(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(500);
  });
});
