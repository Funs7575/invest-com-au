/**
 * Tests for GET /api/get-matched/plans/by-id/[id]
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

const mockGetPlanById = vi.fn();
vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
  updatePlan: vi.fn(),
  createPlan: vi.fn(),
  toggleChecklistItem: vi.fn(() => []),
  getPlanByToken: vi.fn(),
  claimPlanForUser: vi.fn(),
  linkBriefToPlan: vi.fn(),
}));

const mockGetEnabledIntents = vi.fn();
vi.mock("@/lib/getmatched/intents", () => ({
  getEnabledIntents: (...args: unknown[]) => mockGetEnabledIntents(...args),
}));

import { GET } from "@/app/api/get-matched/plans/by-id/[id]/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/get-matched/plans/by-id/1", {
    method: "GET",
  }) as unknown as NextRequest;
}

const MOCK_PLAN = {
  id: 1,
  goal: "invest in stocks",
  budget_band: "50k_100k",
  timeline: "3_6_months",
  location_state: "NSW",
  country_of_residence: "AU",
  help_needed: ["portfolio"],
  answers: { notes: "Some notes" },
  intent_slug: "invest",
};

describe("GET /api/get-matched/plans/by-id/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetPlanById.mockResolvedValue(MOCK_PLAN);
    mockGetEnabledIntents.mockResolvedValue([
      { slug: "invest", default_brief_template: "wealth_invest" },
    ]);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when plan not found", async () => {
    mockGetPlanById.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: Promise.resolve({ id: "999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with plan data on success", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan).toBeDefined();
    expect(json.description).toContain("Goal: invest in stocks");
  });

  it("includes recommended_brief_template when intent matches", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();
    expect(json.recommended_brief_template).toBe("wealth_invest");
  });
});
