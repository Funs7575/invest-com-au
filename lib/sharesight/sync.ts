/**
 * Sharesight sync orchestrator.
 *
 * One entry point: `syncSharesightHoldings({ supabase, userId })`.
 *
 *   1. Load the OAuth connection row from `investor_oauth_connections`
 *      (provider='sharesight'). 404-equivalent if none exists.
 *   2. Decrypt the stored tokens. Refresh if `expires_at` is past (or
 *      within the 60s skew buffer that `isTokenExpired` applies).
 *   3. Fetch the user's portfolios → first portfolio's holdings. (We only
 *      sync the user's first portfolio for v1 — Sharesight's API returns
 *      portfolios in user-chosen order; multi-portfolio support is a
 *      follow-up once we see real usage. Founder can change which
 *      portfolio syncs by reordering in Sharesight.)
 *   4. Transform → ParsedHoldingRow[].
 *   5. Dedup against existing `investor_holdings` for this user where
 *      `broker_slug='sharesight'`. The dedup key is the tuple
 *      (ticker, exchange, acquired_at, shares) — anything matching an
 *      existing row is skipped. Resilient to repeated syncs and to a
 *      user manually editing a single sharesight-sourced row.
 *   6. Bulk-insert the remaining rows.
 *   7. Stamp `last_synced_at` / `last_sync_error` on the connection row.
 *
 * Errors from steps 3 / 4 / 6 are surfaced to the route, NOT swallowed —
 * the UI shows them in the same shape the CSV import surfaces parse
 * errors.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { ParsedHoldingRow } from "@/lib/holdings/csv-import";
import {
  decryptToken,
  encryptToken,
} from "./token-crypto";
import {
  computeExpiresAt,
  getSharesightConfig,
  isTokenExpired,
  refreshAccessToken,
  type SharesightConfig,
} from "./oauth";
import {
  SHARESIGHT_BROKER_SLUG,
  fetchHoldings,
  fetchPortfolios,
  transformHoldings,
  type SharesightImportError,
} from "./api";

const log = logger("sharesight:sync");

export const SHARESIGHT_PROVIDER = "sharesight";

export interface SharesightSyncResult {
  inserted: number;
  skippedAsDuplicate: number;
  errors: SharesightImportError[];
}

export interface SharesightSyncDeps {
  /** User-scoped Supabase client; RLS scopes everything to auth.uid(). */
  supabase: SupabaseClient;
  userId: string;
  /** Override the OAuth config (test seam). Defaults to env-derived config. */
  config?: SharesightConfig;
  /** Override fetch (test seam). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Override "now" (test seam) for token-expiry comparisons. */
  nowMs?: number;
  /** Force-pick a portfolio currency rather than querying. Sharesight does
   *  return per-portfolio currency on the portfolios endpoint but field
   *  naming varies across API versions; the route uses this only when the
   *  caller already knows. Default behaviour: read off the portfolio row
   *  (`currency_code` / `currency`) or fall back to AUD. */
  portfolioCurrencyOverride?: string;
}

export class SharesightSyncError extends Error {
  readonly code:
    | "not_connected"
    | "config_missing"
    | "refresh_failed"
    | "fetch_failed"
    | "insert_failed";
  constructor(
    code: SharesightSyncError["code"],
    message: string,
  ) {
    super(message);
    this.name = "SharesightSyncError";
    this.code = code;
  }
}

