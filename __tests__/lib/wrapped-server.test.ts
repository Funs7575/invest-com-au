import { describe, it, expect, vi, beforeEach } from "vitest";

import { loadWrappedData } from "@/lib/wrapped-server";
import { fyFromEndYear } from "@/lib/wrapped";
import type { createClient } from "@/lib/supabase/server";

const { mockAdminFrom } = vi.hoisted(() => ({ mockAdminFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

type ServerClient = Awaited<ReturnType<typeof createClient>>;

interface ChainResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

/** Minimal awaitable PostgREST chain: every filter method returns itself. */
function chain(result: ChainResult): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lte", "lt", "not", "order", "in"]) {
    c[method] = () => c;
  }
  c.then = (resolve: (v: ChainResult) => unknown) =>
    Promise.resolve(resolve({ data: null, error: null, count: null, ...result }));
  return c;
}

function fakeClient(byTable: Record<string, ChainResult>): ServerClient {
  return {
    from: (table: string) => chain(byTable[table] ?? {}),
  } as unknown as ServerClient;
}

const FY26 = fyFromEndYear(2026);
const NOW_MS = Date.UTC(2026, 5, 12);
const USER = { id: "user-1", createdAt: "2024-01-01T00:00:00Z" };

beforeEach(() => {
  mockAdminFrom.mockReset();
});

describe("loadWrappedData", () => {
  it("wires every source table into the assembled recap", async () => {
    mockAdminFrom.mockImplementation(() => chain({ count: 3 }));
    const supabase = fakeClient({
      investor_holdings: {
        data: [{ acquired_at: "2025-08-10", shares: 10, cost_basis_per_share_cents: 50_000 }],
      },
      investor_goals: {
        data: [
          {
            label: "Emergency fund",
            target_cents: 1_000_000,
            current_balance_cents: 800_000,
            monthly_contribution_cents: 20_000,
            expected_return_pct: 0,
            target_date: "2027-06-30",
          },
        ],
      },
      manual_balances: { data: [{ amount_cents: 150_000 }, { amount_cents: 50_000 }] },
      user_health_score_log: {
        data: [
          { overall: 72, scored_month: "2025-09-01" },
          { overall: 78, scored_month: "2026-05-01" },
        ],
      },
      user_daily_checkins: {
        data: [{ check_in_date: "2026-03-01" }, { check_in_date: "2026-03-02" }],
      },
      user_quiz_history: { count: 2 },
      user_bookmarks: { count: 4 },
      user_watchlist_items: { count: 1 },
      rate_alert_subscriptions: { data: [{ id: "sub-1" }, { id: "sub-2" }] },
    });

    const data = await loadWrappedData(supabase, USER, FY26, NOW_MS);

    expect(data.balances?.totalCents).toBe(500_000 + 800_000 + 200_000);
    expect(data.invested).toEqual({ addedCents: 500_000, newHoldings: 1 });
    expect(data.goals?.onTrack).toBe(1);
    expect(data.health?.startGrade).toBe("C");
    expect(data.health?.endGrade).toBe("B");
    expect(data.streak).toEqual({ longestRunDays: 2, totalCheckins: 2 });
    expect(data.activity).toEqual({
      quizzesCompleted: 2,
      guidesSaved: 4,
      watchlistAdds: 1,
      total: 7,
    });
    expect(data.alerts).toEqual({ activeAlerts: 2, alertsTriggered: 3 });
    expect(data.isFirstFy).toBe(false);
    expect(mockAdminFrom).toHaveBeenCalledWith("rate_alert_sends");
  });

  it("returns an all-null recap instead of throwing when every read fails", async () => {
    const failing: ChainResult = { data: null, error: { message: "boom" } };
    const supabase = fakeClient({
      investor_holdings: failing,
      investor_goals: failing,
      manual_balances: failing,
      user_health_score_log: failing,
      user_daily_checkins: failing,
      user_quiz_history: failing,
      user_bookmarks: failing,
      user_watchlist_items: failing,
      rate_alert_subscriptions: failing,
    });

    const data = await loadWrappedData(supabase, USER, FY26, NOW_MS);

    expect(data.hasAnyData).toBe(false);
    expect(data.balances).toBeNull();
    expect(data.goals).toBeNull();
    expect(data.health).toBeNull();
    expect(data.alerts).toBeNull();
    expect(data.streak).toBeNull();
    expect(data.activity).toBeNull();
    expect(mockAdminFrom).not.toHaveBeenCalled(); // no subscriptions → no admin read
  });

  it("degrades alertsTriggered to null when the send log is unavailable", async () => {
    mockAdminFrom.mockImplementation(() =>
      chain({ error: { message: 'relation "rate_alert_sends" does not exist' } }),
    );
    const supabase = fakeClient({
      rate_alert_subscriptions: { data: [{ id: "sub-1" }] },
    });

    const data = await loadWrappedData(supabase, USER, FY26, NOW_MS);

    expect(data.alerts).toEqual({ activeAlerts: 1, alertsTriggered: null });
  });

  it("skips the service-role read entirely when the user has no subscriptions", async () => {
    const supabase = fakeClient({
      rate_alert_subscriptions: { data: [] },
      investor_goals: {
        data: [
          {
            label: "Holiday",
            target_cents: 100_000,
            current_balance_cents: 100_000,
            monthly_contribution_cents: 0,
            expected_return_pct: 0,
            target_date: "2026-12-01",
          },
        ],
      },
    });

    const data = await loadWrappedData(supabase, USER, FY26, NOW_MS);

    expect(mockAdminFrom).not.toHaveBeenCalled();
    expect(data.alerts).toBeNull();
    expect(data.goals?.total).toBe(1);
  });
});
