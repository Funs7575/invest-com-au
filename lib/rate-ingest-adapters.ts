/**
 * Rate-ingest source adapters.
 *
 * Each adapter implements RateSourceAdapter<T> from lib/rate-ingest.ts.
 * The pattern is:
 *   - Check for a credential env-var.
 *   - If present → attempt a real external fetch and return rows + source="partner_feed".
 *   - If absent  → fall back to the admin-imported DB rows and return source="admin_db".
 *
 * This makes every cron mergeable TODAY (admin DB data is real, not fabricated)
 * while leaving a clean seam for future feed credentials.
 *
 * Service-role DB access is correct here:
 *   - investment_loan_rates has deny-all anon/auth write policies; service_role
 *     is required for reads inside server-side crons (no user JWT available).
 *   - savings_rate_snapshots has a public anon SELECT policy but we query from a
 *     server-side cron where there is no user JWT — using admin client is the
 *     documented pattern for anonymous-path reads with no user context.
 *
 * Nothing here fabricates rate values. All rows originate from either:
 *   a) The admin-imported DB (manually verified by a human), or
 *   b) A credentialed external feed (not yet live; structure is ready).
 */

// eslint-disable-next-line no-restricted-imports -- cron fallback reads: no user JWT available; admin client is required (see CLAUDE.md "Two Supabase clients")
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { RateSourceAdapter, AdapterResult, LoanRateRow, SavingsRateRow } from "./rate-ingest";

const log = logger("rate-ingest-adapters");

// ─── Loan-rate adapters ───────────────────────────────────────────────────────

/**
 * DB fallback: read all current loan-rate rows from investment_loan_rates.
 * Returns source="admin_db" and the rate rows as LoanRateRow objects.
 *
 * Used when LOAN_RATE_FEED_API_KEY is not set.
 */
export class LoanRateDbAdapter implements RateSourceAdapter<LoanRateRow> {
  async fetch(): Promise<AdapterResult<LoanRateRow>> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("investment_loan_rates")
        .select(
          "lender_slug, lender_name, rate_pct, comparison_rate_pct, max_lvr, interest_only, offset_available, min_loan_cents, apply_url",
        )
        .order("rate_pct", { ascending: true });

      if (error) {
        log.warn("LoanRateDbAdapter: DB read failed, returning empty", { error: error.message });
        return { rows: [], source: "admin_db" };
      }

      const rows: LoanRateRow[] = (data ?? []).map((r) => ({
        lender_slug: r.lender_slug as string,
        lender_name: r.lender_name as string,
        rate_pct: r.rate_pct as number,
        comparison_rate_pct: r.comparison_rate_pct as number,
        max_lvr: r.max_lvr as number,
        interest_only: r.interest_only as boolean,
        offset_available: r.offset_available as boolean,
        min_loan_cents: r.min_loan_cents as number,
        apply_url: r.apply_url as string,
      }));

      return { rows, source: "admin_db" };
    } catch (err) {
      log.warn("LoanRateDbAdapter: unexpected error, returning empty", {
        error: err instanceof Error ? err.message : String(err),
      });
      return { rows: [], source: "admin_db" };
    }
  }
}

/**
 * Partner-feed adapter for loan rates.
 *
 * Reads from LOAN_RATE_FEED_URL using LOAN_RATE_FEED_API_KEY.
 * Expected response shape: `{ rates: LoanRateRow[] }`.
 *
 * This is the structural seam for a future commercial agreement.
 * It never fabricates values — if the feed is unreachable it returns [].
 * The cron will then fall back to the DB adapter automatically.
 *
 * To activate: set both LOAN_RATE_FEED_URL and LOAN_RATE_FEED_API_KEY
 * in your Vercel environment. The cron selects this adapter automatically.
 */
export class LoanRateFeedAdapter implements RateSourceAdapter<LoanRateRow> {
  constructor(
    private readonly feedUrl: string,
    private readonly apiKey: string,
  ) {}

  async fetch(): Promise<AdapterResult<LoanRateRow>> {
    try {
      const resp = await fetch(this.feedUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "User-Agent": "InvestComAu-RateIngest/1.0",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!resp.ok) {
        log.warn("LoanRateFeedAdapter: non-OK response", { status: resp.status, url: this.feedUrl });
        return { rows: [], source: "partner_feed" };
      }

      const json = (await resp.json()) as { rates?: Partial<LoanRateRow>[] };
      const rawRows: Partial<LoanRateRow>[] = Array.isArray(json.rates) ? json.rates : [];
      // Validation is the caller's responsibility (cron uses validateLoanRateRows).
      const rows = rawRows as LoanRateRow[];
      return { rows, source: "partner_feed" };
    } catch (err) {
      log.warn("LoanRateFeedAdapter: fetch failed, returning empty", {
        error: err instanceof Error ? err.message : String(err),
      });
      return { rows: [], source: "partner_feed" };
    }
  }
}

