import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom, rpc: mockRpc })),
}));

const mockRpc = vi.fn();

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s,
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// Intercept fetch so email sending doesn't fail tests
global.fetch = vi.fn().mockResolvedValue({ ok: true });

import { POST } from "@/app/api/partner/leads/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const PARTNER_API_KEY = "valid-partner-key-abc123";

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/partner/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_LEAD = {
  name: "Jane Smith",
  email: "jane@example.com",
  advisor_type: "financial_advisor",
  message: "Looking for retirement planning help",
};

const ADVISOR = {
  id: 1,
  name: "Bob Advisor",
  email: "bob@advisory.com",
  firm_name: "Bob Advisory",
  type: "financial_advisor",
  lead_price_cents: 5000,
  credit_balance_cents: 10000,
  free_leads_used: 5,
  lifetime_lead_spend_cents: 50000,
  total_leads: 10,
  status: "active",
};

function setupDefaultMocks(advisors = [ADVISOR], existingLead: null | { id: number } = null) {
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFrom.mockImplementation((table: string) => {
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: advisors, error: null }),
      };
    }
    if (table === "professional_leads") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        }),
        single: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
      };
    }
    if (table === "lead_pricing") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { price_cents: 4900 }, error: null }),
      };
    }
    // advisor_billing
    return {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn((cb: (v: unknown) => void) => {
        cb({ data: null, error: null });
        return Promise.resolve();
      }),
    };
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/partner/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PARTNER_API_KEY", PARTNER_API_KEY);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    setupDefaultMocks();
  });

  it("returns 401 when api_key is missing", async () => {
    const res = await POST(makePost({ leads: [VALID_LEAD] }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when api_key is wrong", async () => {
    const res = await POST(makePost({ api_key: "bad-key", leads: [VALID_LEAD] }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when PARTNER_API_KEY env var is not set", async () => {
    vi.stubEnv("PARTNER_API_KEY", "");
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [VALID_LEAD] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when leads is not an array", async () => {
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: "not-array" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/non-empty array/i);
  });

  it("returns 400 when leads array is empty", async () => {
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when leads count exceeds 100", async () => {
    const manyLeads = Array(101).fill(VALID_LEAD);
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: manyLeads }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/maximum 100/i);
  });

  it("returns 200 with errors when individual lead is missing required fields", async () => {
    const badLead = { name: "", email: "jane@example.com", advisor_type: "financial_advisor" };
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [badLead] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads_failed).toBe(1);
    expect(body.errors).toBeDefined();
  });

  it("returns 200 with errors when individual lead has invalid email", async () => {
    const badLead = { name: "Jane", email: "not-an-email", advisor_type: "financial_advisor" };
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [badLead] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads_failed).toBe(1);
  });

  it("returns 200 with leads_failed when no advisors match", async () => {
    setupDefaultMocks([]);
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [VALID_LEAD] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads_failed).toBe(1);
    expect(body.errors?.[0].error).toMatch(/no active advisors/i);
  });

  it("returns 200 with leads_created on success", async () => {
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [VALID_LEAD] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.leads_created).toBeGreaterThan(0);
  });

  it("skips duplicate lead (same email + advisor in last 24h)", async () => {
    // existingLead returned for duplicate check → lead skipped
    setupDefaultMocks([ADVISOR], { id: 55 });
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [VALID_LEAD] }));
    expect(res.status).toBe(200);
    // Lead was created (outer counter increments) but inner advisor loop skipped due to duplicate
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("uses free lead path when free_leads_used < 2", async () => {
    setupDefaultMocks([{ ...ADVISOR, free_leads_used: 0 }]);
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [VALID_LEAD] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads_created).toBe(1);
  });

  it("returns 200 with leads_failed when per-lead error is thrown", async () => {
    mockFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await POST(makePost({ api_key: PARTNER_API_KEY, leads: [VALID_LEAD] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leads_failed).toBeGreaterThan(0);
  });
});
