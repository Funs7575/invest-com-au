import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsRateLimited = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => false);

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockIsValidEmail = vi.fn<(...args: unknown[]) => unknown>(() => true);
const mockIsDisposableEmail = vi.fn<(...args: unknown[]) => unknown>(() => false);

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: unknown) => mockIsValidEmail(e),
  isDisposableEmail: (e: unknown) => mockIsDisposableEmail(e),
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

const mockScanBrief = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  flags: [],
  severity: "clear",
  reviewStatus: "clear",
}));

vi.mock("@/lib/briefs/risk-flags", () => ({
  scanBrief: (...args: unknown[]) => mockScanBrief(...args),
}));

const mockGetAcceptCost = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 4900);

vi.mock("@/lib/briefs/credits", () => ({
  getAcceptCost: (...args: unknown[]) => mockGetAcceptCost(...args),
}));

const mockResolveEligibleProviders = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => []);

vi.mock("@/lib/briefs/routing", () => ({
  resolveEligibleProviders: (...args: unknown[]) => mockResolveEligibleProviders(...args),
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendProviderNewMatchRequest: vi.fn(async () => {}),
}));

vi.mock("@/lib/pro-affiliate/track", () => ({
  attributeBriefCreated: vi.fn(async () => {}),
}));

vi.mock("@/lib/briefs/templates", () => ({
  isBriefTemplate: vi.fn(() => true),
  BRIEF_TEMPLATE_SCHEMAS: {
    general: {
      safeParse: vi.fn(() => ({ success: true, data: {} })),
    },
  },
}));

import { POST } from "@/app/api/briefs/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const validBriefBody = {
  brief_template: "general",
  brief_payload: { notes: "Some notes here about the engagement." },
  job_title: "Looking for a financial advisor",
  job_description: "I need help with retirement planning and investment strategy for long term wealth.",
  budget_band: "2k_5k",
  advisor_types: ["financial_planner"],
  location_state: "NSW",
  provider_preference: "any",
  routing_mode: "smart_match",
  contact_name: "Test User",
  contact_email: "test@example.com",
  consent_share: true,
};

describe("/api/briefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockScanBrief.mockResolvedValue({ flags: [], severity: "clear", reviewStatus: "clear" });
    mockGetAcceptCost.mockResolvedValue(4900);
    mockResolveEligibleProviders.mockResolvedValue([]);
    // Default: return null for lookups (target slugs), then return brief insert result
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount >= 4) {
        // advisor_auctions insert
        return makeBuilder({ data: { id: 1, slug: "test-brief-abc123" }, error: null });
      }
      return makeBuilder({ data: null, error: null });
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(validBriefBody));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/briefs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: "not-json{{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("silently 200 on honeypot (website field set)", async () => {
    const res = await POST(makeReq({ ...validBriefBody, website: "http://spam.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.brief_id).toBeNull();
  });

  it("returns 400 for missing required fields (no contact_email)", async () => {
    const { contact_email: _contact_email, ...body } = validBriefBody;
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makeReq(validBriefBody));
    expect(res.status).toBe(400);
  });

  it("returns 400 for disposable email", async () => {
    mockIsDisposableEmail.mockReturnValue(true);
    const res = await POST(makeReq(validBriefBody));
    expect(res.status).toBe(400);
  });

  it("returns 400 when risk scan blocks content", async () => {
    mockScanBrief.mockResolvedValue({ flags: ["spam"], severity: "block", reviewStatus: "rejected" });
    const res = await POST(makeReq(validBriefBody));
    expect(res.status).toBe(400);
  });

  it("creates brief successfully", async () => {
    mockAdminFrom.mockImplementation(() => makeBuilder({ data: { id: 1, slug: "looking-for-a-financial-advisor-abc123" }, error: null }));
    const res = await POST(makeReq(validBriefBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json).toHaveProperty("brief_id");
    expect(json).toHaveProperty("slug");
  });

  it("returns 500 when insert fails", async () => {
    mockAdminFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "insert failed" } }));
    const res = await POST(makeReq(validBriefBody));
    expect(res.status).toBe(500);
  });
});
