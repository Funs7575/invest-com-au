/**
 * Tests for POST /api/get-matched/plans/[id]/to-brief
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

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: vi.fn(() => true),
  isDisposableEmail: vi.fn(() => false),
}));

const mockGetPlanById = vi.fn();
const mockUpdatePlan = vi.fn();
const mockLinkBriefToPlan = vi.fn();
vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: (...args: unknown[]) => mockGetPlanById(...args),
  updatePlan: (...args: unknown[]) => mockUpdatePlan(...args),
  linkBriefToPlan: (...args: unknown[]) => mockLinkBriefToPlan(...args),
  createPlan: vi.fn(),
  toggleChecklistItem: vi.fn(() => []),
  getPlanByToken: vi.fn(),
  claimPlanForUser: vi.fn(),
}));

const mockGetEnabledIntents = vi.fn();
vi.mock("@/lib/getmatched/intents", () => ({
  getEnabledIntents: (...args: unknown[]) => mockGetEnabledIntents(...args),
}));

const mockResolveActionPlan = vi.fn();
vi.mock("@/lib/getmatched/engine", () => ({
  resolveActionPlan: (...args: unknown[]) => mockResolveActionPlan(...args),
  recommendedProviders: vi.fn(async () => []),
}));

const mockScanBrief = vi.fn();
vi.mock("@/lib/briefs/risk-flags", () => ({
  scanBrief: (...args: unknown[]) => mockScanBrief(...args),
}));

const mockGetAcceptCost = vi.fn();
vi.mock("@/lib/briefs/credits", () => ({
  getAcceptCost: (...args: unknown[]) => mockGetAcceptCost(...args),
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: vi.fn(async () => undefined),
}));

// Admin client builder
function makeBuilder(result: unknown = { data: { id: 10, slug: "brief-slug" }, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/to-brief/route";

const VALID_BODY = {
  contact_name: "Alice",
  contact_email: "alice@example.com",
  consent_share: true,
};

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/get-matched/plans/1/to-brief", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

const MOCK_PLAN = {
  id: 1,
  goal: "invest",
  answers: {},
  budget_band: null,
  timeline: null,
  location_state: "NSW",
  country_of_residence: "AU",
  help_needed: [],
  session_id: "sess1",
  auth_user_id: null,
  intent_slug: "invest",
};

const MOCK_RESOLVED = {
  recommendedBriefTemplate: "wealth_invest",
  template: { headline: "Invest" },
  route: "individual",
  intent: "invest",
  secondaryIntent: null,
  goal: "invest",
  checklist: [],
  budgetBand: "50k_100k",
  timeline: "3_6_months",
  locationState: "NSW",
  countryOfResidence: "AU",
  helpNeeded: [],
  riskFlags: [],
  riskSeverity: "none",
  acceptCreditsCost: 1,
  primaryHref: "/advisors",
  vertical: "brokers",
  advisorType: "broker",
};

describe("POST /api/get-matched/plans/[id]/to-brief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetPlanById.mockResolvedValue(MOCK_PLAN);
    mockGetEnabledIntents.mockResolvedValue([{ slug: "invest", default_brief_template: "wealth_invest" }]);
    mockResolveActionPlan.mockResolvedValue(MOCK_RESOLVED);
    mockScanBrief.mockResolvedValue({ severity: "none", flags: [], reviewStatus: "auto_approved" });
    mockGetAcceptCost.mockResolvedValue(1);
    mockUpdatePlan.mockResolvedValue({ id: 1 });
    mockLinkBriefToPlan.mockResolvedValue(undefined);
    // Admin client: insert returns brief row with id/slug
    mockAdminFrom.mockReturnValue(makeBuilder({ data: { id: 10, slug: "brief-xyz" }, error: null }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(VALID_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric plan id", async () => {
    const res = await POST(makeReq(VALID_BODY), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/get-matched/plans/1/to-brief", {
      method: "POST",
      body: "bad",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when consent_share is false", async () => {
    const res = await POST(
      makeReq({ ...VALID_BODY, consent_share: false }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when plan not found", async () => {
    mockGetPlanById.mockResolvedValue(null);
    const res = await POST(makeReq(VALID_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when risk scanner blocks the brief", async () => {
    mockScanBrief.mockResolvedValue({ severity: "block", flags: ["scam"], reviewStatus: "blocked" });
    const res = await POST(makeReq(VALID_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 200 with brief_id on success", async () => {
    const res = await POST(makeReq(VALID_BODY), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.brief_id).toBe(10);
  });
});
