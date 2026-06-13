import { describe, it, expect, beforeEach, vi } from "vitest";

// Hoisted mocks (vi.mock factories run before module init — see CLAUDE.md).
const { mockRequireCronAuth, mockSendEmail, scenario } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(),
  mockSendEmail: vi.fn().mockResolvedValue(undefined),
  scenario: {
    expired: [] as Record<string, unknown>[],
    bidsByAuction: {} as Record<string, Record<string, unknown>[]>,
    advisorsById: {} as Record<string, { name: string; email: string } | null>,
    // Simulate the atomic claim: [{id}] = this run won the open→awarded flip,
    // [] = a concurrent run already claimed it.
    awardClaim: (() => [{ id: 1 }]) as (auctionId: unknown) => { id: number }[],
    awardUpdates: [] as { id: unknown; guarded: boolean }[],
    expireUpdates: [] as { id: unknown; guarded: boolean }[],
    // Idea #11 — bids that had revealed_at stamped (auction id), and the
    // separate "settle expired final rounds" query result (+ optional error to
    // simulate the columns being absent / dormant).
    revealStamps: [] as unknown[],
    finalRoundExpired: [] as Record<string, unknown>[],
    finalRoundError: null as { message: string } | null,
  },
}));

vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: mockRequireCronAuth }));
vi.mock("@/lib/resend", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
vi.mock("@/lib/seo", () => ({ SITE_URL: "https://invest.com.au" }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (t: string) => new QB(t) }) }));

// Minimal thenable Supabase query-builder mock that routes results by
// table + operation (matches the chains the route actually issues).
class QB {
  private op: "select" | "update" = "select";
  private payload: Record<string, unknown> | null = null;
  private eqs: Record<string, unknown> = {};
  private isNullCols: string[] = [];
  private notNullCols: string[] = [];
  constructor(private table: string) {}
  select() { return this; }
  update(p: Record<string, unknown>) { this.op = "update"; this.payload = p; return this; }
  eq(c: string, v: unknown) { this.eqs[c] = v; return this; }
  lt() { return this; }
  in() { return this; }
  order() { return this; }
  is(c: string, _v: unknown) { this.isNullCols.push(c); return this; }
  not(c: string, _op: string, _v: unknown) { this.notNullCols.push(c); return this; }
  limit() { return this.resolve(); }
  single() { return this.resolve(); }
  maybeSingle() { return this.resolve(); }
  then(onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
    return this.resolve().then(onF, onR);
  }
  private resolve(): Promise<{ data: unknown; error: { message: string } | null }> {
    const guarded = this.eqs["status"] === "open";
    if (this.op === "update") {
      if (this.table === "advisor_auctions" && this.payload?.status === "awarded") {
        scenario.awardUpdates.push({ id: this.eqs["id"], guarded });
        return Promise.resolve({ data: scenario.awardClaim(this.eqs["id"]), error: null });
      }
      if (this.table === "advisor_auctions" && this.payload?.status === "expired") {
        scenario.expireUpdates.push({ id: this.eqs["id"], guarded });
      }
      // Idea #11 — reveal stamp: update advisor_auction_bids set revealed_at
      // where revealed_at is null. Record the auction id it targeted.
      if (this.table === "advisor_auction_bids" && this.payload?.revealed_at) {
        scenario.revealStamps.push(this.eqs["auction_id"]);
      }
      return Promise.resolve({ data: null, error: null });
    }
    // Idea #11 — the "settle expired final rounds" select is the only
    // advisor_auctions read scoped to source=public_job.
    if (this.table === "advisor_auctions" && this.eqs["source"] === "public_job") {
      return Promise.resolve({ data: scenario.finalRoundExpired, error: scenario.finalRoundError });
    }
    if (this.table === "advisor_auctions") return Promise.resolve({ data: scenario.expired, error: null });
    if (this.table === "advisor_auction_bids")
      return Promise.resolve({ data: scenario.bidsByAuction[String(this.eqs["auction_id"])] ?? [], error: null });
    if (this.table === "professionals")
      return Promise.resolve({ data: scenario.advisorsById[String(this.eqs["id"])] ?? null, error: null });
    return Promise.resolve({ data: null, error: null });
  }
}

import { GET } from "@/app/api/cron/auction-close/route";

const req = () => ({}) as never;

