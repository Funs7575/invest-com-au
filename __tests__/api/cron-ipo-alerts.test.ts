import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args),
}));

// withCronRunLog is a pass-through: calls the handler and returns response.
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(
    async (_name: string, fn: () => Promise<{ response: unknown }>) => {
      const result = await fn();
      return result.response;
    },
  ),
}));

// sendEmail mock — controllable per-test
const mockSendEmail = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: unknown) => String(s ?? ""),
}));

// Chainable Supabase builder. The thenable resolves with {data, error}.
function makeChain(data: unknown = null, error: unknown = null) {
  const terminal = { data, error };
  const c: Record<string, unknown> = {
    then: (resolve: (v: typeof terminal) => unknown) =>
      Promise.resolve(resolve(terminal)),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps", "throwOnError",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

// mockFrom is the central `.from()` on the admin client.
// Each call can return a different chain via mockReturnValueOnce.
const mockFrom = vi.fn(() => makeChain());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/ipo-alerts/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/ipo-alerts") as unknown as NextRequest;
}

// Today and tomorrow as ISO date strings (route uses new Date()).
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

function makeIpo(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    asx_code: "TST",
    company_name: "Test Corp",
    sector: "Technology",
    offer_open_date: todayIso(),    // triggers "open" alert by default
    offer_close_date: null,
    listing_date: null,
    prospectus_url: null,
    issue_price_cents: 200,         // $2.00
    amount_raised_cents: 5_000_000, // $50 000 (sub-million)
    ...overrides,
  };
}

function makeWatchlistRow(overrides: Record<string, unknown> = {}) {
  return { user_id: "user-1", ipo_id: 1, alert_type: "open", ...overrides };
}

