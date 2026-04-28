import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

const mockSendNewLeadNotification = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);
const mockSendLeadConfirmationToUser = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);

vi.mock("@/lib/advisor-emails", () => ({
  sendNewLeadNotification: (...args: unknown[]) =>
    mockSendNewLeadNotification(...args),
  sendLeadConfirmationToUser: (...args: unknown[]) =>
    mockSendLeadConfirmationToUser(...args),
}));

import { POST } from "@/app/api/submit-lead/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADVISOR = {
  id: 1,
  slug: "alice-advisor",
  name: "Alice",
  firm_name: "Alice Capital",
  type: "financial_planner",
  photo_url: null,
  rating: 4.8,
  review_count: 50,
  location_display: "Sydney NSW",
  location_state: "NSW",
  specialties: ["retirement"],
  fee_description: "Fee-only",
  verified: true,
  bio: null,
  email: "alice@advisor.test",
};

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

function buildRequest(body: Record<string, unknown>, ip = "9.9.9.9") {
  return makeRequest("/api/submit-lead", body, { ip });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/submit-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockFrom.mockReset();
    mockFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  // ── Validation ──

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/submit-lead", {
      method: "POST",
      body: "{not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON");
  });

  it("returns 400 for missing lead_type", async () => {
    const req = buildRequest({ user_email: "test@example.com" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid lead_type");
  });

  it("returns 400 for invalid lead_type", async () => {
    const req = buildRequest({
      lead_type: "bogus",
      user_email: "test@example.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing email", async () => {
    const req = buildRequest({ lead_type: "advisor" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Valid email required");
  });

  it("returns 400 for invalid email format", async () => {
    const req = buildRequest({
      lead_type: "advisor",
      user_email: "not-an-email",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects disposable email domains", async () => {
    const req = buildRequest({
      lead_type: "advisor",
      user_email: "user@mailinator.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Please use a real email address.");
  });

  // ── Honeypot ──

  it("silently succeeds when honeypot fields are filled", async () => {
    const req = buildRequest({
      lead_type: "advisor",
      user_email: "real@example.com",
      website: "spam.example.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe(null);
    expect(json.matched).toBe(null);
    // Crucially, no DB writes
    expect(supabaseCalls.leads).toBeUndefined();
  });

  // ── Rate limit ──

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const req = buildRequest({
      lead_type: "advisor",
      user_email: "rl@example.com",
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  // ── Platform leads ──

  describe("lead_type=platform", () => {
    it("inserts a platform lead with broker lookup", async () => {
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "brokers") {
          b.single = vi.fn(() =>
            Promise.resolve({
              data: { id: 42, cpa_value: 1500 },
              error: null,
            }),
          );
        }
        if (table === "leads") {
          b.single = vi.fn(() =>
            Promise.resolve({ data: { id: 99 }, error: null }),
          );
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "platform",
        user_email: "platform@test.com",
        user_name: "Platform User",
        broker_slug: "test-broker",
        source_page: "/compare",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead_id).toBe(99);

      const leadCalls = supabaseCalls.leads || [];
      const insertCall = leadCalls.find((c) => c.method === "insert");
      expect(insertCall).toBeDefined();
      const args = insertCall?.args[0] as Record<string, unknown>;
      expect(args.lead_type).toBe("platform");
      expect(args.broker_id).toBe(42);
      expect(args.user_email).toBe("platform@test.com");
    });

    it("returns 500 when platform lead insert fails", async () => {
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "leads") {
          b.single = vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: "db down" },
            }),
          );
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "platform",
        user_email: "fail@test.com",
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  // ── confirm_advisor_id fast-path ──

  describe("confirm_advisor_id", () => {
    it("returns 404 when confirmed advisor not found", async () => {
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "professionals") {
          b.single = vi.fn(() =>
            Promise.resolve({ data: null, error: null }),
          );
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "advisor",
        user_email: "user@test.com",
        confirm_advisor_id: 9999,
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it("creates lead and notifies advisor when confirming", async () => {
      let professionalsCallCount = 0;
      let leadCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "professionals") {
          b.single = vi.fn(() => {
            professionalsCallCount++;
            // First call: confirmedAdvisor lookup
            // Second call: tier lookup
            return Promise.resolve({
              data:
                professionalsCallCount === 1
                  ? ADVISOR
                  : { advisor_tier: "silver" },
              error: null,
            });
          });
        }
        if (table === "leads") {
          // First call: existingLead dedup lookup → null
          // Second call: confirmedLead insert → return id
          b.single = vi.fn(() => {
            leadCallCount++;
            return Promise.resolve({
              data: leadCallCount === 1 ? null : { id: 555 },
              error: leadCallCount === 1 ? { code: "PGRST116" } : null,
            });
          });
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "advisor",
        user_email: "user@test.com",
        user_name: "User Test",
        user_phone: "0400000000",
        user_intent: { need: "planning", context: ["retirement"], budget: "100k" },
        confirm_advisor_id: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead_id).toBe(555);
      expect(json.matched.id).toBe(1);

      // Advisor email + user confirmation should both be sent
      expect(mockSendNewLeadNotification).toHaveBeenCalled();
      expect(mockSendLeadConfirmationToUser).toHaveBeenCalled();
    });

    it("dedupes when the user already confirmed this advisor in last 7 days", async () => {
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "professionals") {
          b.single = vi.fn(() =>
            Promise.resolve({ data: ADVISOR, error: null }),
          );
        }
        if (table === "leads") {
          b.single = vi.fn(() =>
            Promise.resolve({ data: { id: 777 }, error: null }),
          );
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "advisor",
        user_email: "user@test.com",
        confirm_advisor_id: 1,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.lead_id).toBe(777);
      // Lead notifications should NOT fire on dedupe
      expect(mockSendNewLeadNotification).not.toHaveBeenCalled();
    });
  });

  // ── Advisor matching ──

  describe("advisor matching", () => {
    it("dry_run returns the matched advisor without writing a lead", async () => {
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "professionals") {
          // Override limit to return an array via thenable
          b.limit = vi.fn(() => {
            supabaseCalls[table]?.push({ method: "limit", args: [] });
            return Promise.resolve({ data: [ADVISOR], error: null });
          });
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "advisor",
        user_email: "match@test.com",
        user_location_state: "NSW",
        user_intent: { need: "planning" },
        dry_run: true,
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.matched.id).toBe(1);
      expect(json.lead_id).toBe(null);
      // No insert into leads on dry_run (read for dedup is fine)
      const leadCalls = supabaseCalls.leads || [];
      expect(leadCalls.some((c) => c.method === "insert")).toBe(false);
      expect(mockSendNewLeadNotification).not.toHaveBeenCalled();
    });

    it("returns no_more_matches when all advisors are excluded", async () => {
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "professionals") {
          b.limit = vi.fn(() => {
            supabaseCalls[table]?.push({ method: "limit", args: [] });
            // First 4 attempts return empty (filtered by exclusion); 5th returns advisor
            return Promise.resolve({ data: [], error: null });
          });
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "advisor",
        user_email: "exhausted@test.com",
        user_location_state: "NSW",
        user_intent: { need: "planning" },
        exclude_advisor_ids: [1, 2, 3],
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.no_more_matches).toBe(true);
      expect(json.matched).toBe(null);
    });

    it("creates an advisor lead with revenue_value_cents from tier", async () => {
      mockFrom.mockImplementation((table: string) => {
        const b = createChainableBuilder(table, supabaseCalls);
        if (table === "professionals") {
          b.limit = vi.fn(() => {
            supabaseCalls[table]?.push({ method: "limit", args: [] });
            return Promise.resolve({ data: [ADVISOR], error: null });
          });
          b.single = vi.fn(() =>
            Promise.resolve({
              data: { advisor_tier: "gold" },
              error: null,
            }),
          );
        }
        if (table === "leads") {
          b.single = vi.fn(() =>
            Promise.resolve({ data: { id: 12345 }, error: null }),
          );
        }
        return b;
      });

      const req = buildRequest({
        lead_type: "advisor",
        user_email: "match@test.com",
        user_name: "Lead User",
        user_location_state: "NSW",
        user_intent: { need: "planning" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.lead_id).toBe(12345);
      expect(json.matched.id).toBe(1);

      const leadCalls = supabaseCalls.leads || [];
      const insertCall = leadCalls.find((c) => c.method === "insert");
      const insertArgs = insertCall?.args[0] as Record<string, unknown>;
      // gold tier → 6000 cents
      expect(insertArgs.revenue_value_cents).toBe(6000);
    });
  });
});
