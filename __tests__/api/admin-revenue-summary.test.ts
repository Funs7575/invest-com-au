import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "not", "order", "limit"]) b[m] = vi.fn(() => b);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

let tableResults: Record<string, unknown> = {};
const mockFrom = vi.fn((table: string) => makeBuilder(tableResults[table] ?? { data: [], error: null }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/admin/revenue-summary/route";

describe("/api/admin/revenue-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
    tableResults = {};
  });

  it("denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("aggregates advisor + marketplace + article revenue from service-role reads", async () => {
    tableResults = {
      affiliate_clicks: { data: [{ id: 1, broker_slug: "x", source: "s", page: "/p", created_at: "2026-06-01" }], error: null },
      brokers: { data: [{ slug: "x", platform_type: "cfd_forex" }], error: null },
      professional_leads: { data: [{ id: 1, billed: true, status: "converted" }, { id: 2, billed: false, status: "new" }], error: null },
      advisor_billing: { data: [{ id: 1, amount_cents: 5000, status: "paid" }, { id: 2, amount_cents: 3000, status: "pending" }], error: null },
      broker_wallets: { data: [{ balance_cents: 10000, lifetime_deposited_cents: 50000, lifetime_spent_cents: 40000 }], error: null },
      broker_campaigns: { data: [{ id: 1, status: "active" }], error: null },
      advisor_articles: { data: [{ id: 1, status: "published", price_cents: 9900, payment_status: "paid" }], error: null },
      professionals: { data: [{ id: 1, lead_price_cents: 4900, free_leads_used: 2, stripe_customer_id: "cus_1" }], error: null },
      lead_disputes: { data: [{ id: 1 }], error: null },
    };
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.brokerTypes).toEqual({ x: "cfd_forex" });
    expect(json.advisorRev.totalLeads).toBe(2);
    expect(json.advisorRev.billedLeads).toBe(1);
    expect(json.advisorRev.paidBillingCents).toBe(5000);
    expect(json.advisorRev.pendingBillingCents).toBe(3000);
    expect(json.advisorRev.convertedLeads).toBe(1);
    expect(json.advisorRev.stripeConnected).toBe(1);
    // broker_wallets is service-role-only — this is the figure that read 0 via the browser.
    expect(json.marketplaceRev.totalBalanceCents).toBe(10000);
    expect(json.marketplaceRev.totalSpentCents).toBe(40000);
    expect(json.marketplaceRev.activeCampaigns).toBe(1);
    expect(json.articleRev.paidCents).toBe(9900);
    expect(json.clicks).toHaveLength(1);
  });

  it("returns 500 when a read errors", async () => {
    tableResults = { broker_wallets: { data: null, error: { message: "denied" } } };
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("survives a missing broker_campaigns relation (schema drift) with 0 campaigns", async () => {
    // broker_campaigns does not exist in prod — must not 500 the whole dashboard.
    tableResults = {
      brokers: { data: [], error: null },
      broker_campaigns: { data: null, error: { message: 'relation "broker_campaigns" does not exist' } },
    };
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.marketplaceRev.activeCampaigns).toBe(0);
  });
});
