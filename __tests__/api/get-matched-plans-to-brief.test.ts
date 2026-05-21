import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockFrom,
  mockIsValidEmail,
  mockIsDisposableEmail,
  mockGetPlanById,
  mockLinkBriefToPlan,
  mockUpdatePlan,
  mockGetEnabledIntents,
  mockResolveActionPlan,
  mockScanBrief,
  mockGetAcceptCost,
  mockLogEvent,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockFrom: vi.fn(),
  mockIsValidEmail: vi.fn(),
  mockIsDisposableEmail: vi.fn(),
  mockGetPlanById: vi.fn(),
  mockLinkBriefToPlan: vi.fn(),
  mockUpdatePlan: vi.fn(),
  mockGetEnabledIntents: vi.fn(),
  mockResolveActionPlan: vi.fn(),
  mockScanBrief: vi.fn(),
  mockGetAcceptCost: vi.fn(),
  mockLogEvent: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: mockIsValidEmail,
  isDisposableEmail: mockIsDisposableEmail,
}));

vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: mockGetPlanById,
  linkBriefToPlan: mockLinkBriefToPlan,
  updatePlan: mockUpdatePlan,
}));

vi.mock("@/lib/getmatched/intents", () => ({
  getEnabledIntents: mockGetEnabledIntents,
}));

vi.mock("@/lib/getmatched/engine", () => ({
  resolveActionPlan: mockResolveActionPlan,
}));

vi.mock("@/lib/briefs/risk-flags", () => ({
  scanBrief: mockScanBrief,
}));

vi.mock("@/lib/briefs/credits", () => ({
  getAcceptCost: mockGetAcceptCost,
}));

vi.mock("@/lib/getmatched/events", () => ({
  logEvent: mockLogEvent,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/get-matched/plans/[id]/to-brief/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/get-matched/plans/5/to-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "5") {
  return { params: Promise.resolve({ id }) };
}

const VALID = {
  contact_name: "Alice Investor",
  contact_email: "alice@example.com",
  routing_mode: "smart_match",
  consent_share: true,
};

const PLAN = {
  id: 5,
  session_id: "sess-1",
  auth_user_id: null,
  goal: "Buy a property",
  answers: { intent: "smsf_property", notes: "hi" },
  intent_slug: "smsf_property",
  budget_band: "10k_25k",
  location_state: "NSW",
};

const RESOLVED = {
  route: "individual",
  recommendedBriefTemplate: "smsf_property",
  template: { headline: "SMSF property brief" },
};

// .from("advisor_auctions").insert().select().single()
function insertBriefChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

// .from("brief_tracker_events").insert() — terminal resolves
function trackerInsertChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => Promise.resolve({ error: null }));
  return chain;
}

describe("POST /api/get-matched/plans/[id]/to-brief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockGetPlanById.mockResolvedValue(PLAN);
    mockGetEnabledIntents.mockResolvedValue([
      { slug: "smsf_property", default_brief_template: "smsf_property" },
    ]);
    mockResolveActionPlan.mockResolvedValue(RESOLVED);
    mockScanBrief.mockResolvedValue({ severity: "none", flags: [], reviewStatus: "clear" });
    mockGetAcceptCost.mockResolvedValue(3);
    mockLinkBriefToPlan.mockResolvedValue(undefined);
    mockUpdatePlan.mockResolvedValue(undefined);
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
    const req = new NextRequest("http://localhost/api/get-matched/plans/5/to-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    const res = await POST(req, ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod fails (missing consent)", async () => {
    const res = await POST(makeReq({ ...VALID, consent_share: false }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid/disposable email", async () => {
    mockIsDisposableEmail.mockReturnValueOnce(true);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Please use a real email address." });
  });

  it("returns 404 when the plan is not found", async () => {
    mockGetPlanById.mockResolvedValueOnce(null);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(404);
  });

  it("returns 400 when risk scan blocks the brief", async () => {
    mockScanBrief.mockResolvedValueOnce({ severity: "block", flags: ["weapons"], reviewStatus: "blocked" });
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("can't accept briefs");
  });

  it("creates the brief and returns success", async () => {
    mockFrom
      .mockReturnValueOnce(insertBriefChain({ data: { id: 77, slug: "buy-a-property-xyz" }, error: null }))
      .mockReturnValueOnce(trackerInsertChain());
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      brief_id: 77,
      brief_slug: "buy-a-property-xyz",
      risk_review_status: "clear",
    });
    expect(mockLinkBriefToPlan).toHaveBeenCalledWith(5, 77);
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "brief_submitted" }),
    );
  });

  it("logs a second tracker event when there are risk flags", async () => {
    mockScanBrief.mockResolvedValueOnce({ severity: "warn", flags: ["leverage"], reviewStatus: "review" });
    const briefChain = insertBriefChain({ data: { id: 78, slug: "s" }, error: null });
    const tracker1 = trackerInsertChain();
    const tracker2 = trackerInsertChain();
    mockFrom
      .mockReturnValueOnce(briefChain)
      .mockReturnValueOnce(tracker1)
      .mockReturnValueOnce(tracker2);
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(200);
    // created + risk_flagged tracker inserts => brief_tracker_events used twice
    expect(tracker1.insert).toHaveBeenCalled();
    expect(tracker2.insert).toHaveBeenCalled();
  });

  it("returns 500 when the brief insert errors", async () => {
    mockFrom.mockReturnValueOnce(insertBriefChain({ data: null, error: { message: "boom" } }));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to create brief." });
  });

  it("returns 500 on unexpected error", async () => {
    mockResolveActionPlan.mockRejectedValueOnce(new Error("engine down"));
    const res = await POST(makeReq(VALID), ctx());
    expect(res.status).toBe(500);
  });
});
