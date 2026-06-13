import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ────────────────────────────────────────────────────────
const { mockIsFlagEnabled, mockAcceptBrief, mockGetAcceptCost, mockNotifyConsumer } =
  vi.hoisted(() => ({
    mockIsFlagEnabled: vi.fn(),
    mockAcceptBrief: vi.fn(),
    mockGetAcceptCost: vi.fn(),
    mockNotifyConsumer: vi.fn(),
  }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

vi.mock("@/lib/briefs/credits", () => ({
  acceptBrief: mockAcceptBrief,
  getAcceptCost: mockGetAcceptCost,
}));

vi.mock("@/lib/briefs/notify", () => ({
  notifyConsumerOfAcceptance: mockNotifyConsumer,
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendPoolOfferReceived: vi.fn(async () => true),
  sendProviderPoolOfferAccepted: vi.fn(async () => true),
}));

// ── In-memory fake admin client ──────────────────────────────────────────
// Tables are plain arrays of row objects; the query builder supports exactly
// the chain shapes the demand-pools code uses.
interface Tables {
  advisor_auctions: Record<string, unknown>[];
  demand_pools: Record<string, unknown>[];
  pool_members: Record<string, unknown>[];
  pool_offers: Record<string, unknown>[];
  professionals: Record<string, unknown>[];
  brief_tracker_events: Record<string, unknown>[];
}

let db: Tables;
let idSeq: number;

function nextId(): number {
  idSeq += 1;
  return idSeq;
}

/** Mirrors the migration's column DEFAULTs for inserts that omit them. */
function columnDefaults(table: keyof Tables): Record<string, unknown> {
  switch (table) {
    case "demand_pools":
      return { status: "forming", min_size: 3, max_size: 12 };
    case "pool_members":
      return { status: "joined" };
    case "pool_offers":
      return { status: "active" };
    default:
      return {};
  }
}

function makeBuilder(table: keyof Tables) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  let countMode = false;
  let pendingInsert: Record<string, unknown> | Record<string, unknown>[] | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;
  let orderKey: string | null = null;
  let orderAsc = true;
  let limitN: number | null = null;

  function rows(): Record<string, unknown>[] {
    let out = db[table].filter((r) => filters.every((f) => f(r)));
    if (orderKey) {
      out = [...out].sort((a, b) => {
        const av = String(a[orderKey!] ?? "");
        const bv = String(b[orderKey!] ?? "");
        return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    if (limitN !== null) out = out.slice(0, limitN);
    return out;
  }

  const builder: Record<string, unknown> = {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.count) countMode = true;
      return builder;
    },
    eq(col: string, val: unknown) {
      filters.push((r) => r[col] === val);
      return builder;
    },
    neq(col: string, val: unknown) {
      filters.push((r) => r[col] !== val);
      return builder;
    },
    in(col: string, vals: unknown[]) {
      filters.push((r) => vals.includes(r[col]));
      return builder;
    },
    is(col: string, val: unknown) {
      filters.push((r) => (r[col] ?? null) === val);
      return builder;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      orderKey = col;
      orderAsc = opts?.ascending ?? true;
      return builder;
    },
    limit(n: number) {
      limitN = n;
      return builder;
    },
    insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      pendingInsert = payload;
      // Apply the insert immediately; insert() may be awaited directly
      // (fire-and-forget tracker rows) OR chained .select().single().
      const list = Array.isArray(payload) ? payload : [payload];
      for (const p of list) {
        // Apply the same column DEFAULTs the migration declares, so the
        // status-transition filters (.eq('status','forming')) behave as in prod.
        const defaults = columnDefaults(table);
        const row = { id: nextId(), ...defaults, ...p };
        db[table].push(row);
        pendingInsert = row; // last inserted for .select().single()
      }
      return builder;
    },
    update(payload: Record<string, unknown>) {
      pendingUpdate = payload;
      return builder;
    },
    async single() {
      if (pendingInsert && !Array.isArray(pendingInsert)) {
        return { data: pendingInsert, error: null };
      }
      const r = rows()[0];
      return r ? { data: r, error: null } : { data: null, error: { message: "no rows" } };
    },
    async maybeSingle() {
      const r = rows()[0];
      return { data: r ?? null, error: null };
    },
    // Terminal await: applies updates, returns count or data.
    then(resolve: (v: unknown) => unknown) {
      if (pendingUpdate) {
        for (const r of rows()) Object.assign(r, pendingUpdate);
        return Promise.resolve(resolve({ data: null, error: null }));
      }
      if (countMode) {
        return Promise.resolve(resolve({ count: rows().length, data: null, error: null }));
      }
      return Promise.resolve(resolve({ data: rows(), error: null }));
    },
  };
  return builder;
}

const mockAdmin = { from: (t: keyof Tables) => makeBuilder(t) };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

// ── SUT (imported after mocks) ───────────────────────────────────────────
import { assignBriefToPool } from "@/lib/briefs/demand-pools";
import {
  submitPoolOffer,
  acceptPoolOffer,
  declinePoolOffer,
} from "@/lib/briefs/demand-pools-actions";

function seedBrief(overrides: Record<string, unknown> = {}): number {
  const id = nextId();
  db.advisor_auctions.push({
    id,
    slug: `brief-${id}`,
    flow_type: "accept",
    status: "open",
    risk_review_status: "clear",
    accepted_by_professional_id: null,
    accepted_by_team_id: null,
    routing_mode: "multi_response",
    brief_template: "smsf_accountant",
    location: "NSW",
    budget_band: "2k_5k",
    contact_email: `c${id}@example.com`,
    contact_name: "Sam",
    job_title: "SMSF setup",
    brief_payload: { pool_opt_in: true },
    ...overrides,
  });
  return id;
}

beforeEach(() => {
  vi.clearAllMocks();
  idSeq = 1000;
  db = {
    advisor_auctions: [],
    demand_pools: [],
    pool_members: [],
    pool_offers: [],
    professionals: [],
    brief_tracker_events: [],
  };
  mockIsFlagEnabled.mockResolvedValue(true);
  mockGetAcceptCost.mockResolvedValue(4);
  mockNotifyConsumer.mockResolvedValue(undefined);
});

// ── Clustering assignment ─────────────────────────────────────────────────

describe("assignBriefToPool — flag gating", () => {
  it("is a no-op when the flag is off (no pool created)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const briefId = seedBrief();
    const res = await assignBriefToPool(briefId);
    expect(res.assigned).toBe(false);
    expect(res.reason).toBe("flag_off");
    expect(db.demand_pools).toHaveLength(0);
    expect(db.pool_members).toHaveLength(0);
  });
});

