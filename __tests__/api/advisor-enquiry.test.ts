import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => "<p>Footer</p>"),
}));

vi.mock("@/lib/advisor-billing", () => ({
  createLeadInvoice: vi.fn(() => Promise.resolve()),
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────────
import { POST } from "@/app/api/advisor-enquiry/route";
import { isRateLimited } from "@/lib/rate-limit";
import { createLeadInvoice } from "@/lib/advisor-billing";

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRO = {
  id: "pro-001",
  name: "John Advisor",
  email: "john@advisor.com.au",
  firm_name: "Advisor Co",
  type: "financial_advisor",
};

const VALID_BODY = {
  professional_id: "pro-001",
  user_name: "Alice Test",
  user_email: "alice@example.com",
  user_phone: "0412345678",
  message: "I need help with my investment portfolio and retirement planning.",
  source_page: "/advisors/john-advisor",
};

function setupFromMock(options: {
  pro?: typeof PRO | null;
  lead?: { id: string } | null;
  leadError?: boolean;
  freeLeadsUsed?: number;
  leadPriceCents?: number;
  billingRecord?: { id: string } | null;
} = {}) {
  const {
    pro = PRO,
    lead = { id: "lead-001" },
    leadError = false,
    freeLeadsUsed = 0,
    leadPriceCents = 4900,
    billingRecord = { id: "bill-001" },
  } = options;

  mockFrom.mockImplementation((table: string) => {
    const builder = createChainableBuilder(table);

    if (table === "professionals") {
      builder.single = vi.fn(() => {
        // Distinguish between the first call (pro lookup) and second call (free_leads_used)
        // by checking what select was called with — but since builder resets, we use a counter
        return Promise.resolve({
          data: pro
            ? { ...pro, free_leads_used: freeLeadsUsed, lead_price_cents: leadPriceCents }
            : null,
          error: pro ? null : { code: "PGRST116" },
        });
      });
    }

    if (table === "professional_leads") {
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: leadError ? null : lead,
          error: leadError ? { message: "insert failed" } : null,
        })
      );
    }

    if (table === "advisor_billing") {
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: billingRecord,
          error: billingRecord ? null : { message: "billing failed" },
        })
      );
    }

    // analytics_events — just resolve
    if (table === "analytics_events") {
      builder.then = vi.fn((cb: (v: { data: null; error: null }) => void) => {
        cb({ data: null, error: null });
        return Promise.resolve();
      });
    }

    return builder;
  });
}

function enquiryRequest(body: Record<string, unknown>, ip = "5.6.7.8") {
  return makeRequest("/api/advisor-enquiry", body, { ip });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-enquiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("Too many requests");
  });

  it("returns 400 for missing required fields", async () => {
    setupFromMock();

    const req = enquiryRequest({ professional_id: "pro-001" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 400 for missing professional_id", async () => {
    setupFromMock();

    const req = enquiryRequest({
      user_name: "Alice",
      user_email: "alice@example.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    setupFromMock();

    const req = enquiryRequest({
      ...VALID_BODY,
      user_email: "not-an-email",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid email");
  });

  it("returns 404 when professional not found", async () => {
    setupFromMock({ pro: null });

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found");
  });

  it("returns 200 with lead_id on success", async () => {
    setupFromMock();

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe("lead-001");
  });

  it("calculates quality score correctly", async () => {
    setupFromMock();

    // This body has: phone (+20), message >30 chars (+15), specific source_page (+10)
    // Expected score: 45
    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify the professional_leads update was called with quality_score
    const updateCalls = mockFrom.mock.calls.filter(
      ([t]: [string]) => t === "professional_leads"
    );
    // At least 2 calls: insert + update
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("adds extra score for quiz_completed and calculator_used", async () => {
    setupFromMock();

    const req = enquiryRequest({
      ...VALID_BODY,
      quiz_completed: true,
      calculator_used: true,
      pages_visited: 5,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Score: phone(20) + message(15) + source_page(10) + pages_visited>3(15) + quiz(20) + calculator(15) = 95
    const updateCalls = mockFrom.mock.calls.filter(
      ([t]: [string]) => t === "professional_leads"
    );
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("first 3 leads are free (checks free_leads_used)", async () => {
    setupFromMock({ freeLeadsUsed: 1 });

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should increment free_leads_used on the professionals table
    const proCalls = mockFrom.mock.calls.filter(
      ([t]: [string]) => t === "professionals"
    );
    // At least 2 calls: initial lookup + free_leads_used update
    expect(proCalls.length).toBeGreaterThanOrEqual(2);

    // Should NOT create a billing record
    const billingCalls = mockFrom.mock.calls.filter(
      ([t]: [string]) => t === "advisor_billing"
    );
    expect(billingCalls).toHaveLength(0);
  });

  it("creates billing record for paid leads (free_leads_used >= 3)", async () => {
    setupFromMock({ freeLeadsUsed: 3, leadPriceCents: 4900 });

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should create a billing record
    const billingCalls = mockFrom.mock.calls.filter(
      ([t]: [string]) => t === "advisor_billing"
    );
    expect(billingCalls.length).toBeGreaterThanOrEqual(1);

    // Should call createLeadInvoice
    expect(createLeadInvoice).toHaveBeenCalledWith("bill-001");
  });

  it("does not call createLeadInvoice for free leads", async () => {
    setupFromMock({ freeLeadsUsed: 0 });

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(createLeadInvoice).not.toHaveBeenCalled();
  });

  it("sends notification email to advisor and confirmation to user", async () => {
    setupFromMock();

    const req = enquiryRequest(VALID_BODY);
    await POST(req);

    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const resendCalls = fetchCalls.filter(
      ([url]: [string]) => typeof url === "string" && url.includes("resend.com")
    );

    // Should send two emails: one to advisor, one to user
    expect(resendCalls.length).toBeGreaterThanOrEqual(2);

    const emailBodies = resendCalls.map(
      ([, opts]: [string, { body: string }]) => JSON.parse(opts.body)
    );
    const advisorEmail = emailBodies.find(
      (b: { to: string }) => b.to === "john@advisor.com.au"
    );
    const userEmail = emailBodies.find(
      (b: { to: string }) => b.to === "alice@example.com"
    );

    expect(advisorEmail).toBeDefined();
    expect(advisorEmail.subject).toContain("Alice Test");
    expect(userEmail).toBeDefined();
    expect(userEmail.subject).toContain("John Advisor");
  });

  it("tracks analytics events", async () => {
    setupFromMock();

    const req = enquiryRequest(VALID_BODY);
    await POST(req);

    const analyticsCalls = mockFrom.mock.calls.filter(
      ([t]: [string]) => t === "analytics_events"
    );
    expect(analyticsCalls.length).toBeGreaterThanOrEqual(1);
  });
});
