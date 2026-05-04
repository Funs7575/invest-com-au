import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockProfessionals: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: vi.fn(() => true),
  isDisposableEmail: vi.fn(() => false),
}));

vi.mock("@/lib/advisor-opt-ins", () => ({
  processAdvisorOptIns: vi.fn(() => Promise.resolve({ inserted: 1, results: [] })),
}));

vi.mock("@/lib/quote-emails", () => ({
  sendJobPostedConfirmation: vi.fn(() => Promise.resolve(true)),
  sendAdvisorNewPublicJobEmail: vi.fn(() => Promise.resolve(true)),
  sendConsumerBidReceivedEmail: vi.fn(() => Promise.resolve(true)),
  sendAdvisorBidAcceptedEmail: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// ── Mock admin DB (minimal — only tables used in POST + notifyMatchingAdvisors) ───

const mockAdmin = {
  from(table: string) {
    if (table === "advisor_auctions") {
      return {
        select: () => ({
          eq: function () { return this; },
          gt: function () { return this; },
          order: function () { return this; },
          limit: function () { return this; },
          contains: function () { return this; },
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 1, slug: "test-slug" }, error: null }),
          }),
        }),
        update: () => ({
          eq: function () { return this; },
          neq: function () { return this; },
          then: (cb: (v: { data: null; error: null }) => void) => {
            cb({ data: null, error: null });
            return Promise.resolve();
          },
        }),
      };
    }
    if (table === "professionals") {
      // Thenable builder so `await admin.from("professionals")...` resolves
      // with the current value of `mockProfessionals` at call time.
      const proBuilder = {
        select: function () { return this; },
        in: function () { return this; },
        eq: function () { return this; },
        not: function () { return this; },
        limit: function () { return this; },
        then(
          resolve: (v: { data: Record<string, unknown>[]; error: null }) => void,
        ) {
          resolve({ data: mockProfessionals, error: null });
          return Promise.resolve();
        },
      };
      return proBuilder;
    }
    throw new Error(`Unexpected table: ${table}`);
  },
};

// ── Import route after mocks ──────────────────────────────────────────────────

import { POST } from "@/app/api/quotes/route";

// ── Shared test data ──────────────────────────────────────────────────────────

const VALID_POST_BODY = {
  job_title: "Need help with SMSF setup and strategy",
  job_description:
    "I have a $500k SMSF and need advice on investment strategy and compliance for the next financial year.",
  budget_band: "2k_5k",
  advisor_types: ["financial_planner"],
  location_state: "NSW",
  contact_name: "Jane Test",
  contact_email: "jane@example.com",
};

/** Drain all pending microtasks so fire-and-forget chains complete. */
const flushPromises = () => new Promise<void>((r) => setTimeout(r, 0));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("notifyMatchingAdvisors — advisor alert_preferences filtering", () => {
  beforeEach(() => {
    mockProfessionals = [];
    vi.clearAllMocks();
  });

  it("sends no emails when no advisors are returned from the DB", async () => {
    mockProfessionals = [];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).not.toHaveBeenCalled();
  });

  it("notifies all advisors when no alert_preferences set (null)", async () => {
    mockProfessionals = [
      {
        email: "alice@test.com",
        name: "Alice Advisor",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: null,
      },
      {
        email: "bob@test.com",
        name: "Bob Advisor",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: null,
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledTimes(2);
  });

  it("filters out advisors with accepts_new_clients: false", async () => {
    mockProfessionals = [
      {
        email: "active@test.com",
        name: "Active Advisor",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: null,
      },
      {
        email: "closed@test.com",
        name: "Closed Advisor",
        type: "financial_planner",
        accepts_new_clients: false,
        alert_preferences: null,
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledWith(
      "active@test.com",
      "Active",
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it("filters when advisor_types pref excludes the job type", async () => {
    // advisor specialises in smsf_accountant but job requests financial_planner
    mockProfessionals = [
      {
        email: "a@test.com",
        name: "Ada",
        type: "tax_agent",
        accepts_new_clients: true,
        alert_preferences: { advisor_types: ["smsf_accountant"] },
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).not.toHaveBeenCalled();
  });

  it("passes when advisor_types pref includes the job type", async () => {
    mockProfessionals = [
      {
        email: "a@test.com",
        name: "Ada",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: { advisor_types: ["financial_planner"] },
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledTimes(1);
  });

  it("filters when states pref excludes the job's location_state", async () => {
    // advisor only wants VIC jobs but this job is NSW
    mockProfessionals = [
      {
        email: "a@test.com",
        name: "Ada",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: { states: ["VIC", "QLD"] },
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).not.toHaveBeenCalled();
  });

  it("passes when states pref includes the job's location_state", async () => {
    mockProfessionals = [
      {
        email: "a@test.com",
        name: "Ada",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: { states: ["NSW", "VIC"] },
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledTimes(1);
  });

  it("filters when budget_bands pref excludes the job's budget_band", async () => {
    // advisor only wants high-value jobs but this job is 2k_5k
    mockProfessionals = [
      {
        email: "a@test.com",
        name: "Ada",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: { budget_bands: ["10k_plus"] },
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).not.toHaveBeenCalled();
  });

  it("passes when budget_bands pref includes the job's budget_band", async () => {
    mockProfessionals = [
      {
        email: "a@test.com",
        name: "Ada",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: { budget_bands: ["2k_5k", "5k_10k"] },
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledTimes(1);
  });

  it("passes when all pref arrays are empty (empty = no preference)", async () => {
    mockProfessionals = [
      {
        email: "a@test.com",
        name: "Ada",
        type: "financial_planner",
        accepts_new_clients: true,
        alert_preferences: { advisor_types: [], states: [], budget_bands: [] },
      },
    ];
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledTimes(1);
  });

  it("caps at 200 recipients when more than 200 advisors match", async () => {
    // notifyMatchingAdvisors slices eligible list to 200
    mockProfessionals = Array.from({ length: 250 }, (_, i) => ({
      email: `advisor${i}@test.com`,
      name: `Advisor ${String(i)}`,
      type: "financial_planner",
      accepts_new_clients: true,
      alert_preferences: null,
    }));
    await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    await flushPromises();

    const { sendAdvisorNewPublicJobEmail } = await import("@/lib/quote-emails");
    expect(vi.mocked(sendAdvisorNewPublicJobEmail)).toHaveBeenCalledTimes(200);
  });
});
