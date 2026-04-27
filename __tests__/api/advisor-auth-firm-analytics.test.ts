import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { GET } from "@/app/api/advisor-auth/firm/analytics/route";

function makeGet(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest(
    "http://localhost/api/advisor-auth/firm/analytics",
    {
      method: "GET",
      headers,
    },
  );
}

function withSession(opts: {
  expired?: boolean;
  advisor?: Record<string, unknown> | null;
} = {}) {
  const expiresAt = opts.expired
    ? new Date(Date.now() - 86400 * 1000).toISOString()
    : new Date(Date.now() + 86400 * 1000).toISOString();
  mockServerFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "advisor_sessions") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data: { professional_id: 42, expires_at: expiresAt },
          error: null,
        }),
      );
    }
    if (table === "professionals") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data:
            opts.advisor === undefined
              ? { id: 42, firm_id: 7, is_firm_admin: true }
              : opts.advisor,
          error: null,
        }),
      );
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/firm/analytics", () => {
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

  it("returns 401 when no cookie", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 when session expired", async () => {
    withSession({ expired: true });
    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not in a firm", async () => {
    withSession({ advisor: { id: 42, firm_id: null } });
    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(403);
  });

  it("returns empty members + null summary when firm has no members", async () => {
    withSession();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.order = vi.fn(() =>
          Promise.resolve({ data: [], error: null }),
        );
      }
      return b;
    });

    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.members).toEqual([]);
    expect(json.summary).toBe(null);
  });

  it("returns aggregated firm analytics with per-member stats", async () => {
    withSession();
    const recent = new Date(Date.now() - 5 * 86400000).toISOString();
    const old = new Date(Date.now() - 60 * 86400000).toISOString();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.order = vi.fn(() =>
          Promise.resolve({
            data: [
              {
                id: 1,
                name: "Alice",
                slug: "alice",
                rating: 4.8,
                review_count: 10,
                credit_balance_cents: 5000,
              },
              {
                id: 2,
                name: "Bob",
                slug: "bob",
                rating: 4.4,
                review_count: 5,
                credit_balance_cents: 3000,
              },
            ],
            error: null,
          }),
        );
      }
      if (table === "professional_leads") {
        b.in = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "in", args: [] });
          return Promise.resolve({
            data: [
              {
                id: 1,
                professional_id: 1,
                status: "converted",
                bill_amount_cents: 4900,
                billed: true,
                created_at: recent,
              },
              {
                id: 2,
                professional_id: 1,
                status: "new",
                bill_amount_cents: 4900,
                billed: true,
                created_at: old,
              },
              {
                id: 3,
                professional_id: 2,
                status: "lost",
                bill_amount_cents: 0,
                billed: false,
                created_at: recent,
              },
            ],
            error: null,
          });
        });
      }
      if (table === "professional_views") {
        b.gte = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "gte", args: [] });
          return Promise.resolve({
            data: [
              { professional_id: 1, view_date: "2026-04-20", view_count: 10 },
              { professional_id: 2, view_date: "2026-04-21", view_count: 5 },
            ],
            error: null,
          });
        });
      }
      return b;
    });

    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.totalMembers).toBe(2);
    expect(json.summary.totalLeads).toBe(3);
    expect(json.summary.totalConverted).toBe(1);
    expect(json.summary.totalBilledCents).toBe(9800); // 4900 + 4900
    expect(json.summary.totalCreditCents).toBe(8000); // 5000 + 3000
    expect(json.summary.totalViews30d).toBe(15);
    // Avg rating = (4.8 + 4.4) / 2 = 4.6
    expect(json.summary.avgRating).toBe("4.6");

    expect(json.members).toHaveLength(2);
    const alice = json.members.find(
      (m: { id: number }) => m.id === 1,
    );
    expect(alice.totalLeads).toBe(2);
    expect(alice.convertedLeads).toBe(1);
    expect(alice.totalBilledCents).toBe(9800);
  });

  it("returns 500 on unexpected error", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("DB unavailable");
    });
    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(500);
  });
});