/**
 * Select the appropriate loan-rate adapter based on env-vars.
 *
 * Logic:
 *   - LOAN_RATE_FEED_URL + LOAN_RATE_FEED_API_KEY both set → LoanRateFeedAdapter
 *   - Otherwise → LoanRateDbAdapter (uses admin-imported DB rows)
 */
export function selectLoanRateAdapter(): { adapter: RateSourceAdapter<LoanRateRow>; credentialed: boolean } {
  const feedUrl = process.env.LOAN_RATE_FEED_URL;
  const apiKey = process.env.LOAN_RATE_FEED_API_KEY;

  if (feedUrl && apiKey) {
    log.info("LoanRate: using partner feed adapter", { url: feedUrl });
    return { adapter: new LoanRateFeedAdapter(feedUrl, apiKey), credentialed: true };
  }

  log.info("LoanRate: no feed credentials — using DB fallback adapter");
  return { adapter: new LoanRateDbAdapter(), credentialed: false };
}

// ─── Savings-rate adapters ────────────────────────────────────────────────────

/**
 * DB fallback: read the most-recent savings-rate snapshots from the DB.
 * Returns source="admin_db".
 *
 * Reads up to the 500 most-recent rows (same cap as the rate-alerts cron).
 * Used when SAVINGS_RATE_FEED_API_KEY is not set.
 */
export class SavingsRateDbAdapter implements RateSourceAdapter<SavingsRateRow> {
  async fetch(): Promise<AdapterResult<SavingsRateRow>> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("savings_rate_snapshots")
        .select(
          "broker_id, product_kind, rate_bps, intro_rate_bps, intro_term_months, min_balance_cents, max_balance_cents, term_months, source, notes",
        )
        .order("captured_at", { ascending: false })
        .limit(500);

      if (error) {
        log.warn("SavingsRateDbAdapter: DB read failed, returning empty", { error: error.message });
        return { rows: [], source: "admin_db" };
      }

      const rows: SavingsRateRow[] = (data ?? []).map((r) => ({
        broker_id: r.broker_id as number,
        product_kind: r.product_kind as "savings_account" | "term_deposit",
        rate_bps: r.rate_bps as number,
        intro_rate_bps: r.intro_rate_bps as number | null,
        intro_term_months: r.intro_term_months as number | null,
        min_balance_cents: r.min_balance_cents as number,
        max_balance_cents: r.max_balance_cents as number | null,
        term_months: r.term_months as number | null,
        source: r.source as "manual" | "scraped" | "partner_feed",
        notes: r.notes as string,
      }));

      return { rows, source: "admin_db" };
    } catch (err) {
      log.warn("SavingsRateDbAdapter: unexpected error, returning empty", {
        error: err instanceof Error ? err.message : String(err),
      });
      return { rows: [], source: "admin_db" };
    }
  }
}

/**
 * Partner-feed adapter for savings rates.
 *
 * Reads from SAVINGS_RATE_FEED_URL using SAVINGS_RATE_FEED_API_KEY.
 * Expected response shape: `{ snapshots: SavingsRateRow[] }`.
 *
 * Structural seam for a future commercial data-feed agreement.
 * Falls back cleanly if the feed is unreachable.
 *
 * To activate: set both SAVINGS_RATE_FEED_URL and SAVINGS_RATE_FEED_API_KEY
 * in your Vercel environment.
 */
export class SavingsRateFeedAdapter implements RateSourceAdapter<SavingsRateRow> {
  constructor(
    private readonly feedUrl: string,
    private readonly apiKey: string,
  ) {}

  async fetch(): Promise<AdapterResult<SavingsRateRow>> {
    try {
      const resp = await fetch(this.feedUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "User-Agent": "InvestComAu-RateIngest/1.0",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!resp.ok) {
        log.warn("SavingsRateFeedAdapter: non-OK response", { status: resp.status, url: this.feedUrl });
        return { rows: [], source: "partner_feed" };
      }

      const json = (await resp.json()) as { snapshots?: Partial<SavingsRateRow>[] };
      const rawRows: Partial<SavingsRateRow>[] = Array.isArray(json.snapshots) ? json.snapshots : [];
      const rows = rawRows as SavingsRateRow[];
      return { rows, source: "partner_feed" };
    } catch (err) {
      log.warn("SavingsRateFeedAdapter: fetch failed, returning empty", {
        error: err instanceof Error ? err.message : String(err),
      });
      return { rows: [], source: "partner_feed" };
    }
  }
}

/**
 * Select the appropriate savings-rate adapter based on env-vars.
 */
export function selectSavingsRateAdapter(): { adapter: RateSourceAdapter<SavingsRateRow>; credentialed: boolean } {
  const feedUrl = process.env.SAVINGS_RATE_FEED_URL;
  const apiKey = process.env.SAVINGS_RATE_FEED_API_KEY;

  if (feedUrl && apiKey) {
    log.info("SavingsRate: using partner feed adapter", { url: feedUrl });
    return { adapter: new SavingsRateFeedAdapter(feedUrl, apiKey), credentialed: true };
  }

  log.info("SavingsRate: no feed credentials — using DB fallback adapter");
  return { adapter: new SavingsRateDbAdapter(), credentialed: false };
}