describe("assignBriefToPool — opt-in + eligibility", () => {
  it("skips briefs that did not opt in", async () => {
    const briefId = seedBrief({ brief_payload: {} });
    const res = await assignBriefToPool(briefId);
    expect(res.assigned).toBe(false);
    expect(res.reason).toBe("not_eligible");
    expect(db.pool_members).toHaveLength(0);
  });

  it("skips ineligible briefs (already accepted)", async () => {
    const briefId = seedBrief({ accepted_by_professional_id: 5 });
    const res = await assignBriefToPool(briefId);
    expect(res.reason).toBe("not_eligible");
  });

  it("creates the pool and joins an eligible opted-in brief", async () => {
    const briefId = seedBrief();
    const res = await assignBriefToPool(briefId);
    expect(res.assigned).toBe(true);
    expect(db.demand_pools).toHaveLength(1);
    expect(db.pool_members).toHaveLength(1);
    expect(db.pool_members[0]!.brief_id).toBe(briefId);
    // tracker event recorded
    expect(
      db.brief_tracker_events.some((e) => e.event_type === "pool_joined"),
    ).toBe(true);
  });

  it("clusters same template+state+month into ONE pool", async () => {
    const a = seedBrief();
    const b = seedBrief();
    await assignBriefToPool(a);
    await assignBriefToPool(b);
    expect(db.demand_pools).toHaveLength(1);
    expect(db.pool_members).toHaveLength(2);
  });

  it("separates different templates into different pools", async () => {
    const a = seedBrief({ brief_template: "smsf_accountant" });
    const b = seedBrief({ brief_template: "financial_adviser" });
    await assignBriefToPool(a);
    await assignBriefToPool(b);
    expect(db.demand_pools).toHaveLength(2);
  });

  it("is idempotent — re-running for an already-member brief does not double-insert", async () => {
    const briefId = seedBrief();
    await assignBriefToPool(briefId);
    const res2 = await assignBriefToPool(briefId);
    expect(res2.assigned).toBe(false);
    expect(res2.reason).toBe("already_member");
    expect(db.pool_members).toHaveLength(1);
  });

  it("rolls over to a fresh pool instance when max_size is reached", async () => {
    // Seed a full pool (max_size 2) for this cluster, then assign one more.
    const fullPool = {
      id: nextId(),
      template_key: "smsf_accountant",
      state: "NSW",
      period: "2026-06",
      status: "forming",
      min_size: 3,
      max_size: 2,
    };
    db.demand_pools.push(fullPool);
    // Two existing members → at capacity.
    db.pool_members.push(
      { id: nextId(), pool_id: fullPool.id, brief_id: 1, consumer_email: "x@x.com", status: "joined" },
      { id: nextId(), pool_id: fullPool.id, brief_id: 2, consumer_email: "y@y.com", status: "joined" },
    );

    // Use a fixed clock so the base period matches the seeded pool.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    const briefId = seedBrief();
    const res = await assignBriefToPool(briefId);
    vi.useRealTimers();

    expect(res.assigned).toBe(true);
    // A new (overflow) pool instance was created — distinct from the full one.
    expect(res.poolId).not.toBe(fullPool.id);
    expect(db.demand_pools.length).toBe(2);
    const overflow = db.demand_pools.find((p) => p.id === res.poolId)!;
    expect(String(overflow.period)).toMatch(/^2026-06#2$/);
  });
});

// ── Group offers — one per adviser per pool ────────────────────────────────

describe("submitPoolOffer", () => {
  async function seedPoolWithMembers(): Promise<number> {
    const briefId = seedBrief();
    await assignBriefToPool(briefId);
    return db.pool_members[0]!.pool_id as number;
  }

  it("records an offer and flips the pool to 'offered'", async () => {
    const poolId = await seedPoolWithMembers();
    const res = await submitPoolOffer({ poolId, professionalId: 77, body: "We can help" });
    expect(res.ok).toBe(true);
    expect(db.pool_offers).toHaveLength(1);
    const pool = db.demand_pools.find((p) => p.id === poolId)!;
    expect(pool.status).toBe("offered");
  });

  it("refuses a second offer from the same adviser on the same pool", async () => {
    const poolId = await seedPoolWithMembers();
    await submitPoolOffer({ poolId, professionalId: 77, body: "first" });
    const res2 = await submitPoolOffer({ poolId, professionalId: 77, body: "second" });
    expect(res2.ok).toBe(false);
    expect(res2.ok === false && res2.reason).toBe("already_offered");
    expect(db.pool_offers).toHaveLength(1);
  });

  it("rejects an empty or oversized body", async () => {
    const poolId = await seedPoolWithMembers();
    const empty = await submitPoolOffer({ poolId, professionalId: 1, body: "   " });
    expect(empty.ok === false && empty.reason).toBe("invalid");
    const huge = await submitPoolOffer({ poolId, professionalId: 1, body: "x".repeat(501) });
    expect(huge.ok === false && huge.reason).toBe("invalid");
  });

  it("404-equivalents when the flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await submitPoolOffer({ poolId: 1, professionalId: 1, body: "hi" });
    expect(res.ok === false && res.reason).toBe("flag_off");
  });
});

