import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Idea #11 — proves the dormancy contract for sealed posting:
//   flag OFF  ⇒ the insert is byte-identical to today (no bid_visibility key).
//   flag ON   ⇒ bid_visibility: 'sealed' is added when the consumer chose it.

const { mockIsFlagEnabled, capturedInserts } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(),
  capturedInserts: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/feature-flags", () => ({ isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a) }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn(() => Promise.resolve(false)) }));
vi.mock("@/lib/validate-email", () => ({ isValidEmail: () => true, isDisposableEmail: () => false }));
vi.mock("@/lib/advisor-opt-ins", () => ({ processAdvisorOptIns: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/quote-emails", () => ({
  sendJobPostedConfirmation: vi.fn(() => Promise.resolve(true)),
  sendAdvisorNewPublicJobEmail: vi.fn(() => Promise.resolve(true)),
}));
vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "advisor_auctions") {
        return {
          insert: (payload: Record<string, unknown>) => {
            capturedInserts.push(payload);
            return { select: () => ({ single: () => Promise.resolve({ data: { id: 1, slug: "s-1" }, error: null }) }) };
          },
        };
      }
      // professionals (referrer lookup / notify) — return nothing useful.
      return {
        select: () => ({
          eq: function () { return this; },
          in: function () { return this; },
          not: function () { return this; },
          maybeSingle: () => Promise.resolve({ data: null }),
          limit: () => Promise.resolve({ data: [] }),
          then: (f: (v: unknown) => unknown) => Promise.resolve({ data: [] }).then(f),
        }),
      };
    },
  }),
}));

const BASE = {
  job_title: "Refinance our investment loan",
  job_description: "We need help refinancing a $750k investment property loan this quarter.",
  budget_band: "2k_5k",
  location_state: "NSW",
  advisor_types: ["mortgage_broker"],
  contact_name: "Jo Client",
  contact_email: "jo@example.com",
};

function post(body: unknown) {
  return new NextRequest("http://localhost/api/quotes", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quotes — sealed bidding dormancy (idea #11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedInserts.length = 0;
  });

  it("flag OFF + sealed requested ⇒ insert OMITS bid_visibility (identical to today)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const { POST } = await import("@/app/api/quotes/route");
    const res = await POST(post({ ...BASE, bid_visibility: "sealed" }));
    expect(res.status).toBe(200);
    expect(capturedInserts).toHaveLength(1);
    expect(capturedInserts[0]).not.toHaveProperty("bid_visibility");
  });

  it("no bid_visibility in body ⇒ flag never consulted, insert unchanged", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    const { POST } = await import("@/app/api/quotes/route");
    const res = await POST(post({ ...BASE }));
    expect(res.status).toBe(200);
    expect(mockIsFlagEnabled).not.toHaveBeenCalled();
    expect(capturedInserts[0]).not.toHaveProperty("bid_visibility");
  });

  it("flag ON + sealed requested ⇒ insert SETS bid_visibility: 'sealed'", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    const { POST } = await import("@/app/api/quotes/route");
    const res = await POST(post({ ...BASE, bid_visibility: "sealed" }));
    expect(res.status).toBe(200);
    expect(capturedInserts[0]).toMatchObject({ bid_visibility: "sealed", source: "public_job" });
  });

  it("flag ON + visibility 'open' ⇒ no bid_visibility added (open is the default)", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    const { POST } = await import("@/app/api/quotes/route");
    const res = await POST(post({ ...BASE, bid_visibility: "open" }));
    expect(res.status).toBe(200);
    expect(capturedInserts[0]).not.toHaveProperty("bid_visibility");
  });
});
