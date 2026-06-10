import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const { state } = vi.hoisted(() => ({
  state: {
    apiCustomer: null as null | Record<string, unknown>,
    leads: [] as Record<string, unknown>[],
    capturedFilters: [] as Array<[string, unknown]>,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "api_customers") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: state.apiCustomer, error: null }),
        };
      }
      // professional_leads
      const builder: Record<string, unknown> = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        eq: vi.fn((col: string, val: unknown) => {
          state.capturedFilters.push([col, val]);
          return builder;
        }),
        is: vi.fn((col: string, val: unknown) => {
          state.capturedFilters.push([col, val]);
          return builder;
        }),
        then: (cb: (v: unknown) => unknown) => Promise.resolve(cb({ data: state.leads, error: null })),
      };
      return builder;
    }),
  })),
}));

import { GET } from "@/app/api/partner/leads/analytics/route";

function makeGet(apiKey?: string): NextRequest {
  const url = apiKey
    ? `http://localhost/api/partner/leads/analytics?api_key=${encodeURIComponent(apiKey)}`
    : "http://localhost/api/partner/leads/analytics";
  return new NextRequest(url);
}

const LEAD = {
  id: 1,
  created_at: "2026-06-01T00:00:00Z",
  status: "new",
  pipeline_stage: "new",
  responded_at: null,
  converted_at: null,
  billed: false,
  bill_amount_cents: null,
  user_email: "a@b.com",
  user_name: "A",
  professionals: { name: "Bob", type: "financial_planner" },
};

describe("GET /api/partner/leads/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PARTNER_API_KEY", "legacy-key-123456");
    state.apiCustomer = null;
    state.leads = [];
    state.capturedFilters = [];
  });

  it("returns 401 without a key", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 for an unknown key", async () => {
    const res = await GET(makeGet("wrong-key-123456"));
    expect(res.status).toBe(401);
  });

  it("scopes a managed partner to its partner_id", async () => {
    state.apiCustomer = { id: "p-1", company_name: "Acme", status: "active", rate_limit_per_min: 60 };
    state.leads = [LEAD];
    const res = await GET(makeGet("pk_live_acme"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.partner.account).toBe("managed");
    expect(state.capturedFilters).toContainEqual(["partner_id", "p-1"]);
    expect(body.totals.delivered).toBe(1);
  });

  it("scopes the legacy key to source_page=partner_api with null partner_id", async () => {
    state.leads = [LEAD];
    const res = await GET(makeGet("legacy-key-123456"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.partner.account).toBe("legacy");
    expect(state.capturedFilters).toContainEqual(["source_page", "partner_api"]);
    expect(state.capturedFilters).toContainEqual(["partner_id", null]);
  });

  it("computes funnel + SLA + billing rollups", async () => {
    state.apiCustomer = { id: "p-1", company_name: "Acme", status: "active", rate_limit_per_min: 60 };
    state.leads = [
      { ...LEAD, id: 1 },
      {
        ...LEAD,
        id: 2,
        pipeline_stage: "won",
        converted_at: "2026-06-02T00:00:00Z",
        responded_at: "2026-06-01T05:00:00Z", // within 24h of created_at
        billed: true,
        bill_amount_cents: 8750,
      },
      {
        ...LEAD,
        id: 3,
        pipeline_stage: "contacted",
        responded_at: "2026-06-03T00:00:00Z", // > 24h
      },
    ];
    const res = await GET(makeGet("pk_live_acme"));
    const body = await res.json();
    expect(body.totals.delivered).toBe(3);
    expect(body.totals.responded).toBe(2);
    expect(body.totals.responded_within_24h).toBe(1);
    expect(body.totals.converted).toBe(1);
    expect(body.totals.billed_cents).toBe(8750);
    expect(body.by_pipeline_stage.won).toBe(1);
    expect(body.recent_leads).toHaveLength(3);
  });
});
