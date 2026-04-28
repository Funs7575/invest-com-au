import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockSessionBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
};

// Each `from` call returns a fresh chainable builder that resolves on `.single()`
// or directly for parallel queries (awaiting the builder).
const makeTableBuilder = (result: { data: unknown; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(result),
  // For queries awaited directly (not via .single()):
  then: (cb: (v: typeof result) => void) => { cb(result); return Promise.resolve(result); },
});

const mockServerFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
  })),
}));

import { GET } from "@/app/api/advisor-dashboard/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(sessionToken?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (sessionToken) headers.cookie = `advisor_session=${sessionToken}`;
  return new NextRequest("http://localhost/api/advisor-dashboard", {
    method: "GET",
    headers,
  });
}

const MOCK_ADVISOR = {
  id: 7,
  name: "Jane Smith",
  slug: "jane-smith",
  email: "jane@example.com",
  type: "financial-planner",
  photo_url: "https://cdn.invest.com.au/jane.jpg",
  bio: "Expert planner with 10 years experience",
  specialties: ["superannuation", "retirement"],
  fee_structure: "hourly",
  fee_description: "$300/hr",
  website: "https://janesmith.com.au",
  phone: "+61 412 345 678",
  booking_link: "https://calendly.com/jane",
  booking_intro: "Book a free consult",
  credit_balance_cents: 5000,
  lead_price_cents: 2500,
  free_leads_used: 3,
  rating: 4.8,
  review_count: 12,
  verified: true,
  location_display: "Sydney, NSW",
  firm_name: "Smith Financial",
};

function setupSuccessMocks() {
  // Session lookup → valid session
  mockSessionBuilder.single.mockResolvedValueOnce({
    data: {
      professional_id: 7,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
    error: null,
  });

  const mockBuilders: Record<string, ReturnType<typeof makeTableBuilder>> = {
    advisor_sessions: mockSessionBuilder as ReturnType<typeof makeTableBuilder>,
    professionals: makeTableBuilder({ data: MOCK_ADVISOR, error: null }),
    professional_leads: makeTableBuilder({ data: [], error: null }),
    advisor_billing: makeTableBuilder({ data: [], error: null }),
    advisor_profile_views: makeTableBuilder({ data: [], error: null }),
    professional_reviews: makeTableBuilder({ data: [], error: null }),
    advisor_bookings: makeTableBuilder({ data: [], error: null }),
    lead_pricing: makeTableBuilder({ data: null, error: null }),
  };

  mockServerFrom.mockImplementation((table: string) => mockBuilders[table] ?? makeTableBuilder({ data: null, error: null }));
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mockSessionBuilder, {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-dashboard", () => {
  it("returns 401 when no cookie present", async () => {
    mockServerFrom.mockReturnValue(mockSessionBuilder);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Not authenticated");
  });

  it("returns 401 when session token not found in DB", async () => {
    mockSessionBuilder.single.mockResolvedValue({ data: null, error: null });
    mockServerFrom.mockReturnValue(mockSessionBuilder);
    const res = await GET(makeRequest("bad-token"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is expired", async () => {
    mockSessionBuilder.single.mockResolvedValue({
      data: {
        professional_id: 7,
        expires_at: new Date(Date.now() - 1000).toISOString(),
      },
      error: null,
    });
    mockServerFrom.mockReturnValue(mockSessionBuilder);
    const res = await GET(makeRequest("expired-token"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with advisor stats on success", async () => {
    setupSuccessMocks();
    const res = await GET(makeRequest("valid-token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.advisor).toMatchObject({ id: 7, name: "Jane Smith" });
    expect(body.stats).toHaveProperty("totalLeads");
    expect(body.stats).toHaveProperty("conversionRate");
    expect(body.weeklyEnquiries).toHaveLength(8);
    expect(body.profileCompleteness).toHaveProperty("score");
  });

  it("computes profile completeness score from advisor fields", async () => {
    setupSuccessMocks();
    const res = await GET(makeRequest("valid-token"));
    const { profileCompleteness } = await res.json();
    // MOCK_ADVISOR has all fields set → score should be 100
    expect(profileCompleteness.score).toBe(100);
    expect(profileCompleteness.missingFields).toHaveLength(0);
  });

  it("includes missingFields when advisor profile is incomplete", async () => {
    // Advisor missing photo_url, bio, booking_link
    mockSessionBuilder.single.mockResolvedValueOnce({
      data: {
        professional_id: 7,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });
    const incompleteAdvisor = { ...MOCK_ADVISOR, photo_url: null, bio: null, booking_link: null };
    const builders: Record<string, ReturnType<typeof makeTableBuilder>> = {
      advisor_sessions: mockSessionBuilder as ReturnType<typeof makeTableBuilder>,
      professionals: makeTableBuilder({ data: incompleteAdvisor, error: null }),
      professional_leads: makeTableBuilder({ data: [], error: null }),
      advisor_billing: makeTableBuilder({ data: [], error: null }),
      advisor_profile_views: makeTableBuilder({ data: [], error: null }),
      professional_reviews: makeTableBuilder({ data: [], error: null }),
      advisor_bookings: makeTableBuilder({ data: [], error: null }),
      lead_pricing: makeTableBuilder({ data: null, error: null }),
    };
    mockServerFrom.mockImplementation((t: string) => builders[t] ?? makeTableBuilder({ data: null, error: null }));
    const res = await GET(makeRequest("valid-token"));
    const { profileCompleteness } = await res.json();
    expect(profileCompleteness.missingFields).toContain("Profile photo");
    expect(profileCompleteness.missingFields).toContain("Bio / About");
    expect(profileCompleteness.missingFields).toContain("Booking link");
    expect(profileCompleteness.score).toBeLessThan(100);
  });

  it("computes hot/warm/cold lead counts by quality_score", async () => {
    mockSessionBuilder.single.mockResolvedValueOnce({
      data: {
        professional_id: 7,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    });
    const leads = [
      { id: 1, quality_score: 80, status: "new", created_at: new Date().toISOString() },
      { id: 2, quality_score: 55, status: "new", created_at: new Date().toISOString() },
      { id: 3, quality_score: 20, status: "converted", created_at: new Date().toISOString() },
    ];
    const builders: Record<string, ReturnType<typeof makeTableBuilder>> = {
      advisor_sessions: mockSessionBuilder as ReturnType<typeof makeTableBuilder>,
      professionals: makeTableBuilder({ data: MOCK_ADVISOR, error: null }),
      professional_leads: makeTableBuilder({ data: leads, error: null }),
      advisor_billing: makeTableBuilder({ data: [], error: null }),
      advisor_profile_views: makeTableBuilder({ data: [], error: null }),
      professional_reviews: makeTableBuilder({ data: [], error: null }),
      advisor_bookings: makeTableBuilder({ data: [], error: null }),
      lead_pricing: makeTableBuilder({ data: null, error: null }),
    };
    mockServerFrom.mockImplementation((t: string) => builders[t] ?? makeTableBuilder({ data: null, error: null }));
    const res = await GET(makeRequest("valid-token"));
    const { stats } = await res.json();
    expect(stats.hotLeadsCount).toBe(1);
    expect(stats.warmLeadsCount).toBe(1);
    expect(stats.coldLeadsCount).toBe(1);
    expect(stats.convertedLeads).toBe(1);
    expect(stats.totalLeads).toBe(3);
  });
});
