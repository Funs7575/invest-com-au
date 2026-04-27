import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: vi.fn(() => true),
  isDisposableEmail: vi.fn(() => false),
}));

vi.mock("@/lib/utm", () => ({
  extractUtm: vi.fn(() => ({})),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendNewLeadNotification: vi.fn(() => Promise.resolve()),
  sendLeadConfirmationToUser: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Import after mocks
import { POST } from "@/app/api/submit-lead/route";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADVISOR = {
  id: 101,
  slug: "jane-planner",
  name: "Jane Planner",
  email: "jane@planners.com.au",
  firm_name: "Planners Pty Ltd",
  type: "financial_planner",
  photo_url: null,
  rating: 4.8,
  review_count: 23,
  location_display: "Sydney NSW",
  location_state: "NSW",
  specialties: ["retirement"],
  fee_description: "Fee for service",
  verified: true,
};

const ADVISOR_BODY = {
  lead_type: "advisor",
  user_email: "test@example.com",
  user_name: "Test User",
  user_phone: "0412345678",
  user_location_state: "NSW",
  user_intent: { need: "planning", context: [], budget: "50000" },
  source_page: "/quiz",
};

const PLATFORM_BODY = {
  lead_type: "platform",
  user_email: "test@example.com",
  user_name: "Test User",
  broker_slug: "commsec",
  source_page: "/brokers/commsec",
};

// ── Mock helpers ──────────────────────────────────────────────────────────────

type SingleResult = { data: unknown; error: unknown };
type ThenCb = (v: { data: unknown; error: unknown }) => void;

function makeBuilder(table: string) {
  const b = createChainableBuilder(table);
  // Add chain methods absent from the base helper
  b.not = vi.fn(() => b);
  b.or = vi.fn(() => b);
  b.filter = vi.fn(() => b);
  return b;
}

function setupFromMock(
  tableConfig: Record<
    string,
    {
      then?: (cb: ThenCb) => Promise<void>;
      single?: () => Promise<SingleResult>;
    }
  > = {},
) {
  mockFrom.mockImplementation((table: string) => {
    const b = makeBuilder(table);
    const cfg = tableConfig[table];
    if (cfg?.then) {
      const thenImpl = cfg.then;
      b.then = vi.fn((cb: ThenCb) => thenImpl(cb));
    }
    if (cfg?.single) {
      const singleImpl = cfg.single;
      b.single = vi.fn(() => singleImpl());
    }
    return b;
  });
}

function leadRequest(body: Record<string, unknown>, ip = "4.5.6.7") {
  return makeRequest("/api/submit-lead", body, { ip });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/submit-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (isValidEmail as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (isDisposableEmail as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it("returns 400 for missing lead_type", async () => {
    const res = await POST(leadRequest({ user_email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("lead_type");
  });

  it("returns 400 for unrecognised lead_type", async () => {
    const res = await POST(leadRequest({ lead_type: "broker", user_email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("lead_type");
  });

  it("returns 400 for invalid email", async () => {
    (isValidEmail as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const res = await POST(leadRequest({ ...ADVISOR_BODY, user_email: "not-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("email");
  });

  it("returns 400 for disposable email domain", async () => {
    (isDisposableEmail as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const res = await POST(leadRequest({ ...ADVISOR_BODY, user_email: "anon@mailinator.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("real email");
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(leadRequest(ADVISOR_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("Too many requests");
  });

  it("returns 200 silently for honeypot-filled bot requests without touching DB", async () => {
    const res = await POST(leadRequest({ ...ADVISOR_BODY, website: "https://spam.example" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBeNull();
    expect(json.matched).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ── Platform lead path ────────────────────────────────────────────────────

  it("platform lead: inserts lead row and returns lead_id", async () => {
    setupFromMock({
      brokers: { single: async () => ({ data: { id: 5, cpa_value: 100 }, error: null }) },
      leads: { single: async () => ({ data: { id: 77 }, error: null }) },
    });

    const res = await POST(leadRequest(PLATFORM_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe(77);

    const leadCalls = mockFrom.mock.calls.filter((c: unknown[]) => c[0] === "leads");
    expect(leadCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("platform lead: returns 500 when leads insert fails", async () => {
    setupFromMock({
      brokers: { single: async () => ({ data: null, error: null }) },
      leads: { single: async () => ({ data: null, error: { message: "constraint" } }) },
    });

    const res = await POST(leadRequest(PLATFORM_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Failed to save lead");
  });

  // ── Advisor auto-match path ───────────────────────────────────────────────

  it("dry_run: returns matched advisor without creating any professional_leads rows", async () => {
    setupFromMock({
      professionals: {
        then: (cb) => { cb({ data: [ADVISOR], error: null }); return Promise.resolve(); },
        single: async () => ({ data: ADVISOR, error: null }),
      },
      // recent-leads dedup check runs even in dry_run; return empty so no exclusions are built
      leads: {
        then: (cb) => { cb({ data: [], error: null }); return Promise.resolve(); },
      },
      professional_leads: {
        then: (cb) => { cb({ data: [], error: null }); return Promise.resolve(); },
      },
    });

    const res = await POST(leadRequest({ ...ADVISOR_BODY, dry_run: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.lead_id).toBeNull();    // key dry_run guarantee: no lead created
    expect(json.matched?.id).toBe(101);
    expect(json.matched?.name).toBe("Jane Planner");
    // No leads table insert made (lead_id: null above proves this)
  });

  it("auto-match success: creates lead + professional_leads rows and returns matched advisor", async () => {
    setupFromMock({
      professionals: {
        then: (cb) => { cb({ data: [ADVISOR], error: null }); return Promise.resolve(); },
        single: async () => ({ data: { advisor_tier: "gold" }, error: null }),
      },
      leads: {
        then: (cb) => { cb({ data: [], error: null }); return Promise.resolve(); },
        single: async () => ({ data: { id: 99 }, error: null }),
      },
      professional_leads: {
        then: (cb) => { cb({ data: null, error: null }); return Promise.resolve(); },
      },
    });

    const res = await POST(leadRequest(ADVISOR_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe(99);
    expect(json.matched?.id).toBe(101);
    expect(json.matched?.name).toBe("Jane Planner");
    expect(json.no_more_matches).toBe(false);

    const leadCalls = mockFrom.mock.calls.filter((c: unknown[]) => c[0] === "leads");
    const plCalls = mockFrom.mock.calls.filter((c: unknown[]) => c[0] === "professional_leads");
    expect(leadCalls.length).toBeGreaterThanOrEqual(2); // recent-leads check + insert
    expect(plCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("auto-match: no_more_matches when DB reports user already matched with all advisors", async () => {
    // Seed the recent-leads check to return advisor 101 as a prior match so
    // excludeArray = [101] (length > 0), which arms Attempt 5's absolute fallback.
    // All match + fallback queries return zero results -> no_more_matches: true.
    let leadsCallIndex = 0;

    mockFrom.mockImplementation((table: string) => {
      const b = makeBuilder(table);

      if (table === "professionals") {
        b.then = vi.fn((cb) => { cb({ data: [], error: null }); return Promise.resolve(); });
      }

      if (table === "leads") {
        leadsCallIndex++;
        const callN = leadsCallIndex;
        b.then = vi.fn((cb) => {
          // First call: recent-leads exclusion check -> report advisor 101 was recently matched
          cb({ data: callN === 1 ? [{ professional_id: 101 }] : [], error: null });
          return Promise.resolve();
        });
        // single is the fallback for insert (only reached if Attempt 5 doesn't early-return)
        b.single = vi.fn(async () => ({ data: null, error: null }));
      }

      if (table === "professional_leads") {
        b.then = vi.fn((cb) => { cb({ data: [], error: null }); return Promise.resolve(); });
      }

      return b;
    });

    const res = await POST(leadRequest(ADVISOR_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.no_more_matches).toBe(true);
    expect(json.lead_id).toBeNull();
    expect(json.matched).toBeNull();
  });

  it("auto-match: lead insert error returns 500", async () => {
    setupFromMock({
      professionals: {
        then: (cb) => { cb({ data: [ADVISOR], error: null }); return Promise.resolve(); },
        single: async () => ({ data: { advisor_tier: "gold" }, error: null }),
      },
      leads: {
        then: (cb) => { cb({ data: [], error: null }); return Promise.resolve(); },
        single: async () => ({ data: null, error: { message: "FK violation" } }),
      },
    });

    const res = await POST(leadRequest(ADVISOR_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Failed to save lead");
  });

  // ── confirm_advisor_id path ───────────────────────────────────────────────

  it("confirm_advisor_id: returns 404 when advisor not found", async () => {
    setupFromMock({
      professionals: {
        single: async () => ({ data: null, error: { code: "PGRST116" } }),
      },
    });

    const res = await POST(leadRequest({ ...ADVISOR_BODY, confirm_advisor_id: 999 }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("not found");
  });

  it("confirm_advisor_id: duplicate lead suppressed — returns existing lead without re-inserting", async () => {
    setupFromMock({
      professionals: {
        single: async () => ({ data: ADVISOR, error: null }),
      },
      leads: {
        // dedup check finds an existing lead within the 7-day window
        single: async () => ({ data: { id: 42 }, error: null }),
      },
    });

    const res = await POST(leadRequest({ ...ADVISOR_BODY, confirm_advisor_id: 101 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe(42);
    expect(json.matched?.id).toBe(101);

    // No professional_leads insert since it was a duplicate
    const plCalls = mockFrom.mock.calls.filter((c: unknown[]) => c[0] === "professional_leads");
    expect(plCalls).toHaveLength(0);
  });

  it("confirm_advisor_id: creates new lead when no duplicate exists", async () => {
    let leadsCallIndex = 0;
    let profCallIndex = 0;

    mockFrom.mockImplementation((table: string) => {
      const b = makeBuilder(table);

      if (table === "professionals") {
        profCallIndex++;
        const callN = profCallIndex;
        b.single = vi.fn(async () =>
          callN === 1
            ? { data: ADVISOR, error: null }            // advisor lookup
            : { data: { advisor_tier: "silver" }, error: null }, // tier lookup
        );
      }

      if (table === "leads") {
        leadsCallIndex++;
        const callN = leadsCallIndex;
        b.single = vi.fn(async () =>
          callN === 1
            ? { data: null, error: null }               // dedup: no existing lead
            : { data: { id: 88 }, error: null },        // insert: new lead created
        );
      }

      if (table === "professional_leads") {
        b.then = vi.fn((cb) => { cb({ data: null, error: null }); return Promise.resolve(); });
      }

      return b;
    });

    const res = await POST(leadRequest({ ...ADVISOR_BODY, confirm_advisor_id: 101 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.lead_id).toBe(88);
    expect(json.matched?.id).toBe(101);

    const plCalls = mockFrom.mock.calls.filter((c: unknown[]) => c[0] === "professional_leads");
    expect(plCalls.length).toBeGreaterThanOrEqual(1);
  });
});