export async function syncSharesightHoldings(
  deps: SharesightSyncDeps,
): Promise<SharesightSyncResult> {
  const {
    supabase,
    userId,
    fetchImpl = fetch,
    nowMs = Date.now(),
    portfolioCurrencyOverride,
  } = deps;

  const config = deps.config ?? getSharesightConfig();
  if (!config) {
    throw new SharesightSyncError(
      "config_missing",
      "Sharesight OAuth is not configured (SHARESIGHT_CLIENT_ID / SHARESIGHT_CLIENT_SECRET / SHARESIGHT_REDIRECT_URI required)",
    );
  }

  const { data: connectionRow, error: connectionLoadError } = await supabase
    .from("investor_oauth_connections")
    .select(
      "id, access_token_enc, refresh_token_enc, expires_at, scope, external_account_id",
    )
    .eq("provider", SHARESIGHT_PROVIDER)
    .maybeSingle();
  if (connectionLoadError) {
    throw new SharesightSyncError(
      "not_connected",
      `Failed to read OAuth row: ${connectionLoadError.message}`,
    );
  }
  if (!connectionRow) {
    throw new SharesightSyncError(
      "not_connected",
      "No Sharesight connection — connect first.",
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(connectionRow.access_token_enc as string);
  } catch (err) {
    log.warn("sharesight access token decrypt failed", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    throw new SharesightSyncError(
      "refresh_failed",
      "Stored Sharesight token is corrupt — disconnect and reconnect.",
    );
  }

  const expiresAtIso = connectionRow.expires_at as string;
  const encryptedRefresh = connectionRow.refresh_token_enc as string | null;
  if (isTokenExpired(expiresAtIso, nowMs)) {
    if (!encryptedRefresh) {
      throw new SharesightSyncError(
        "refresh_failed",
        "Sharesight access token expired and no refresh token on file — reconnect.",
      );
    }
    let refreshToken: string;
    try {
      refreshToken = decryptToken(encryptedRefresh);
    } catch {
      throw new SharesightSyncError(
        "refresh_failed",
        "Stored Sharesight refresh token is corrupt — disconnect and reconnect.",
      );
    }
    try {
      const refreshed = await refreshAccessToken(config, refreshToken, fetchImpl);
      accessToken = refreshed.access_token;
      const newRefreshEnc = refreshed.refresh_token
        ? encryptToken(refreshed.refresh_token)
        : encryptedRefresh;
      const newExpiresAt = computeExpiresAt(refreshed.expires_in, nowMs);
      await supabase
        .from("investor_oauth_connections")
        .update({
          access_token_enc: encryptToken(accessToken),
          refresh_token_enc: newRefreshEnc,
          expires_at: newExpiresAt,
          updated_at: new Date(nowMs).toISOString(),
        })
        .eq("id", connectionRow.id);
    } catch (err) {
      log.warn("sharesight refresh failed", {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
      throw new SharesightSyncError(
        "refresh_failed",
        err instanceof Error ? err.message : "refresh failed",
      );
    }
  }

  let portfolios;
  try {
    portfolios = await fetchPortfolios(accessToken, config.baseUrl, fetchImpl);
  } catch (err) {
    await stampSyncError(supabase, connectionRow.id as number, err, nowMs);
    throw new SharesightSyncError(
      "fetch_failed",
      err instanceof Error ? err.message : "portfolios fetch failed",
    );
  }

  if (portfolios.length === 0) {
    await stampSyncSuccess(supabase, connectionRow.id as number, nowMs);
    return { inserted: 0, skippedAsDuplicate: 0, errors: [] };
  }

  const portfolio = portfolios[0]!;
  const portfolioCurrency =
    portfolioCurrencyOverride ??
    readPortfolioCurrency(portfolio) ??
    "AUD";

  let holdings;
  try {
    holdings = await fetchHoldings(
      accessToken,
      config.baseUrl,
      portfolio.id,
      fetchImpl,
    );
  } catch (err) {
    await stampSyncError(supabase, connectionRow.id as number, err, nowMs);
    throw new SharesightSyncError(
      "fetch_failed",
      err instanceof Error ? err.message : "holdings fetch failed",
    );
  }

  const { rows, errors } = transformHoldings(holdings, portfolioCurrency);

  // Dedup against existing sharesight-sourced rows. Pulling only the
  // tuple-columns keeps the round-trip tiny even for users with hundreds
  // of holdings. The dedup is broker-scoped so a user who has a manual
  // BHP row + a sharesight BHP row sees both (different broker_slug
  // makes them distinct semantic sources).
  const { data: existing } = await supabase
    .from("investor_holdings")
    .select("ticker, exchange, acquired_at, shares")
    .eq("broker_slug", SHARESIGHT_BROKER_SLUG);
  const existingKeys = new Set<string>(
    (existing ?? []).map((r) => dedupKey(r)),
  );

  const toInsert: ParsedHoldingRow[] = [];
  let skipped = 0;
  for (const r of rows) {
    if (existingKeys.has(dedupKey(r))) {
      skipped += 1;
      continue;
    }
    toInsert.push(r);
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const payload = toInsert.map((r) => ({
      auth_user_id: userId,
      ticker: r.ticker,
      exchange: r.exchange,
      shares: r.shares,
      cost_basis_per_share_cents: r.cost_basis_per_share_cents,
      acquired_at: r.acquired_at,
      broker_slug: r.broker_slug,
      notes: r.notes,
    }));
    const { error: insertError, count } = await supabase
      .from("investor_holdings")
      .insert(payload, { count: "exact" });
    if (insertError) {
      await stampSyncError(
        supabase,
        connectionRow.id as number,
        new Error(insertError.message),
        nowMs,
      );
      throw new SharesightSyncError("insert_failed", insertError.message);
    }
    inserted = typeof count === "number" ? count : payload.length;
  }

  await stampSyncSuccess(supabase, connectionRow.id as number, nowMs);

  log.info("sharesight sync completed", {
    userId,
    inserted,
    skipped,
    errors: errors.length,
  });

  return { inserted, skippedAsDuplicate: skipped, errors };
}

function dedupKey(r: {
  ticker: string;
  exchange: string;
  acquired_at: string;
  shares: number;
}): string {
  return `${r.ticker.toUpperCase()}|${r.exchange}|${r.acquired_at}|${r.shares}`;
}

function readPortfolioCurrency(p: unknown): string | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (typeof o.currency_code === "string") return o.currency_code;
  if (typeof o.currency === "string") return o.currency;
  return null;
}

async function stampSyncSuccess(
  supabase: SupabaseClient,
  connectionId: number,
  nowMs: number,
): Promise<void> {
  await supabase
    .from("investor_oauth_connections")
    .update({
      last_synced_at: new Date(nowMs).toISOString(),
      last_sync_error: null,
      updated_at: new Date(nowMs).toISOString(),
    })
    .eq("id", connectionId);
}

async function stampSyncError(
  supabase: SupabaseClient,
  connectionId: number,
  err: unknown,
  nowMs: number,
): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err);
  await supabase
    .from("investor_oauth_connections")
    .update({
      last_sync_error: msg.slice(0, 500),
      updated_at: new Date(nowMs).toISOString(),
    })
    .eq("id", connectionId);
}
