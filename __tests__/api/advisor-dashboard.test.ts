import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const adminFromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: adminFromMock })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// The route now delegates auth to the shared resolver (JWT + legacy cookie);
// mock it at the boundary instead of the underlying session lookup.
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: vi.fn(),
}));

import { GET } from "@/app/api/advisor-dashboard/route";
import { requireAdvisorSession } from "@/lib/require-advisor-session";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADVISOR_ID = 42;
const SESSION_TOKEN = "sess-token-abc";

function makeGet(sessionToken?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers.Cookie = `advisor_session=${sessionToken}`;
  }
  return new NextRequest("http://localhost/api/advisor-dashboard", { headers });
}

function makeAdvisor(overrides = {}) {
  return {
    id: ADVISOR_ID,
    name: "Jane Smith",
    slug: "jane-smith",
    firm_name: "Smith Financial",
    email: "jane@smithfin.com",
    photo_url: "https://example.com/photo.jpg",
    type: "financial_advisor",
    location_display: "Sydney, NSW",
    rating: 4.8,
    review_count: 12,
    verified: true,
    bio: "Experienced planner",
    specialties: ["SMSF", "retirement"],
    fee_structure: "fixed",
    fee_description: "$300/hr",
    website: "https://smith.com",
    phone: "0400 000 000",
    booking_link: "https://calendly.com/jane",
    booking_intro: "Book a free consult",
    credit_balance_cents: 5000,
    lead_price_cents: 5000,
    free_leads_used: 2,
    ...overrides,
  };
}

function makeLead(
  created_at: string,
  status = "new",
  quality_score = 80,
  response_time_minutes: number | null = null,
  responded_at: string | null = null,
) {
  return {
    id: Math.random(),
    user_name: "Test User",
    user_email: "user@test.com",
    user_phone: "0400 000 001",
    message: "I need help",
    source_page: "/advisor",
    status,
    quality_score,
    qualification_data: null,
    lead_tier: "warm",
    advisor_notes: null,
    contacted_at: null,
    converted_at: null,
    created_at,
    responded_at,
    response_time_minutes,
  };
}

