import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import {
  ensureFreshAccessToken,
  getSharesightConfig,
  listHoldings,
  listPortfolios,
  normalizeSharesightHoldings,
  planSharesightDedup,
  type SharesightConnectionState,
  type ExistingHoldingKey,
} from "@/lib/sharesight";

const log = logger("api:account:sharesight:import");

export const runtime = "nodejs";

const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MINUTES = 60; // 6 imports / hour / user

/**
 * POST /api/account/sharesight/import — pull holdings from every
 * portfolio under the connected Sharesight account, dedup against the
 * user's existing `investor_holdings`, and INSERT new rows / UPDATE
 * existing sharesight-tagged rows in place.
 *
 * Response: { inserted, updated, skipped_non_sharesight, errors[] }.
 */
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = getSharesightConfig();
  if (!config) {
    return NextResponse.json(
      { error: "not_configured", message: "Sharesight integration is not enabled." },
      { status: 503 },
    );
  }

  if (await isRateLimited(`sharesight_import:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MINUTES)) {
    return NextResponse.json(
      { error: "rate_limited", message: `Limit ${RATE_LIMIT_MAX} imports per hour.` },
      { status: 429 },
    );
  }

  const { data: connRow, error: connError } = await supabase
    .from("sharesight_connections")
    .select("access_token, refresh_token, expires_at_s, api_base_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (connError || !connRow) {
    return NextResponse.json(
      { error: "not_connected", message: "Connect Sharesight first." },
      { status: 404 },
    );
  }

  let state: SharesightConnectionState = {
    accessToken: connRow.access_token as string,
    refreshToken: connRow.refresh_token as string,
    expiresAtS: Number(connRow.expires_at_s),
    apiBaseUrl: connRow.api_base_url as string,
  };

  try {
    const refreshed = await ensureFreshAccessToken(config, state);
    if (refreshed.accessToken !== state.accessToken) {
      const { error: rotateError } = await supabase
        .from("sharesight_connections")
        .update({
          access_token: refreshed.accessToken,
          refresh_token: refreshed.refreshToken,
          expires_at_s: refreshed.expiresAtS,
          updated_at: new Date().toISOString(),
        })
        .eq("auth_user_id", user.id);
      if (rotateError) {
        log.warn("sharesight token rotation persist failed", { err: rotateError.message });
      }
    }
    state = refreshed;
  } catch (err) {
    log.warn("sharesight token refresh failed", { err: String(err) });
    return NextResponse.json(
      { error: "refresh_failed", message: "Reconnect Sharesight to continue." },
      { status: 401 },
    );
  }

  // Fetch portfolios + holdings.
  let allHoldings: Awaited<ReturnType<typeof listHoldings>> = [];
  try {
    const portfolios = await listPortfolios(state);
    for (const p of portfolios) {
      const holdings = await listHoldings(state, p.id);
      allHoldings = allHoldings.concat(holdings);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("sharesight_connections")
      .update({ last_import_error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("auth_user_id", user.id);
    log.warn("sharesight fetch failed", { err: message });
    return NextResponse.json(
      { error: "fetch_failed", message: "Could not read holdings from Sharesight." },
      { status: 502 },
    );
  }

  const { rows, errors } = normalizeSharesightHoldings(allHoldings);

  // Load the user's existing holdings (ticker+exchange+broker_slug for the
  // dedup planner). RLS scopes by auth.uid().
  const { data: existingRaw, error: existingError } = await supabase
    .from("investor_holdings")
    .select("id, ticker, exchange, broker_slug");
  if (existingError) {
    log.warn("sharesight import existing-holdings read failed", { err: existingError.message });
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  const existing: ExistingHoldingKey[] = (existingRaw ?? []).map((r) => ({
    id: r.id as number,
    ticker: r.ticker as string,
    exchange: r.exchange as ExistingHoldingKey["exchange"],
    broker_slug: (r.broker_slug as string | null) ?? null,
  }));

  const plan = planSharesightDedup(rows, existing);

  let inserted = 0;
  if (plan.toInsert.length > 0) {
    const payload = plan.toInsert.map((r) => ({
      auth_user_id: user.id,
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
      log.warn("sharesight insert failed", { err: insertError.message });
      return NextResponse.json({ error: "insert_failed", detail: insertError.message }, { status: 500 });
    }
    inserted = typeof count === "number" ? count : payload.length;
  }

  let updated = 0;
  for (const { id, patch } of plan.toUpdate) {
    const { error: updateError } = await supabase
      .from("investor_holdings")
      .update({
        shares: patch.shares,
        cost_basis_per_share_cents: patch.cost_basis_per_share_cents,
        acquired_at: patch.acquired_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) {
      log.warn("sharesight update failed", { holding_id: id, err: updateError.message });
      continue;
    }
    updated += 1;
  }

  await supabase
    .from("sharesight_connections")
    .update({
      last_imported_at: new Date().toISOString(),
      last_import_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("auth_user_id", user.id);

  log.info("sharesight import succeeded", {
    user_id: user.id,
    inserted,
    updated,
    skipped: plan.skippedNonSharesight.length,
    errors: errors.length,
  });

  return NextResponse.json({
    inserted,
    updated,
    skipped_non_sharesight: plan.skippedNonSharesight.length,
    errors,
  });
}
