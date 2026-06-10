import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// debitWallet/refundWallet are imported from "./wallet". We mock the module
// so we don't have to spin up wallet's own DB harness and so we can
// drive insufficient-funds + duplicate-click-refund paths deterministically.
const debitWalletMock = vi.fn();
const refundWalletMock = vi.fn();
vi.mock("@/lib/marketplace/wallet", () => ({
  debitWallet: (...args: unknown[]) => debitWalletMock(...args),
  refundWallet: (...args: unknown[]) => refundWalletMock(...args),
}));

// ─── In-memory DB harness ─────────────────────────────────────────────

type Placement = {
  id: number;
  slug: string;
  is_active: boolean;
  max_slots?: number;
};

type Campaign = {
  id: number;
  broker_slug: string;
  placement_id: number;
  inventory_type: "featured" | "cpc";
  rate_cents: number;
  total_spent_cents: number;
  total_budget_cents?: number | null;
  daily_budget_cents?: number | null;
  start_date: string;
  end_date?: string | null;
  status: string;
  priority: number;
  created_at: string;
};

type Wallet = { broker_slug: string; balance_cents: number };
type CampaignEvent = {
  id?: number;
  campaign_id: number;
  cost_cents: number;
  created_at?: string;
  click_id?: string | null;
  event_type?: string;
};

interface InsertError {
  code?: string;
  message?: string;
}

const state = {
  placements: [] as Placement[],
  campaigns: [] as Campaign[],
  wallets: [] as Wallet[],
  events: [] as CampaignEvent[],
  decisionsInserted: [] as Record<string, unknown>[],
  campaignEventsInserted: [] as Record<string, unknown>[],
  campaignsUpdated: [] as { id: number; payload: Record<string, unknown> }[],
  existingClickByClickId: null as { id: number } | null,
  campaignEventInsertError: null as InsertError | null,
};

function reset() {
  state.placements = [];
  state.campaigns = [];
  state.wallets = [];
  state.events = [];
  state.decisionsInserted = [];
  state.campaignEventsInserted = [];
  state.campaignsUpdated = [];
  state.existingClickByClickId = null;
  state.campaignEventInsertError = null;
}

