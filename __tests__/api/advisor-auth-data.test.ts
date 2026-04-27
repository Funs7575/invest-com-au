import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { GET, PATCH } from "@/app/api/advisor-auth/data/route";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/data", {
    method: "GET",
  });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/data", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function authedAdvisor(advisorId = 42) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u-1", email: "advisor@test.com" } },
  });
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: { id: advisorId }, error: null }),
      );
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns analytics-shaped JSON with derived stats", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    const recent = new Date(Date.now() - 5 * 86400000).toISOString();
    const old = new Date(Date.now() - 60 * 86400000).toISOString();

    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
      }
      if (table === "advisor_articles") {
        b.order = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "order", args: [] });
          return Promise.resolve({
            data: [
              {
                id: 1,
                title: "Hello Article",
                slug: "hello-article",
                view_count: 100,
                click_count: 10,
                profile_clicks: 5,
                lead_clicks: 2,
                status: "published",
              },
            ],
            error: null,
          });
        });
      }
      if (table === "analytics_events") {
        b.gte = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "gte", args: [] });
          return Promise.resolve({
            data: [
              { event_type: "advisor_phone_click" },
              { event_type: "advisor_phone_click" },
              { event_type: "advisor_website_click" },
            ],
            error: null,
          });
        });
      }
      return b;
    });

    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professional_leads") {
        // Both queries (limit + count). Override the terminal limit to
        // return rows; the count query returns array via order/.then.
        b.limit = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "limit", args: [] });
          return Promise.resolve({
            data: [
              { id: 1, status: "new", created_at: recent },
              { id: 2, status: "converted", created_at: old },
            ],
            error: null,
          });
        });
        // The count query awaits the eq() chain directly
        b.eq = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "eq", args: [] });
          return Object.assign(b, {
            then: (cb: (v: unknown) => void) => {
              cb({
                data: [
                  { id: 1, status: "new", created_at: recent },
                  { id: 2, status: "converted", created_at: old },
                  { id: 3, status: "converted", created_at: recent },
                ],
                error: null,
                count: 3,
              });
              return Promise.resolve();
            },
          });
        });
      }
      if (table === "advisor_billing") {
        b.limit = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "limit", args: [] });
          return Promise.resolve({
            data: [
              { amount_cents: 5000, status: "paid" },
              { amount_cents: 10000, status: "pending" },
            ],
            error: null,
          });
        });
      }
      if (table === "advisor_profile_views") {
        b.order = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "order", args: [] });
          return Promise.resolve({
            data: [
              { view_date: "2026-04-20", view_count: 5 },
              { view_date: "2026-04-21", view_count: 7 },
            ],
            error: null,
          });
        });
      }
      if (table === "professional_reviews") {
        b.order = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "order", args: [] });
          return Promise.resolve({
            data: [{ id: 1, rating: 5 }],
            error: null,
          });
        });
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.totalViews30d).toBe(12);
    expect(json.stats.reviewCount).toBe(1);
    expect(json.stats.pendingBilledCents).toBe(10000);
    expect(json.stats.totalBilledCents).toBe(15000);
    expect(json.stats.phoneClicks).toBe(2);
    expect(json.stats.websiteClicks).toBe(1);
    expect(json.stats.articleViews).toBe(100);
    expect(json.stats.articles).toHaveLength(1);
    expect(json.viewsByDay).toHaveLength(2);
  });
});

describe("PATCH /api/advisor-auth/data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makePatch({ leadId: 1, status: "contacted" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when leadId is missing", async () => {
    authedAdvisor();
    const res = await PATCH(makePatch({ status: "contacted" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when lead doesn't belong to advisor", async () => {
    authedAdvisor();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professional_leads") {
        b.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      }
      return b;
    });
    const res = await PATCH(makePatch({ leadId: 99, status: "contacted" }));
    expect(res.status).toBe(404);
  });

  it("stamps contacted_at, responded_at, and computes response_time_minutes", async () => {
    authedAdvisor();
    const created = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 5, professional_id: 42, created_at: created },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await PATCH(makePatch({ leadId: 5, status: "contacted" }));
    expect(res.status).toBe(200);

    const leadCalls = supabaseCalls.professional_leads || [];
    const updateCall = leadCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.status).toBe("contacted");
    expect(typeof updateArgs.contacted_at).toBe("string");
    expect(typeof updateArgs.responded_at).toBe("string");
    expect(typeof updateArgs.response_time_minutes).toBe("number");
    // ~10 min ago
    expect(updateArgs.response_time_minutes).toBeGreaterThanOrEqual(9);
    expect(updateArgs.response_time_minutes).toBeLessThanOrEqual(11);
  });

  it("stamps converted_at and outcome=won when status=converted", async () => {
    authedAdvisor();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 5, professional_id: 42, created_at: new Date().toISOString() },
            error: null,
          }),
        );
      }
      return b;
    });

    await PATCH(makePatch({ leadId: 5, status: "converted" }));

    const leadCalls = supabaseCalls.professional_leads || [];
    const updateArgs = leadCalls.find((c) => c.method === "update")
      ?.args[0] as Record<string, unknown>;
    expect(updateArgs.status).toBe("converted");
    expect(updateArgs.outcome).toBe("won");
    expect(typeof updateArgs.converted_at).toBe("string");
  });

  it("stamps outcome=lost on lost / rejected status", async () => {
    authedAdvisor();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 5, professional_id: 42, created_at: new Date().toISOString() },
            error: null,
          }),
        );
      }
      return b;
    });

    await PATCH(makePatch({ leadId: 5, status: "rejected" }));

    const leadCalls = supabaseCalls.professional_leads || [];
    const updateArgs = leadCalls.find((c) => c.method === "update")
      ?.args[0] as Record<string, unknown>;
    expect(updateArgs.outcome).toBe("lost");
  });

  it("persists notes when provided", async () => {
    authedAdvisor();
    mockServerFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 5, professional_id: 42, created_at: new Date().toISOString() },
            error: null,
          }),
        );
      }
      return b;
    });

    await PATCH(makePatch({ leadId: 5, notes: "Great client" }));

    const leadCalls = supabaseCalls.professional_leads || [];
    const updateArgs = leadCalls.find((c) => c.method === "update")
      ?.args[0] as Record<string, unknown>;
    expect(updateArgs.advisor_notes).toBe("Great client");
  });
});