describe("GET /api/cron/auction-close", () => {
  beforeEach(() => {
    mockRequireCronAuth.mockReset();
    mockSendEmail.mockClear();
    scenario.expired = [];
    scenario.bidsByAuction = {};
    scenario.advisorsById = {};
    scenario.awardClaim = () => [{ id: 1 }];
    scenario.awardUpdates = [];
    scenario.expireUpdates = [];
    scenario.revealStamps = [];
    scenario.finalRoundExpired = [];
    scenario.finalRoundError = null;
  });

  it("returns the cron-auth rejection and does no work when unauthorized", async () => {
    const rejection = new Response("unauthorized", { status: 401 });
    mockRequireCronAuth.mockReturnValue(rejection);
    const out = await GET(req());
    expect(out).toBe(rejection);
    expect(scenario.awardUpdates).toHaveLength(0);
  });

  it("awards the highest active bid and emails advisor + consumer", async () => {
    mockRequireCronAuth.mockReturnValue(null);
    scenario.expired = [
      { id: 7, lead_type: "smsf", location: "Sydney NSW", contact_name: "Jo Client", contact_email: "jo@x.com", contact_phone: "0400000000", slug: "a7" },
    ];
    scenario.bidsByAuction = {
      7: [
        { id: 11, advisor_id: 99, bid_amount: 5000 },
        { id: 12, advisor_id: 88, bid_amount: 3000 },
      ],
    };
    scenario.advisorsById = { 99: { name: "Adv One", email: "adv@x.com" } };

    const out = (await GET(req())) as Response;
    const body = await out.json();
    expect(body.awarded).toBe(1);
    // The award flip used the status='open' concurrency guard.
    expect(scenario.awardUpdates).toEqual([{ id: 7, guarded: true }]);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("does NOT email when a concurrent run already claimed the auction", async () => {
    mockRequireCronAuth.mockReturnValue(null);
    scenario.expired = [
      { id: 7, lead_type: "smsf", location: null, contact_name: "Jo", contact_email: "jo@x.com", contact_phone: null, slug: "a7" },
    ];
    scenario.bidsByAuction = { 7: [{ id: 11, advisor_id: 99, bid_amount: 5000 }] };
    scenario.advisorsById = { 99: { name: "Adv One", email: "adv@x.com" } };
    scenario.awardClaim = () => []; // lost the race: 0 rows flipped

    const out = (await GET(req())) as Response;
    const body = await out.json();
    expect(body.awarded).toBe(0);
    expect(scenario.awardUpdates).toEqual([{ id: 7, guarded: true }]);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("expires zero-bid auctions with the open guard and sends no email", async () => {
    mockRequireCronAuth.mockReturnValue(null);
    scenario.expired = [
      { id: 9, lead_type: "tax", location: null, contact_name: "X", contact_email: "x@x.com", contact_phone: null, slug: "a9" },
    ];
    scenario.bidsByAuction = { 9: [] };

    const out = (await GET(req())) as Response;
    const body = await out.json();
    expect(body.expired).toBe(1);
    expect(scenario.expireUpdates).toEqual([{ id: 9, guarded: true }]);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── Idea #11 — sealed reveal + final-round settlement ──────────────────

  it("stamps revealed_at on bids when AWARDING an auction (sealed reveal)", async () => {
    mockRequireCronAuth.mockReturnValue(null);
    scenario.expired = [
      { id: 7, lead_type: "smsf", location: null, contact_name: "Jo", contact_email: "jo@x.com", contact_phone: null, slug: "a7" },
    ];
    scenario.bidsByAuction = { 7: [{ id: 11, advisor_id: 99, bid_amount: 5000 }] };
    scenario.advisorsById = { 99: { name: "Adv One", email: "adv@x.com" } };

    await GET(req());
    expect(scenario.revealStamps).toContain(7);
  });

  it("stamps revealed_at on bids when EXPIRING a zero-bid auction", async () => {
    mockRequireCronAuth.mockReturnValue(null);
    scenario.expired = [
      { id: 9, lead_type: "tax", location: null, contact_name: "X", contact_email: "x@x.com", contact_phone: null, slug: "a9" },
    ];
    scenario.bidsByAuction = { 9: [] };

    await GET(req());
    expect(scenario.revealStamps).toContain(9);
  });

  it("settles elapsed final rounds without auto-awarding them", async () => {
    mockRequireCronAuth.mockReturnValue(null);
    // No expired main auctions; just two public quotes with elapsed final rounds.
    scenario.expired = [];
    scenario.finalRoundExpired = [
      { id: 21, slug: "fr-21" },
      { id: 22, slug: "fr-22" },
    ];

    const out = (await GET(req())) as Response;
    const body = await out.json();
    expect(body.finalRoundsSettled).toBe(2);
    // Settlement is non-destructive — no award/expire writes fired for them.
    expect(scenario.awardUpdates).toHaveLength(0);
    expect(scenario.expireUpdates).toHaveLength(0);
  });

  it("is fail-soft when the final_round columns are absent (query errors)", async () => {
    mockRequireCronAuth.mockReturnValue(null);
    scenario.expired = [];
    scenario.finalRoundError = { message: 'column "final_round_started_at" does not exist' };

    const out = (await GET(req())) as Response;
    const body = await out.json();
    // Cron still succeeds; settlement count is simply 0.
    expect(out.status).toBe(200);
    expect(body.finalRoundsSettled).toBe(0);
  });
});