function buildSelectChain(table: string) {
  // Holds query state for marketplace_placements / campaigns / etc.
  const filters: { col: string; op: string; val: unknown }[] = [];
  const orderHistory: { col: string; ascending: boolean }[] = [];
  let limitN: number | null = null;

  const exec = (): { data: unknown; error: null } => {
    if (table === "marketplace_placements") {
      const slugFilter = filters.find((f) => f.col === "slug" && f.op === "eq");
      const matches = state.placements.filter(
        (p) => p.is_active && (!slugFilter || p.slug === slugFilter.val),
      );
      return { data: matches[0] || null, error: null };
    }
    if (table === "campaigns") {
      let rows = [...state.campaigns];
      for (const f of filters) {
        if (f.op === "eq")
          rows = rows.filter(
            (r) => (r as unknown as Record<string, unknown>)[f.col] === f.val,
          );
        if (f.op === "lte")
          rows = rows.filter((r) => {
            const v = (r as unknown as Record<string, unknown>)[f.col];
            return v !== undefined && v !== null && (v as string) <= (f.val as string);
          });
        if (f.op === "in")
          rows = rows.filter((r) =>
            (f.val as unknown[]).includes(
              (r as unknown as Record<string, unknown>)[f.col],
            ),
          );
      }
      // Apply ordering
      for (const o of [...orderHistory].reverse()) {
        rows.sort((a, b) => {
          const av = (a as unknown as Record<string, unknown>)[o.col] as
            | number
            | string
            | undefined;
          const bv = (b as unknown as Record<string, unknown>)[o.col] as
            | number
            | string
            | undefined;
          if (av === bv) return 0;
          if (av === undefined) return 1;
          if (bv === undefined) return -1;
          if (av < bv) return o.ascending ? -1 : 1;
          return o.ascending ? 1 : -1;
        });
      }
      if (limitN !== null) rows = rows.slice(0, limitN);
      return { data: rows, error: null };
    }
    if (table === "broker_wallets") {
      const inFilter = filters.find((f) => f.col === "broker_slug" && f.op === "in");
      const gtFilter = filters.find(
        (f) => f.col === "balance_cents" && f.op === "gt",
      );
      let rows = [...state.wallets];
      if (inFilter)
        rows = rows.filter((w) => (inFilter.val as unknown[]).includes(w.broker_slug));
      if (gtFilter) rows = rows.filter((w) => w.balance_cents > (gtFilter.val as number));
      return {
        data: rows.map((w) => ({
          broker_slug: w.broker_slug,
          balance_cents: w.balance_cents,
        })),
        error: null,
      };
    }
    if (table === "campaign_events") {
      const campaignIdFilter = filters.find((f) => f.col === "campaign_id");
      const inFilter = filters.find(
        (f) => f.col === "campaign_id" && f.op === "in",
      );
      const eqEvent = filters.find((f) => f.col === "event_type" && f.op === "eq");
      const eqClick = filters.find((f) => f.col === "click_id" && f.op === "eq");
      const gteCreated = filters.find(
        (f) => f.col === "created_at" && f.op === "gte",
      );
      let rows = [...state.events];
      if (inFilter) rows = rows.filter((e) => (inFilter.val as unknown[]).includes(e.campaign_id));
      else if (campaignIdFilter && campaignIdFilter.op === "eq") {
        rows = rows.filter((e) => e.campaign_id === campaignIdFilter.val);
      }
      if (eqClick) rows = rows.filter((e) => e.click_id === eqClick.val);
      if (eqEvent) rows = rows.filter((e) => e.event_type === eqEvent.val);
      if (gteCreated)
        rows = rows.filter((e) => (e.created_at || "") >= (gteCreated.val as string));
      return { data: rows, error: null };
    }
    return { data: null, error: null };
  };

  // Using `any` for the chain because it's a deeply self-referential
  // builder that has to satisfy Supabase's heterogeneous chain shape
  // (eq/lte/gte/gt/in/order/limit return chain, maybeSingle/single
  // return Promise<{data,error}>, then makes it thenable).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    eq: (col: string, val: unknown) => {
      filters.push({ col, op: "eq", val });
      return chain;
    },
    lte: (col: string, val: unknown) => {
      filters.push({ col, op: "lte", val });
      return chain;
    },
    gte: (col: string, val: unknown) => {
      filters.push({ col, op: "gte", val });
      return chain;
    },
    gt: (col: string, val: unknown) => {
      filters.push({ col, op: "gt", val });
      return chain;
    },
    in: (col: string, val: unknown[]) => {
      filters.push({ col, op: "in", val });
      return chain;
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      orderHistory.push({ col, ascending: opts?.ascending !== false });
      return chain;
    },
    limit: (n: number) => {
      limitN = n;
      return chain;
    },
    maybeSingle: async () => {
      const res = exec();
      const data = Array.isArray(res.data) ? res.data[0] || null : res.data;
      return { data, error: null };
    },
    single: async () => {
      const res = exec();
      const data = Array.isArray(res.data) ? res.data[0] || null : res.data;
      return { data, error: null };
    },
    // Awaiting the chain directly returns the array result.
    then: (cb: (v: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(cb(exec())),
  };
  return chain;
}

