/**
 * Tests for GET /api/get-matched/plans/by-token/[token]
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

const mockGetPlanByToken = vi.fn();
vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanByToken: (...args: unknown[]) => mockGetPlanByToken(...args),
  getPlanById: vi.fn(),
  updatePlan: vi.fn(),
  createPlan: vi.fn(),
  toggleChecklistItem: vi.fn(() => []),
  claimPlanForUser: vi.fn(),
  linkBriefToPlan: vi.fn(),
}));

const mockGetResultTemplate = vi.fn();
vi.mock("@/lib/getmatched/templates", () => ({
  getResultTemplate: (...args: unknown[]) => mockGetResultTemplate(...args),
}));

import { GET } from "@/app/api/get-matched/plans/by-token/[token]/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/get-matched/plans/by-token/sometoken", {
    method: "GET",
  }) as unknown as NextRequest;
}

const VALID_TOKEN = "t".repeat(22); // 22 chars passes >=20 check
const MOCK_PLAN = {
  id: 1,
  route: "individual",
  intent_slug: "invest",
};

describe("GET /api/get-matched/plans/by-token/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetPlanByToken.mockResolvedValue(MOCK_PLAN);
    mockGetResultTemplate.mockResolvedValue({ headline: "Find an advisor" });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(429);
  });

  it("returns 400 for token shorter than 20 chars", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ token: "short" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when plan not found", async () => {
    mockGetPlanByToken.mockResolvedValue(null);
    const res = await GET(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(404);
  });

  it("returns 200 with plan and template on success", async () => {
    const res = await GET(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan).toBeDefined();
    expect(json.template).toBeDefined();
  });

  it("returns template: null when plan has no route", async () => {
    mockGetPlanByToken.mockResolvedValue({ id: 2, route: null, intent_slug: null });
    const res = await GET(makeReq(), { params: Promise.resolve({ token: VALID_TOKEN }) });
    const json = await res.json();
    expect(json.template).toBeNull();
  });
});