// ── Member accept — established money path + discount ──────────────────────

describe("acceptPoolOffer", () => {
  async function setupOffer(): Promise<{ briefId: number; offerId: number; email: string }> {
    const briefId = seedBrief();
    await assignBriefToPool(briefId);
    const poolId = db.pool_members[0]!.pool_id as number;
    db.professionals.push({ id: 77, name: "Pat Adviser", email: "pat@pro.com", firm_id: null });
    const offer = {
      id: nextId(),
      pool_id: poolId,
      professional_id: 77,
      body: "We can help",
      package_rate_band: "$2,500–$5,000",
      status: "active",
      created_at: "2026-06-11T00:00:00Z",
    };
    db.pool_offers.push(offer);
    const email = db.advisor_auctions.find((b) => b.id === briefId)!.contact_email as string;
    return { briefId, offerId: offer.id, email };
  }

  it("debits the adviser via acceptBrief at the 25% discounted cost", async () => {
    const { briefId, offerId, email } = await setupOffer();
    mockGetAcceptCost.mockResolvedValue(4); // base 4 → discounted 3
    mockAcceptBrief.mockResolvedValue({
      accepted: true,
      brief: { id: briefId },
      creditsSpent: 3,
      balanceAfterCents: 100,
    });

    const res = await acceptPoolOffer({ briefId, offerId, consumerEmail: email });
    expect(res.ok).toBe(true);
    expect(res.ok === true && res.creditsCharged).toBe(3);
    // The established path was used with a costOverride of the discounted cost.
    expect(mockAcceptBrief).toHaveBeenCalledWith(
      expect.objectContaining({ briefId, professionalId: 77, costOverride: 3 }),
    );
    // Member marked accepted.
    expect(db.pool_members[0]!.status).toBe("accepted");
    // Consumer acceptance notification fired (chat opens via the standard path).
    expect(mockNotifyConsumer).toHaveBeenCalled();
  });

  it("verifies email-as-key — a mismatched email is rejected and nothing is charged", async () => {
    const { briefId, offerId } = await setupOffer();
    const res = await acceptPoolOffer({
      briefId,
      offerId,
      consumerEmail: "attacker@evil.com",
    });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.reason).toBe("email_mismatch");
    expect(mockAcceptBrief).not.toHaveBeenCalled();
  });

  it("surfaces insufficient_credits from the money path without marking accepted", async () => {
    const { briefId, offerId, email } = await setupOffer();
    mockAcceptBrief.mockResolvedValue({ accepted: false, reason: "insufficient_credits" });
    const res = await acceptPoolOffer({ briefId, offerId, consumerEmail: email });
    expect(res.ok === false && res.reason).toBe("insufficient_credits");
    expect(db.pool_members[0]!.status).toBe("joined");
  });

  it("is a no-op when the flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await acceptPoolOffer({ briefId: 1, offerId: 1, consumerEmail: "x@x.com" });
    expect(res.ok === false && res.reason).toBe("flag_off");
    expect(mockAcceptBrief).not.toHaveBeenCalled();
  });
});

// ── Decline isolation — no money moves ─────────────────────────────────────

describe("declinePoolOffer", () => {
  it("marks the member 'left' and charges nothing", async () => {
    const briefId = seedBrief();
    await assignBriefToPool(briefId);
    const email = db.advisor_auctions.find((b) => b.id === briefId)!.contact_email as string;

    const res = await declinePoolOffer({ briefId, consumerEmail: email });
    expect(res.ok).toBe(true);
    expect(db.pool_members[0]!.status).toBe("left");
    expect(mockAcceptBrief).not.toHaveBeenCalled();
    expect(
      db.brief_tracker_events.some((e) => e.event_type === "pool_left"),
    ).toBe(true);
  });

  it("rejects a declining email that doesn't match the member", async () => {
    const briefId = seedBrief();
    await assignBriefToPool(briefId);
    const res = await declinePoolOffer({ briefId, consumerEmail: "nope@x.com" });
    expect(res.ok === false && res.reason).toBe("email_mismatch");
    expect(db.pool_members[0]!.status).toBe("joined");
  });
});
