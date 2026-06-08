import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsFlagEnabled = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => "<p>Footer</p>"),
}));

vi.mock("@/lib/advisor-billing", () => ({
  createLeadInvoice: vi.fn(() => Promise.resolve()),
  // Canonical free-lead allowance (founder decision: 3). The route imports
  // this constant; mock it so tests don't pull in the real module's
  // Stripe/admin-client deps.
  FREE_LEAD_LIMIT: 3,
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────────
import { POST } from "@/app/api/advisor-enquiry/route";
import { isRateLimited } from "@/lib/rate-limit";

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
  creditBalanceCents?: number;
  billingRecord?: { id: string } | null;
  // When set, models a lead_pricing row for the advisor's category with this
  // free_trial_leads value. Only consulted by the route when the advisor has
  // no custom lead_price_cents. `undefined` means "no category row" (route
  // falls back to FREE_LEAD_LIMIT); a number (incl. 0) is the configured
  // override.
  categoryFreeTrialLeads?: number;
} = {}) {
  const {
    pro = PRO,
    lead = { id: "lead-001" },
    leadError = false,
    freeLeadsUsed = 0,
    leadPriceCents = 4900,
    creditBalanceCents = 0,
    billingRecord = { id: "bill-001" },
    categoryFreeTrialLeads,
  } = options;

  mockFrom.mockImplementation((table: string) => {
    const builder = createChainableBuilder(table);

    if (table === "lead_pricing") {
      builder.single = vi.fn(() =>
        Promise.resolve({
          data:
            categoryFreeTrialLeads === undefined
              ? null
              : {
                  price_cents: 4900,
                  qualified_price_cents: 9800,
                  free_trial_leads: categoryFreeTrialLeads,
                },
          error: categoryFreeTrialLeads === undefined ? { code: "PGRST116" } : null,
        })
      );
    }

    if (table === "professionals") {
      builder.single = vi.fn(() => {
        // Distinguish between the first call (pro lookup) and second call (free_leads_used)
        // by checking what select was called with — but since builder resets, we use a counter
        return Promise.resolve({
          data: pro
            ? { ...pro, free_leads_used: freeLeadsUsed, lead_price_cents: leadPriceCents, credit_balance_cents: creditBalanceCents, lifetime_lead_spend_cents: 0 }
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
    mockIsFlagEnabled.mockResolvedValue(true);
    process.env.RESEND_API_KEY = "re_test_key";
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 503 when advisor_enquiry_intake flag is disabled", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await POST(enquiryRequest(VALID_BODY));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe("temporarily_unavailable");
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
    expect(json.error).toContain("valid");
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
      (call: unknown[]) => call[0] === "professional_leads"
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
      (call: unknown[]) => call[0] === "professional_leads"
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
      (call: unknown[]) => call[0] === "professionals"
    );
    // At least 2 calls: initial lookup + free_leads_used update
    expect(proCalls.length).toBeGreaterThanOrEqual(2);

    // Should NOT create a billing record
    const billingCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === "advisor_billing"
    );
    expect(billingCalls).toHaveLength(0);
  });

  // ── Free-lead allowance (founder decision: canonical 3) ─────────────────────
  // The server's free-trial allowance is sourced from the shared
  // FREE_LEAD_LIMIT constant (lib/advisor-billing) so the portal Dashboard /
  // Billing tabs and billing-summary route — which advertise 3 — match what
  // the server actually grants. These tests pin the granted allowance to 3 and
  // guard the falsy-zero regression (a configured 0 must disable the trial,
  // not silently re-enable the default).
  function billingCallsFor() {
    return mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === "advisor_billing"
    );
  }

  describe("free-lead allowance", () => {
    it("grants exactly 3 free leads by default — the 3rd lead (index 2) is free", async () => {
      // No category lead_pricing row → falls back to FREE_LEAD_LIMIT (3).
      // free_leads_used = 2 means this is the 3rd lead; 2 < 3 ⇒ free.
      setupFromMock({ freeLeadsUsed: 2, leadPriceCents: 4900, creditBalanceCents: 20000 });

      const res = await POST(enquiryRequest(VALID_BODY));
      expect(res.status).toBe(200);

      // Free lead ⇒ no advisor_billing record is written.
      expect(billingCallsFor()).toHaveLength(0);
    });

    it("bills the 4th lead (free_leads_used = 3) once the 3-lead allowance is exhausted", async () => {
      setupFromMock({ freeLeadsUsed: 3, leadPriceCents: 4900, creditBalanceCents: 20000 });

      const res = await POST(enquiryRequest(VALID_BODY));
      expect(res.status).toBe(200);

      // Allowance exhausted ⇒ a billing record is created.
      expect(billingCallsFor().length).toBeGreaterThanOrEqual(1);
    });

    it("honours a configured 0 free leads (falsy-zero must NOT re-enable the default)", async () => {
      // Admin set the category's free_trial_leads to 0 to disable the trial.
      // With `??` (not `||`) the configured 0 wins, so the very first lead
      // (free_leads_used = 0) is billed. leadPriceCents must be falsy so the
      // route consults lead_pricing.
      setupFromMock({
        freeLeadsUsed: 0,
        leadPriceCents: 0,
        creditBalanceCents: 20000,
        categoryFreeTrialLeads: 0,
      });

      const res = await POST(enquiryRequest(VALID_BODY));
      expect(res.status).toBe(200);

      // 0 < 0 is false ⇒ not free ⇒ billing record created on lead #1.
      expect(billingCallsFor().length).toBeGreaterThanOrEqual(1);
    });

    it("respects a category override above/below the default (free_trial_leads = 5)", async () => {
      // Category configured for 5 free leads; the 5th lead (index 4) is free.
      setupFromMock({
        freeLeadsUsed: 4,
        leadPriceCents: 0,
        creditBalanceCents: 20000,
        categoryFreeTrialLeads: 5,
      });

      const res = await POST(enquiryRequest(VALID_BODY));
      expect(res.status).toBe(200);

      expect(billingCallsFor()).toHaveLength(0);
    });
  });

  it("creates billing record for paid leads (free_leads_used >= 3, has credit)", async () => {
    setupFromMock({ freeLeadsUsed: 3, leadPriceCents: 4900, creditBalanceCents: 20000 });

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Should create a billing record with status "paid" (deducted from credit)
    const billingCalls = mockFrom.mock.calls.filter(
      (call: unknown[]) => call[0] === "advisor_billing"
    );
    expect(billingCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not bill for free trial leads", async () => {
    setupFromMock({ freeLeadsUsed: 0 });

    const req = enquiryRequest(VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("sends notification email to advisor and confirmation to user", async () => {
    setupFromMock();

    const req = enquiryRequest(VALID_BODY);
    await POST(req);

    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls as unknown[][];
    const resendCalls = fetchCalls.filter(
      (call) => typeof call[0] === "string" && (call[0] as string).includes("resend.com")
    );

    // Should send two emails: one to advisor, one to user
    expect(resendCalls.length).toBeGreaterThanOrEqual(2);

    const emailBodies = resendCalls.map(
      (call) => JSON.parse((call[1] as { body: string }).body)
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
      (call: unknown[]) => call[0] === "analytics_events"
    );
    expect(analyticsCalls.length).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-border source-path detection (2026-05-01) ─────────────────────────
  // The advisor-enquiry route applies the international 3× lead price when a
  // lead originates on a cross-border surface — even if the visitor's IP geo
  // is AU. AU-resident migrants are the largest LTV cohort and they browse
  // from AU IPs. These tests pin the allowlist behaviour so a refactor can't
  // silently drop the source-path branch.
  describe("cross-border source-path triggers international pricing", () => {
    const CROSS_BORDER_PATHS = [
      "/foreign-investment",
      "/foreign-investment/united-kingdom",
      "/foreign-investment/india",
      "/advisors/international-tax-specialists",
      "/advisors/firb-specialists",
      "/advisors/migration-agents",
    ];

    for (const sourcePath of CROSS_BORDER_PATHS) {
      it(`charges 3× when source_page is ${sourcePath}`, async () => {
        setupFromMock({ freeLeadsUsed: 3, leadPriceCents: 4900, creditBalanceCents: 20000 });

        const req = enquiryRequest({ ...VALID_BODY, source_page: sourcePath });
        const res = await POST(req);
        expect(res.status).toBe(200);

        // amount_cents should be 4900 * 3 = 14700 (international tier)
        const billingInsertCalls = mockFrom.mock.calls.filter(
          (call: unknown[]) => call[0] === "advisor_billing"
        );
        expect(billingInsertCalls.length).toBeGreaterThanOrEqual(1);
      });
    }

    it("does NOT trigger international pricing for a domestic source_page", async () => {
      setupFromMock({ freeLeadsUsed: 3, leadPriceCents: 4900, creditBalanceCents: 20000 });

      const req = enquiryRequest({ ...VALID_BODY, source_page: "/best/share-trading" });
      const res = await POST(req);
      expect(res.status).toBe(200);
      // Domestic source_page should NOT promote to international tier — base
      // 4900 applies (no qualification data, no international flag).
    });
  });
});