function makeUserRow(overrides: Record<string, unknown> = {}) {
  return { id: "user-1", email: "alice@example.com", ...overrides };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/ipo-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    // By default auth passes.
    mockRequireCronAuth.mockReturnValue(null);
    // By default email succeeds.
    mockSendEmail.mockResolvedValue({ ok: true });
  });

  // ── Static exports ──────────────────────────────────────────────────────────

  it("exports nodejs runtime and maxDuration=60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("returns 401 when requireCronAuth rejects", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ── DB error on IPO fetch ───────────────────────────────────────────────────

  it("returns 500 when ipo_offers query errors", async () => {
    // query 1: ipo_offers → error
    mockFrom.mockReturnValueOnce(
      makeChain(null, { message: "DB error" }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("fetch_failed");
  });

  // ── Empty IPO result ────────────────────────────────────────────────────────

  it("returns 200 with sent=0 when no IPOs found", async () => {
    // query 1: ipo_offers → empty
    mockFrom.mockReturnValueOnce(makeChain([], null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; message: string };
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/No IPO alerts/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── IPOs present but no alert triggers match today ─────────────────────────

  it("returns 200 with sent=0 when IPO dates don't match today", async () => {
    // IPO with dates in the far future — no trigger fires
    const farFuture = "2099-01-01";
    mockFrom.mockReturnValueOnce(
      makeChain([makeIpo({ offer_open_date: farFuture, offer_close_date: null, listing_date: null, prospectus_url: null })], null),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; message: string };
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/No alert triggers/i);
  });

  // ── No watchlist subscribers for triggered IPO ─────────────────────────────

  it("returns 200 with sent=0 when no subscribers on watchlist", async () => {
    // query 1: ipo_offers with open date = today → triggers "open"
    mockFrom.mockReturnValueOnce(makeChain([makeIpo()], null));
    // query 2: ipo_watchlist → empty
    mockFrom.mockReturnValueOnce(makeChain([], null));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; message: string };
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/No subscribers/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── Success: one subscriber, one email sent ─────────────────────────────────

  it("sends one email and returns sent=1 for a new subscriber", async () => {
    // query 1: ipo_offers
    mockFrom.mockReturnValueOnce(makeChain([makeIpo()], null));
    // query 2: ipo_watchlist
    mockFrom.mockReturnValueOnce(makeChain([makeWatchlistRow()], null));
    // query 3: ipo_alert_sends (existing sends) → empty (no prior sends)
    mockFrom.mockReturnValueOnce(makeChain([], null));
    // query 4: auth.users
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    // query 5: insert into ipo_alert_sends (throwOnError chain)
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        from: "Invest.com.au <alerts@invest.com.au>",
      }),
    );
  });

  // ── Dedup: already-sent alert is skipped ────────────────────────────────────

  it("skips user when already in ipo_alert_sends (dedup)", async () => {
    // query 1: ipo_offers
    mockFrom.mockReturnValueOnce(makeChain([makeIpo()], null));
    // query 2: ipo_watchlist
    mockFrom.mockReturnValueOnce(makeChain([makeWatchlistRow()], null));
    // query 3: existing sends → already has the send
    mockFrom.mockReturnValueOnce(
      makeChain([{ user_id: "user-1", ipo_id: 1, alert_type: "open" }], null),
    );
    // query 4: auth.users
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── User has no email record ────────────────────────────────────────────────

  it("skips subscriber with no email in auth.users", async () => {
    mockFrom.mockReturnValueOnce(makeChain([makeIpo()], null));
    mockFrom.mockReturnValueOnce(makeChain([makeWatchlistRow()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));      // no existing sends
    mockFrom.mockReturnValueOnce(makeChain([], null));      // no user rows returned

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // ── sendEmail fails → log and continue ─────────────────────────────────────

  it("continues past a failed sendEmail and does not increment sent", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "HTTP 500" });

    mockFrom.mockReturnValueOnce(makeChain([makeIpo()], null));
    mockFrom.mockReturnValueOnce(makeChain([makeWatchlistRow()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));      // no existing sends
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    // No insert call expected (send failed)

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(0);
  });

  // ── Multiple alert types: open + close trigger on same IPO ─────────────────

  it("sends two emails when an IPO triggers both open and close today", async () => {
    const today = todayIso();
    const ipo = makeIpo({ offer_open_date: today, offer_close_date: today });

    // Two subscribers — one for each alert type
    const watchlist = [
      makeWatchlistRow({ user_id: "user-1", alert_type: "open" }),
      makeWatchlistRow({ user_id: "user-2", alert_type: "close" }),
    ];
    const users = [
      makeUserRow({ id: "user-1", email: "alice@example.com" }),
      makeUserRow({ id: "user-2", email: "bob@example.com" }),
    ];

    mockFrom.mockReturnValueOnce(makeChain([ipo], null));          // ipo_offers
    mockFrom.mockReturnValueOnce(makeChain(watchlist, null));       // ipo_watchlist
    mockFrom.mockReturnValueOnce(makeChain([], null));              // ipo_alert_sends (empty)
    mockFrom.mockReturnValueOnce(makeChain(users, null));           // auth.users
    mockFrom.mockReturnValueOnce(makeChain(null, null));            // insert send 1
    mockFrom.mockReturnValueOnce(makeChain(null, null));            // insert send 2

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  // ── Prospectus alert: offer_open_date = tomorrow + prospectus_url set ───────

  it("fires prospectus alert when offer_open_date is tomorrow and prospectus_url is set", async () => {
    const ipo = makeIpo({
      offer_open_date: tomorrowIso(),
      offer_close_date: null,
      listing_date: null,
      prospectus_url: "https://example.com/prospectus.pdf",
    });

    mockFrom.mockReturnValueOnce(makeChain([ipo], null));
    mockFrom.mockReturnValueOnce(
      makeChain([makeWatchlistRow({ alert_type: "prospectus" })], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([], null));    // no existing sends
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));  // insert

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    // Subject should mention tomorrow
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/tomorrow/i),
      }),
    );
  });

  // ── Email subject contains company name ────────────────────────────────────

  it("builds email with company name in subject for open alert", async () => {
    mockFrom.mockReturnValueOnce(
      makeChain([makeIpo({ company_name: "ACME Ltd", asx_code: "ACM" })], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([makeWatchlistRow()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    await GET(makeReq());

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("ACME Ltd"),
      }),
    );
  });

  // ── IPO without asx_code or sector ─────────────────────────────────────────

  it("handles IPO with null asx_code and null sector gracefully", async () => {
    mockFrom.mockReturnValueOnce(
      makeChain([makeIpo({ asx_code: null, sector: null })], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([makeWatchlistRow()], null));
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
  });

  // ── Listing alert ───────────────────────────────────────────────────────────

  it("fires listing alert when listing_date = today", async () => {
    const ipo = makeIpo({
      offer_open_date: null,
      offer_close_date: null,
      listing_date: todayIso(),
    });

    mockFrom.mockReturnValueOnce(makeChain([ipo], null));
    mockFrom.mockReturnValueOnce(
      makeChain([makeWatchlistRow({ alert_type: "listing" })], null),
    );
    mockFrom.mockReturnValueOnce(makeChain([], null));
    mockFrom.mockReturnValueOnce(makeChain([makeUserRow()], null));
    mockFrom.mockReturnValueOnce(makeChain(null, null));

    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringMatching(/lists on/i),
      }),
    );
  });
});
