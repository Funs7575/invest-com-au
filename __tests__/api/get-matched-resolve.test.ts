/**
 * Tests for POST /api/get-matched/resolve
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

const mockGetEnabledIntents = vi.fn();
vi.mock("@/lib/getmatched/intents", () => ({
  getEnabledIntents: (...args: unknown[]) => mockGetEnabledIntents(...args),
}));

const mockResolveActionPlan = vi.fn();
const mockRecommendedProviders = vi.fn();
vi.mock("@/lib/getmatched/engine", () => ({
  resolveActionPlan: (...args: unknown[]) => mockResolveActionPlan(...args),
  recommendedProviders: (...args: unknown[]) => mockRecommendedProviders(...args),
}));

const mockComputeTopMatches = vi.fn();
vi.mock("@/lib/getmatched/top-match", () => ({
  computeTopMatches: (...args: unknown[]) => mockComputeTopMatches(...args),
}));

vi.mock("@/lib/getmatched/explainer", () => ({
  buildMatchExplainer: vi.fn(() => ({ bullets: [] })),
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

vi.mock("@/lib/getmatched/errors", () => ({
  classifyGetMatchedError: vi.fn((err) => ({ code: "unknown", detail: String(err) })),
  errorResponse: vi.fn(() => new Response(JSON.stringify({ error: "error" }), { status: 500 })),
}));

import { POST } from "@/app/api/get-matched/resolve/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/resolve", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const MOCK_RESOLVED = {
  intent: "invest",
  secondaryIntent: null,
  route: "individual",
  goal: "grow wealth",
  checklist: [],
  budgetBand: "50k_100k",
  timeline: "3_6_months",
  locationState: "NSW",
  countryOfResidence: "AU",
  helpNeeded: [],
  riskFlags: [],
  riskSeverity: "none",
  acceptCreditsCost: 1,
  recommendedBriefTemplate: "wealth_invest",
  primaryHref: "/advisors",
  vertical: "brokers",
  advisorType: "broker",
  template: { headline: "Find an advisor" },
};

describe("POST /api/get-matched/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetEnabledIntents.mockResolvedValue([]);
    mockResolveActionPlan.mockResolvedValue(MOCK_RESOLVED);
    mockRecommendedProviders.mockResolvedValue([]);
    mockComputeTopMatches.mockResolvedValue([]);
    mockGetPlanById.mockResolvedValue({
      id: 5,
      session_id: "sess1",
      auth_user_id: null,
      answers: {},
      status: "draft",
    });
    mockUpdatePlan.mockResolvedValue({ id: 5, ...MOCK_RESOLVED, answers: {} });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ plan_id: 0 }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/resolve", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when plan_id is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns ephemeral plan when plan_id is 0", async () => {
    const res = await POST(makeReq({ plan_id: 0, answers: { goal: "invest" } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ephemeral).toBe(true);
    expect(json.plan).toBeDefined();
  });

  it("returns 404 when plan not found for plan_id > 0", async () => {
    mockGetPlanById.mockResolvedValue(null);
    const res = await POST(makeReq({ plan_id: 5 }));
    expect(res.status).toBe(404);
  });

  it("returns 200 with resolved plan for DB-backed path", async () => {
    const res = await POST(makeReq({ plan_id: 5, answers: {} }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan).toBeDefined();
    expect(json.template).toBeDefined();
  });
});