function makeReview(rating: number) {
  return {
    id: Math.random(),
    reviewer_name: "Happy Client",
    rating,
    title: "Great advisor",
    body: "Very helpful",
    created_at: new Date().toISOString(),
    communication_rating: 5,
    expertise_rating: 5,
    value_for_money_rating: 4,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated as ADVISOR_ID. The 401 tests override to null.
    vi.mocked(requireAdvisorSession).mockResolvedValue(ADVISOR_ID);
    // advisor_bookings is fetched via createAdminClient — default to empty result
    adminFromMock.mockImplementation(() => {
      const b = createChainableBuilder("advisor_bookings");
      b.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return b;
    });
  });

  it("returns 401 when no advisor_session cookie", async () => {
    vi.mocked(requireAdvisorSession).mockResolvedValue(null);

    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/not authenticated/i);
  });

  it("returns 401 when the shared resolver rejects the session", async () => {
    vi.mocked(requireAdvisorSession).mockResolvedValue(null);

    const res = await GET(makeGet(SESSION_TOKEN));
    expect(res.status).toBe(401);
  });

  it("returns 401 when the session has expired (resolver returns null)", async () => {
    vi.mocked(requireAdvisorSession).mockResolvedValue(null);

    const res = await GET(makeGet(SESSION_TOKEN));
    expect(res.status).toBe(401);
  });

  it("returns dashboard data for authenticated advisor", async () => {
    const advisor = makeAdvisor();
    const now = new Date().toISOString();
    const recentLead = makeLead(now, "new", 75);
    const review = makeReview(5);

    mockFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") {
        const builder = createChainableBuilder("advisor_sessions");
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: ADVISOR_ID,
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
            error: null,
          }),
        );
        return builder;
      }
      if (table === "professionals") {
        const builder = createChainableBuilder("professionals");
        builder.single = vi.fn(() => Promise.resolve({ data: advisor, error: null }));
        return builder;
      }
      if (table === "professional_leads") {
        const builder = createChainableBuilder("professional_leads");
        builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
          cb({ data: [recentLead], error: null });
          return Promise.resolve();
        });
        return builder;
      }
      if (table === "professional_reviews") {
        const builder = createChainableBuilder("professional_reviews");
        builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
          cb({ data: [review], error: null });
          return Promise.resolve();
        });
        return builder;
      }
      if (table === "lead_pricing") {
        const builder = createChainableBuilder("lead_pricing");
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: { price_cents: 4900, free_trial_leads: 3, featured_monthly_cents: 49900 },
            error: null,
          }),
        );
        return builder;
      }
      // advisor_billing, advisor_profile_views, advisor_bookings
      const builder = createChainableBuilder(table);
      builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return builder;
    });

    const res = await GET(makeGet(SESSION_TOKEN));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.advisor.name).toBe("Jane Smith");
    expect(data.stats.totalLeads).toBe(1);
    expect(data.stats.hotLeadsCount).toBe(1); // quality_score 75 >= 70
    expect(data.stats.reviewCount).toBe(1);
    expect(data.stats.avgRating).toBe("5.0");
  });

  it("computes profile completeness score", async () => {
    // Advisor missing photo and bio → 40 pts deducted
    const advisor = makeAdvisor({ photo_url: null, bio: "" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") {
        const builder = createChainableBuilder("advisor_sessions");
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: ADVISOR_ID,
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
            error: null,
          }),
        );
        return builder;
      }
      if (table === "professionals") {
        const builder = createChainableBuilder("professionals");
        builder.single = vi.fn(() => Promise.resolve({ data: advisor, error: null }));
        return builder;
      }
      if (table === "lead_pricing") {
        const builder = createChainableBuilder("lead_pricing");
        builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return builder;
      }
      const builder = createChainableBuilder(table);
      builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return builder;
    });

    const res = await GET(makeGet(SESSION_TOKEN));
    expect(res.status).toBe(200);
    const data = await res.json();
    // photo_url (20) + bio (20) = 40 deducted → score = 60
    expect(data.profileCompleteness.score).toBe(60);
    expect(data.profileCompleteness.missingFields).toContain("Profile photo");
    expect(data.profileCompleteness.missingFields).toContain("Bio / About");
  });

  it("returns avgRating null when no reviews", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") {
        const builder = createChainableBuilder("advisor_sessions");
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: ADVISOR_ID,
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
            error: null,
          }),
        );
        return builder;
      }
      if (table === "professionals") {
        const builder = createChainableBuilder("professionals");
        builder.single = vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null }));
        return builder;
      }
      if (table === "lead_pricing") {
        const builder = createChainableBuilder("lead_pricing");
        builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return builder;
      }
      const builder = createChainableBuilder(table);
      builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return builder;
    });

    const res = await GET(makeGet(SESSION_TOKEN));
    const data = await res.json();
    expect(data.stats.avgRating).toBeNull();
  });

  it("computes avgResponseTimeMinutes as mean of responded leads", async () => {
    const now = new Date().toISOString();
    // 3 leads: two responded (20min, 40min), one not
    const leads = [
      makeLead(now, "contacted", 80, 20, now),
      makeLead(now, "contacted", 55, 40, now),
      makeLead(now, "new", 60, null, null),
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") {
        const builder = createChainableBuilder("advisor_sessions");
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: ADVISOR_ID, expires_at: new Date(Date.now() + 86400000).toISOString() },
            error: null,
          }),
        );
        return builder;
      }
      if (table === "professionals") {
        const builder = createChainableBuilder("professionals");
        builder.single = vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null }));
        return builder;
      }
      if (table === "professional_leads") {
        const builder = createChainableBuilder("professional_leads");
        builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
          cb({ data: leads, error: null });
          return Promise.resolve();
        });
        return builder;
      }
      if (table === "lead_pricing") {
        const builder = createChainableBuilder("lead_pricing");
        builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return builder;
      }
      const builder = createChainableBuilder(table);
      builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return builder;
    });

    const res = await GET(makeGet(SESSION_TOKEN));
    const data = await res.json();
    expect(data.stats.avgResponseTimeMinutes).toBe(30); // (20+40)/2
  });

  it("returns avgResponseTimeMinutes null when no leads have responded_at", async () => {
    const now = new Date().toISOString();
    const leads = [
      makeLead(now, "new", 80, null, null),
      makeLead(now, "new", 55, null, null),
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") {
        const builder = createChainableBuilder("advisor_sessions");
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: ADVISOR_ID, expires_at: new Date(Date.now() + 86400000).toISOString() },
            error: null,
          }),
        );
        return builder;
      }
      if (table === "professionals") {
        const builder = createChainableBuilder("professionals");
        builder.single = vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null }));
        return builder;
      }
      if (table === "professional_leads") {
        const builder = createChainableBuilder("professional_leads");
        builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
          cb({ data: leads, error: null });
          return Promise.resolve();
        });
        return builder;
      }
      if (table === "lead_pricing") {
        const builder = createChainableBuilder("lead_pricing");
        builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return builder;
      }
      const builder = createChainableBuilder(table);
      builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return builder;
    });

    const res = await GET(makeGet(SESSION_TOKEN));
    const data = await res.json();
    expect(data.stats.avgResponseTimeMinutes).toBeNull();
  });

  it("classifies lead quality buckets correctly", async () => {
    const now = new Date().toISOString();
    const leads = [
      makeLead(now, "new", 80),  // hot (>=70)
      makeLead(now, "new", 55),  // warm (40-69)
      makeLead(now, "new", 20),  // cold (<40)
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "advisor_sessions") {
        const builder = createChainableBuilder("advisor_sessions");
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: {
              professional_id: ADVISOR_ID,
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            },
            error: null,
          }),
        );
        return builder;
      }
      if (table === "professionals") {
        const builder = createChainableBuilder("professionals");
        builder.single = vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null }));
        return builder;
      }
      if (table === "professional_leads") {
        const builder = createChainableBuilder("professional_leads");
        builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
          cb({ data: leads, error: null });
          return Promise.resolve();
        });
        return builder;
      }
      if (table === "lead_pricing") {
        const builder = createChainableBuilder("lead_pricing");
        builder.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return builder;
      }
      const builder = createChainableBuilder(table);
      builder.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return builder;
    });

    const res = await GET(makeGet(SESSION_TOKEN));
    const data = await res.json();
    expect(data.stats.hotLeadsCount).toBe(1);
    expect(data.stats.warmLeadsCount).toBe(1);
    expect(data.stats.coldLeadsCount).toBe(1);
    expect(data.weeklyEnquiries).toHaveLength(8); // 8-week window always returned
  });

  // ── KK-06: accept rate + period comparisons ──

  function makeFromWithLeads(leads: ReturnType<typeof makeLead>[]) {
    return (table: string) => {
      if (table === "advisor_sessions") {
        const b = createChainableBuilder("advisor_sessions");
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { professional_id: ADVISOR_ID, expires_at: new Date(Date.now() + 86400000).toISOString() },
            error: null,
          }),
        );
        return b;
      }
      if (table === "professionals") {
        const b = createChainableBuilder("professionals");
        b.single = vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null }));
        return b;
      }
      if (table === "professional_leads") {
        const b = createChainableBuilder("professional_leads");
        b.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
          cb({ data: leads, error: null });
          return Promise.resolve();
        });
        return b;
      }
      if (table === "lead_pricing") {
        const b = createChainableBuilder("lead_pricing");
        b.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return b;
      }
      const b = createChainableBuilder(table);
      b.then = vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
        cb({ data: [], error: null });
        return Promise.resolve();
      });
      return b;
    };
  }

  it("computes acceptRate from contacted and converted leads", async () => {
    const now = new Date().toISOString();
    const leads = [
      makeLead(now, "contacted"),
      makeLead(now, "converted"),
      makeLead(now, "new"),
    ];
    mockFrom.mockImplementation(makeFromWithLeads(leads));
    const res = await GET(makeGet(SESSION_TOKEN));
    const data = await res.json();
    // 2 accepted out of 3 = 66.7%
    expect(data.stats.acceptRate).toBeCloseTo(66.7, 1);
  });

  it("acceptRate is 0 when there are no leads", async () => {
    mockFrom.mockImplementation(makeFromWithLeads([]));
    const res = await GET(makeGet(SESSION_TOKEN));
    const data = await res.json();
    expect(data.stats.acceptRate).toBe(0);
  });

  it("computes leads7d, leadsThisMonth, leadsLastMonth correctly", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthMid = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();
    // 2 leads within last 7 days (and this month), 1 lead last month
    const leads = [
      makeLead(yesterday),
      makeLead(fiveDaysAgo),
      makeLead(prevMonthMid),
    ];
    // Only the first two are ≥ thisMonthStart when thisMonthStart ≤ 5 days ago.
    // Guard: if we're early in the month (day < 6), fiveDaysAgo lands in last month.
    const expectedThisMonth = [yesterday, fiveDaysAgo].filter(
      (d) => new Date(d) >= thisMonthStart
    ).length;
    mockFrom.mockImplementation(makeFromWithLeads(leads));
    const res = await GET(makeGet(SESSION_TOKEN));
    const data = await res.json();
    expect(data.stats.leads7d).toBe(2); // yesterday + 5 days ago both within 7d
    expect(data.stats.leadsThisMonth).toBe(expectedThisMonth);
    expect(data.stats.leadsLastMonth).toBeGreaterThanOrEqual(1); // prevMonthMid
  });
});