const mockFrom = vi.fn((table: string) => {
  return {
    select: (_cols?: string) => buildSelectChain(table),
    insert: (row: Record<string, unknown> | Record<string, unknown>[]) => {
      if (table === "campaign_events") {
        if (state.campaignEventInsertError) {
          return { error: state.campaignEventInsertError };
        }
        const arr = Array.isArray(row) ? row : [row];
        for (const r of arr) state.campaignEventsInserted.push(r);
        return { error: null };
      }
      if (table === "allocation_decisions") {
        const arr = Array.isArray(row) ? row : [row];
        for (const r of arr) state.decisionsInserted.push(r);
        return {
          select: () => ({
            then: (cb: (v: unknown) => unknown) =>
              Promise.resolve(cb({ data: arr, error: null })),
          }),
        };
      }
      return { error: null };
    },
    update: (payload: Record<string, unknown>) => ({
      eq: (col: string, val: unknown) => {
        if (table === "campaigns" && col === "id") {
          state.campaignsUpdated.push({ id: val as number, payload });
        }
        return Promise.resolve({ data: null, error: null });
      },
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Imports under test ───────────────────────────────────────────────

import {
  getWinningCampaigns,
  recordImpression,
  recordCpcClick,
  getActiveCpcCampaign,
} from "@/lib/marketplace/allocation";

// ─── Helpers ──────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function defaultPlacement(over: Partial<Placement> = {}): Placement {
  return { id: 1, slug: "homepage-hero", is_active: true, max_slots: 2, ...over };
}

function defaultCampaign(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 100,
    broker_slug: "stake",
    placement_id: 1,
    inventory_type: "featured",
    rate_cents: 500,
    total_spent_cents: 0,
    total_budget_cents: null,
    daily_budget_cents: null,
    start_date: "2024-01-01",
    end_date: null,
    status: "active",
    priority: 1,
    created_at: "2024-01-01T00:00:00Z",
    ...over,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("marketplace/allocation", () => {
  beforeEach(() => {
    reset();
    debitWalletMock.mockReset();
    refundWalletMock.mockReset();
    debitWalletMock.mockResolvedValue(undefined);
    refundWalletMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("getWinningCampaigns — placement gating", () => {
    it("returns [] and logs fallback when placement does not exist", async () => {
      const res = await getWinningCampaigns("missing-slug");
      expect(res).toEqual([]);
      // wait a tick for fire-and-forget logger
      await Promise.resolve();
      await Promise.resolve();
      expect(state.decisionsInserted.length).toBe(1);
      const decision = state.decisionsInserted[0];
      expect(decision.placement_slug).toBe("missing-slug");
      expect(decision.fallback_used).toBe(true);
      // rejection log captures the placement_not_found marker
      const log = JSON.parse(decision.rejection_log as string) as { reason: string }[];
      expect(log[0].reason).toBe("placement_not_found");
    });

    it("returns [] and logs fallback when no campaigns target the placement", async () => {
      state.placements = [defaultPlacement()];
      const res = await getWinningCampaigns("homepage-hero");
      expect(res).toEqual([]);
      await Promise.resolve();
      await Promise.resolve();
      expect(state.decisionsInserted.length).toBe(1);
      expect(state.decisionsInserted[0].fallback_used).toBe(true);
      expect(state.decisionsInserted[0].candidate_count).toBe(0);
    });
  });

  describe("getWinningCampaigns — eligibility filters", () => {
    it("rejects campaigns with total_budget exhausted", async () => {
      state.placements = [defaultPlacement({ max_slots: 1 })];
      state.campaigns = [
        defaultCampaign({ id: 1, total_budget_cents: 1000, total_spent_cents: 1000 }),
      ];
      state.wallets = [{ broker_slug: "stake", balance_cents: 5000 }];
      const res = await getWinningCampaigns("homepage-hero");
      expect(res).toEqual([]);
      await Promise.resolve();
      await Promise.resolve();
      const log = JSON.parse(state.decisionsInserted[0].rejection_log as string) as {
        reason: string;
      }[];
      expect(log[0].reason).toBe("total_budget_exhausted");
    });

    it("rejects campaigns whose end_date has passed", async () => {
      state.placements = [defaultPlacement({ max_slots: 1 })];
      state.campaigns = [defaultCampaign({ id: 2, end_date: "2000-01-01" })];
      state.wallets = [{ broker_slug: "stake", balance_cents: 5000 }];
      const res = await getWinningCampaigns("homepage-hero");
      expect(res).toEqual([]);
      await Promise.resolve();
      await Promise.resolve();
      const log = JSON.parse(state.decisionsInserted[0].rejection_log as string) as {
        reason: string;
      }[];
      expect(log[0].reason).toBe("end_date_passed");
    });

    it("rejects campaigns whose daily budget is exhausted", async () => {
      state.placements = [defaultPlacement({ max_slots: 1 })];
      state.campaigns = [
        defaultCampaign({ id: 3, daily_budget_cents: 1000, rate_cents: 200 }),
      ];
      state.wallets = [{ broker_slug: "stake", balance_cents: 5000 }];
      // Pre-existing spend equals daily cap
      state.events = [
        {
          campaign_id: 3,
          cost_cents: 1000,
          created_at: TODAY + "T08:00:00.000Z",
          event_type: "click",
        },
      ];
      const res = await getWinningCampaigns("homepage-hero");
      expect(res).toEqual([]);
      await Promise.resolve();
      await Promise.resolve();
      const log = JSON.parse(state.decisionsInserted[0].rejection_log as string) as {
        reason: string;
      }[];
      expect(log[0].reason).toBe("daily_budget_hit");
    });

    it("rejects campaigns whose broker has zero wallet balance", async () => {
      state.placements = [defaultPlacement({ max_slots: 1 })];
      state.campaigns = [defaultCampaign({ id: 4, broker_slug: "broke" })];
      // No wallet entry for "broke" at all
      state.wallets = [];
      const res = await getWinningCampaigns("homepage-hero");
      expect(res).toEqual([]);
      await Promise.resolve();
      await Promise.resolve();
      const log = JSON.parse(state.decisionsInserted[0].rejection_log as string) as {
        reason: string;
      }[];
      expect(log[0].reason).toBe("zero_wallet_balance");
    });
  });

  describe("getWinningCampaigns — auction ranking", () => {
    it("returns top max_slots winners ranked by rate_cents DESC", async () => {
      state.placements = [defaultPlacement({ max_slots: 2 })];
      state.campaigns = [
        defaultCampaign({ id: 10, broker_slug: "low", rate_cents: 100 }),
        defaultCampaign({ id: 11, broker_slug: "high", rate_cents: 500 }),
        defaultCampaign({ id: 12, broker_slug: "mid", rate_cents: 300 }),
      ];
      state.wallets = [
        { broker_slug: "low", balance_cents: 500 },
        { broker_slug: "high", balance_cents: 500 },
        { broker_slug: "mid", balance_cents: 500 },
      ];
      const winners = await getWinningCampaigns("homepage-hero");
      expect(winners).toHaveLength(2);
      expect(winners[0].broker_slug).toBe("high");
      expect(winners[0].rate_cents).toBe(500);
      expect(winners[1].broker_slug).toBe("mid");
      // 3rd-place loser logged as outbid_no_slot
      await Promise.resolve();
      await Promise.resolve();
      const decision = state.decisionsInserted[0];
      const log = JSON.parse(decision.rejection_log as string) as { reason: string }[];
      expect(log.find((r) => r.reason === "outbid_no_slot")).toBeTruthy();
      expect(decision.fallback_used).toBe(false);
      expect(decision.winner_count).toBe(2);
      expect(decision.candidate_count).toBe(3);
    });

    it("respects the brokerSlugs whitelist when supplied", async () => {
      state.placements = [defaultPlacement({ max_slots: 5 })];
      state.campaigns = [
        defaultCampaign({ id: 20, broker_slug: "alpha", rate_cents: 500 }),
        defaultCampaign({ id: 21, broker_slug: "beta", rate_cents: 600 }),
      ];
      state.wallets = [
        { broker_slug: "alpha", balance_cents: 500 },
        { broker_slug: "beta", balance_cents: 500 },
      ];
      const winners = await getWinningCampaigns("homepage-hero", ["alpha"]);
      expect(winners).toHaveLength(1);
      expect(winners[0].broker_slug).toBe("alpha");
    });

    it("propagates AllocationContext into the decision log", async () => {
      state.placements = [defaultPlacement({ max_slots: 1 })];
      state.campaigns = [defaultCampaign({ id: 30 })];
      state.wallets = [{ broker_slug: "stake", balance_cents: 1000 }];
      await getWinningCampaigns("homepage-hero", undefined, {
        page: "/best-platforms",
        scenario: "growth",
        device_type: "mobile",
      });
      await Promise.resolve();
      await Promise.resolve();
      const d = state.decisionsInserted[0];
      expect(d.page).toBe("/best-platforms");
      expect(d.scenario).toBe("growth");
      expect(d.device_type).toBe("mobile");
    });

    it("defaults max_slots to 1 when placement omits it", async () => {
      state.placements = [{ id: 1, slug: "homepage-hero", is_active: true } as Placement];
      state.campaigns = [
        defaultCampaign({ id: 41, rate_cents: 500 }),
        defaultCampaign({ id: 42, rate_cents: 400 }),
      ];
      state.wallets = [{ broker_slug: "stake", balance_cents: 1000 }];
      const winners = await getWinningCampaigns("homepage-hero");
      expect(winners).toHaveLength(1);
      expect(winners[0].campaign_id).toBe(41);
    });
  });

  describe("recordImpression", () => {
    it("inserts an impression row with cost_cents=0", async () => {
      await recordImpression(123, "stake", "/best-platforms", {
        placement_id: 7,
        scenario: "scen",
        device_type: "desktop",
      });
      expect(state.campaignEventsInserted).toHaveLength(1);
      expect(state.campaignEventsInserted[0]).toMatchObject({
        campaign_id: 123,
        broker_slug: "stake",
        event_type: "impression",
        cost_cents: 0,
        page: "/best-platforms",
        placement_id: 7,
        scenario: "scen",
        device_type: "desktop",
      });
    });

    it("nulls out optional attribution fields when omitted", async () => {
      await recordImpression(123, "stake");
      const row = state.campaignEventsInserted[0];
      expect(row.page).toBeNull();
      expect(row.placement_id).toBeNull();
      expect(row.scenario).toBeNull();
      expect(row.device_type).toBeNull();
    });
  });

  describe("recordCpcClick — idempotency + billing", () => {
    it("returns true without re-billing when click_id was already billed", async () => {
      state.events = [
        {
          id: 999,
          campaign_id: 50,
          cost_cents: 200,
          click_id: "abc",
          event_type: "click",
        },
      ];
      const ok = await recordCpcClick(50, "stake", 999, { click_id: "abc" });
      expect(ok).toBe(true);
      // Should not have called debit, should not have inserted a new event
      expect(debitWalletMock).not.toHaveBeenCalled();
      expect(state.campaignEventsInserted).toHaveLength(0);
    });

    it("returns false when the campaign does not exist", async () => {
      const ok = await recordCpcClick(404, "stake", 100, {});
      expect(ok).toBe(false);
      expect(debitWalletMock).not.toHaveBeenCalled();
    });

    it("returns false when the campaign rate_cents is zero or missing", async () => {
      state.campaigns = [defaultCampaign({ id: 60, rate_cents: 0 })];
      const ok = await recordCpcClick(60, "stake", 100, {});
      expect(ok).toBe(false);
    });

    it("returns false when the campaign status is not active", async () => {
      state.campaigns = [defaultCampaign({ id: 61, status: "paused" })];
      const ok = await recordCpcClick(61, "stake", 100, {});
      expect(ok).toBe(false);
    });

    it("returns false when daily_budget would be exceeded by this click", async () => {
      state.campaigns = [
        defaultCampaign({ id: 62, rate_cents: 500, daily_budget_cents: 1000 }),
      ];
      state.events = [
        {
          campaign_id: 62,
          cost_cents: 700,
          created_at: TODAY + "T05:00:00.000Z",
          event_type: "click",
        },
      ];
      const ok = await recordCpcClick(62, "stake", 500, {});
      expect(ok).toBe(false);
      expect(debitWalletMock).not.toHaveBeenCalled();
    });

    it("returns false when the wallet debit fails (insufficient funds)", async () => {
      state.campaigns = [defaultCampaign({ id: 63, rate_cents: 500 })];
      debitWalletMock.mockRejectedValueOnce(new Error("Insufficient"));
      const ok = await recordCpcClick(63, "stake", 500, {});
      expect(ok).toBe(false);
      // No event row + no campaign update on failure
      expect(state.campaignEventsInserted).toHaveLength(0);
      expect(state.campaignsUpdated).toHaveLength(0);
    });

    it("debits the wallet at the DB-side rate, ignoring caller-supplied rate", async () => {
      // Caller supplies 999, but the DB says 500 — the canonical value.
      state.campaigns = [defaultCampaign({ id: 64, rate_cents: 500 })];
      const ok = await recordCpcClick(64, "stake", 999, {
        click_id: "click-1",
        page: "/best-platforms",
        ip_hash: "h",
        user_agent: "ua",
        session_id: "s",
        placement_id: 9,
      });
      expect(ok).toBe(true);
      expect(debitWalletMock).toHaveBeenCalledWith(
        "stake",
        500, // ← from DB, not caller's 999
        expect.stringContaining("CPC click"),
        { type: "campaign_click", id: "64" },
      );
      expect(state.campaignEventsInserted[0]).toMatchObject({
        campaign_id: 64,
        cost_cents: 500,
        click_id: "click-1",
      });
      expect(state.campaignsUpdated[0]).toMatchObject({
        id: 64,
        payload: expect.objectContaining({ total_spent_cents: 500 }),
      });
    });

    it("auto-pauses the campaign when total_budget is exhausted by this click", async () => {
      state.campaigns = [
        defaultCampaign({
          id: 65,
          rate_cents: 500,
          total_budget_cents: 800,
          total_spent_cents: 500,
        }),
      ];
      const ok = await recordCpcClick(65, "stake", 500, { click_id: "c2" });
      expect(ok).toBe(true);
      // 500 + 500 ≥ 800 → status flips to budget_exhausted
      expect(state.campaignsUpdated[0].payload).toMatchObject({
        total_spent_cents: 1000,
        status: "budget_exhausted",
      });
    });

    it("refunds the wallet on a duplicate click_id race (insert error 23505)", async () => {
      state.campaigns = [defaultCampaign({ id: 66, rate_cents: 500 })];
      state.campaignEventInsertError = { code: "23505", message: "duplicate key" };
      const ok = await recordCpcClick(66, "stake", 500, { click_id: "race-1" });
      // Returns true because the click was already billed (race recovery)
      expect(ok).toBe(true);
      expect(debitWalletMock).toHaveBeenCalled();
      expect(refundWalletMock).toHaveBeenCalledWith(
        "stake",
        500,
        expect.stringContaining("Refund"),
        { type: "duplicate_click_refund", id: "race-1" },
      );
      // Campaign total_spent should NOT have been bumped — the update happens
      // after the insert returns successfully.
      expect(state.campaignsUpdated).toHaveLength(0);
    });

    it("returns false on non-23505 insert errors", async () => {
      state.campaigns = [defaultCampaign({ id: 67, rate_cents: 500 })];
      state.campaignEventInsertError = { code: "12345", message: "other" };
      const ok = await recordCpcClick(67, "stake", 500, {});
      expect(ok).toBe(false);
      expect(refundWalletMock).not.toHaveBeenCalled();
    });
  });

  describe("getActiveCpcCampaign", () => {
    it("returns null when no CPC campaign exists for the broker", async () => {
      state.campaigns = [];
      const res = await getActiveCpcCampaign("stake");
      expect(res).toBeNull();
    });

    it("returns the campaign when one is active and within budget", async () => {
      // The handler does a join `marketplace_placements!inner(slug)` — our
      // mock's select doesn't model the join itself, so we attach the
      // expected field directly to the row via the in-memory state.
      state.campaigns = [
        {
          ...defaultCampaign({
            id: 70,
            inventory_type: "cpc",
            broker_slug: "stake",
            total_budget_cents: 5000,
            total_spent_cents: 1000,
          }),
          // Embedded placement payload as Supabase would return
          ...({ marketplace_placements: { slug: "homepage-hero" } } as Record<
            string,
            unknown
          >),
        } as Campaign,
      ];
      const res = await getActiveCpcCampaign("stake");
      expect(res).not.toBeNull();
      expect(res!.broker_slug).toBe("stake");
      expect(res!.inventory_type).toBe("cpc");
      expect(res!.placement_slug).toBe("homepage-hero");
    });

    it("returns null when the campaign's total budget is exhausted", async () => {
      state.campaigns = [
        {
          ...defaultCampaign({
            id: 71,
            inventory_type: "cpc",
            broker_slug: "stake",
            total_budget_cents: 1000,
            total_spent_cents: 1000,
          }),
          ...({ marketplace_placements: { slug: "homepage-hero" } } as Record<
            string,
            unknown
          >),
        } as Campaign,
      ];
      const res = await getActiveCpcCampaign("stake");
      expect(res).toBeNull();
    });

    it("returns null when the campaign end_date has passed", async () => {
      state.campaigns = [
        {
          ...defaultCampaign({
            id: 72,
            inventory_type: "cpc",
            broker_slug: "stake",
            end_date: "2000-01-01",
          }),
          ...({ marketplace_placements: { slug: "homepage-hero" } } as Record<
            string,
            unknown
          >),
        } as Campaign,
      ];
      const res = await getActiveCpcCampaign("stake");
      expect(res).toBeNull();
    });
  });
});
