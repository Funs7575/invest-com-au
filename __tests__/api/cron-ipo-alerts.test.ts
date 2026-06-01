/**
 * Tests for the ipo-alerts cron route.
 *
 * Covered paths:
 *   - requireCronAuth gate (401 / 500)
 *   - ipoErr on ipo_offers query → 500
 *   - no IPOs → 200 "No IPO alerts to send today"
 *   - IPOs present but none trigger today → 200 "No alert triggers matched today"
 *   - triggered IPOs but no watchlist subscribers → 200
 *   - happy path: sends email + inserts ipo_alert_sends for each (user, ipo, alertType)
 *   - dedup: already-sent triplets are skipped
 *   - sendEmail error → warning logged, send skipped (not counted)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, error: undefined })),
}));

/**
 * Chainable Supabase builder. Every method returns `this`; `.then` makes it
 * a thenable so `await builder` resolves with the provided result.
 */
function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps", "throwOnError",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn<(table: string) => Record<string, unknown>>(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ─── Import route after mocks ─────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/ipo-alerts/route";
import { sendEmail } from "@/lib/resend";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/ipo-alerts", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

/** A minimal IpoOffer that triggers an "open" alert today. */
function makeIpoOpen() {
  return {
    id: 101,
    asx_code: "TST",
    company_name: "Test Corp",
    sector: "Technology",
    offer_open_date: todayIso(),
    offer_close_date: null,
    listing_date: null,
    prospectus_url: "https://example.com/prospectus.pdf",
    issue_price_cents: 200,
    amount_raised_cents: 50_000_000 * 100, // $50M in cents
  };
}

/** A watchlist subscriber for the IPO. */
function makeWatchlistRow(userId = "user-1", ipoId = 101, alertType = "open") {
  return { user_id: userId, ipo_id: ipoId, alert_type: alertType };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/ipo-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.unstubAllEnvs();
  });

  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrongsecret" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 when ipo_offers query errors", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // cron_run_log insert — succeed silently
        return makeBuilder({ data: { id: "run-1" }, error: null });
      }
      // ipo_offers error
      return makeBuilder({ data: null, error: { message: "table missing" } });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 200 when no IPOs are returned", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no ipo alerts/i);
  });

  it("returns 200 when IPOs exist but none match trigger dates", async () => {
    // IPO with dates neither today nor tomorrow
    const pastIpo = {
      id: 200,
      asx_code: "OLD",
      company_name: "Old Corp",
      sector: "Finance",
      offer_open_date: "2020-01-01",
      offer_close_date: "2020-01-15",
      listing_date: "2020-01-20",
      prospectus_url: null,
      issue_price_cents: 100,
      amount_raised_cents: null,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [pastIpo], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no alert triggers/i);
  });

  it("returns 200 when triggered IPOs have no watchlist subscribers", async () => {
    const ipo = makeIpoOpen();

    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [ipo], error: null });
      }
      if (table === "ipo_watchlist") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no subscribers/i);
  });

  it("happy path: sends email and inserts ipo_alert_sends record", async () => {
    const ipo = makeIpoOpen();
    const sub = makeWatchlistRow("user-1", ipo.id, "open");
    let insertCalled = false;

    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [ipo], error: null });
      }
      if (table === "ipo_watchlist") {
        return makeBuilder({ data: [sub], error: null });
      }
      if (table === "ipo_alert_sends") {
        // First call: load existing sends (dedup) — empty
        // Subsequent calls: insert new send record
        const builder = makeBuilder({ data: [], error: null });
        (builder as Record<string, unknown>).insert = vi.fn(() => {
          insertCalled = true;
          // Route chains .throwOnError() after insert
          return {
            throwOnError: vi.fn(() => Promise.resolve({ error: null })),
          };
        });
        return builder;
      }
      if (table === "auth.users") {
        return makeBuilder({
          data: [{ id: "user-1", email: "user1@example.com" }],
          error: null,
        });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user1@example.com",
        from: expect.stringContaining("alerts@invest.com.au"),
      }),
    );
    expect(insertCalled).toBe(true);
  });

  it("skips already-sent (user, ipo, alertType) triplets", async () => {
    const ipo = makeIpoOpen();
    const sub = makeWatchlistRow("user-1", ipo.id, "open");

    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [ipo], error: null });
      }
      if (table === "ipo_watchlist") {
        return makeBuilder({ data: [sub], error: null });
      }
      if (table === "ipo_alert_sends") {
        // Report the triplet as already sent → sentSet contains it
        return makeBuilder({
          data: [{ user_id: "user-1", ipo_id: ipo.id, alert_type: "open" }],
          error: null,
        });
      }
      if (table === "auth.users") {
        return makeBuilder({
          data: [{ id: "user-1", email: "user1@example.com" }],
          error: null,
        });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips user with no email in auth.users", async () => {
    const ipo = makeIpoOpen();
    const sub = makeWatchlistRow("user-no-email", ipo.id, "open");

    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [ipo], error: null });
      }
      if (table === "ipo_watchlist") {
        return makeBuilder({ data: [sub], error: null });
      }
      if (table === "ipo_alert_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "auth.users") {
        // No email for this user
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("logs warning and continues when sendEmail returns an error", async () => {
    const ipo = makeIpoOpen();
    const sub = makeWatchlistRow("user-1", ipo.id, "open");

    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [ipo], error: null });
      }
      if (table === "ipo_watchlist") {
        return makeBuilder({ data: [sub], error: null });
      }
      if (table === "ipo_alert_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "auth.users") {
        return makeBuilder({
          data: [{ id: "user-1", email: "user1@example.com" }],
          error: null,
        });
      }
      return makeBuilder({ data: null, error: null });
    });

    // sendEmail returns a string error — route should warn and continue (not throw)
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "rejected" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // Route skips on sendErr (continue) — sent stays 0
    expect(body.sent).toBe(0);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("triggers prospectus alert when offer_open_date is tomorrow and prospectus_url set", async () => {
    const ipo = {
      id: 301,
      asx_code: "PROS",
      company_name: "Prospectus Corp",
      sector: "Mining",
      offer_open_date: tomorrowIso(), // tomorrow → prospectus alert
      offer_close_date: null,
      listing_date: null,
      prospectus_url: "https://example.com/prospectus.pdf",
      issue_price_cents: 150,
      amount_raised_cents: null,
    };
    const sub = makeWatchlistRow("user-pros", ipo.id, "prospectus");

    mockFrom.mockImplementation((table: string) => {
      if (table === "ipo_offers") {
        return makeBuilder({ data: [ipo], error: null });
      }
      if (table === "ipo_watchlist") {
        return makeBuilder({ data: [sub], error: null });
      }
      if (table === "ipo_alert_sends") {
        const builder = makeBuilder({ data: [], error: null });
        (builder as Record<string, unknown>).insert = vi.fn(() => ({
          throwOnError: vi.fn(() => Promise.resolve({ error: null })),
        }));
        return builder;
      }
      if (table === "auth.users") {
        return makeBuilder({
          data: [{ id: "user-pros", email: "pros@example.com" }],
          error: null,
        });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true, error: undefined });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("tomorrow"),
      }),
    );
  });
});
