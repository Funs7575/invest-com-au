import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSharesightConfig } from "@/lib/sharesight/config";
import { decryptToken, encryptToken } from "@/lib/sharesight/crypto";
import {
  fetchHoldings,
  refreshAccessToken,
} from "@/lib/sharesight/client";
import { mapSharesightHoldings } from "@/lib/sharesight/mapping";
import { dedupAgainstExisting } from "@/lib/sharesight/dedup";
import { logger } from "@/lib/logger";

const log = logger("api:account:holdings:sharesight:sync");

export const runtime = "nodejs";

/**
 * POST /api/account/holdings/sharesight/sync
 *
 * Pulls the user's primary portfolio holdings from Sharesight, maps
 * them to `ParsedHoldingRow`, dedups against existing
 * `investor_holdings` (ticker + exchange + acquired_at), and bulk-
 * inserts the new rows. Refreshes the access token transparently if
 * it's within 60s of expiry or has already lapsed.
 *
 * Response:
 *   200 OK  — { inserted, skipped, errors[] }
 *   401     — no session
 *   404     — no Sharesight connection for the user
 *   500     — token / API / insert failure
 *   503     — `sharesight_not_configured`
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let config;
    try {
      config = getSharesightConfig();
    } catch (err) {
      log.warn("sync: config missing", {
        message: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: "sharesight_not_configured" }, { status: 503 });
    }

    const { data: connection, error: connErr } = await supabase
      .from("investor_oauth_connections")
      .select(
        "id, access_token_enc, refresh_token_enc, expires_at, external_account_id",
      )
      .eq("auth_user_id", user.id)
      .eq("provider", "sharesight")
      .maybeSingle();

    if (connErr) {
      log.warn("sync: connection lookup failed", { message: connErr.message });
      return NextResponse.json({ error: "connection_lookup_failed" }, { status: 500 });
    }
    if (!connection) {
      return NextResponse.json({ error: "not_connected" }, { status: 404 });
    }
    if (!connection.external_account_id) {
      return NextResponse.json({ error: "no_portfolio_linked" }, { status: 500 });
    }

    let accessToken: string;
    try {
      accessToken = decryptToken(connection.access_token_enc);
    } catch (err) {
      log.warn("sync: access token decrypt failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
    }

    // Refresh if within 60s of expiry. Sharesight access tokens are
    // typically short-lived (~2h); we never want to fire a sync that
    // then 401s mid-flight because the token expired between the
    // check and the call.
    const expiresMs = Date.parse(connection.expires_at);
    if (Number.isFinite(expiresMs) && expiresMs - Date.now() < 60_000) {
      if (!connection.refresh_token_enc) {
        return NextResponse.json({ error: "refresh_required_but_no_token" }, { status: 401 });
      }
      let refreshToken: string;
      try {
        refreshToken = decryptToken(connection.refresh_token_enc);
      } catch {
        return NextResponse.json({ error: "decrypt_failed" }, { status: 500 });
      }
      try {
        const refreshed = await refreshAccessToken(config, refreshToken);
        accessToken = refreshed.access_token;
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        const newAccessEnc = encryptToken(refreshed.access_token);
        const newRefreshEnc = refreshed.refresh_token
          ? encryptToken(refreshed.refresh_token)
          : connection.refresh_token_enc;
        await supabase
          .from("investor_oauth_connections")
          .update({
            access_token_enc: newAccessEnc,
            refresh_token_enc: newRefreshEnc,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
      } catch (err) {
        log.warn("sync: token refresh failed", {
          message: err instanceof Error ? err.message : String(err),
        });
        await supabase
          .from("investor_oauth_connections")
          .update({
            last_sync_error: "refresh_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);
        return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
      }
    }

    let rawHoldings;
    try {
      rawHoldings = await fetchHoldings(config, accessToken, connection.external_account_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn("sync: fetch failed", { message });
      await supabase
        .from("investor_oauth_connections")
        .update({ last_sync_error: message.slice(0, 200), updated_at: new Date().toISOString() })
        .eq("id", connection.id);
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    const { rows: parsedRows, errors } = mapSharesightHoldings(rawHoldings);

    // Existing rows to dedup against. RLS scopes by auth.uid(), so the
    // user-scoped client returns only this user's holdings.
    const { data: existing, error: existingErr } = await supabase
      .from("investor_holdings")
      .select("ticker, exchange, acquired_at");
    if (existingErr) {
      log.warn("sync: existing-row lookup failed", { message: existingErr.message });
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
    }

    const { toInsert, skipped } = dedupAgainstExisting(parsedRows, existing ?? []);

    let inserted = 0;
    if (toInsert.length > 0) {
      const insertPayload = toInsert.map((r) => ({
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
        .insert(insertPayload, { count: "exact" });
      if (insertError) {
        log.warn("sync: insert failed", {
          rowCount: insertPayload.length,
          message: insertError.message,
        });
        return NextResponse.json(
          { error: "insert_failed", detail: insertError.message },
          { status: 500 },
        );
      }
      inserted = typeof count === "number" ? count : insertPayload.length;
    }

    await supabase
      .from("investor_oauth_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    log.info("sync succeeded", {
      inserted,
      skipped: skipped.length,
      error_count: errors.length,
    });

    return NextResponse.json({
      inserted,
      skipped: skipped.length,
      errors,
    });
  } catch (err) {
    log.warn("sync: unexpected error", err);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
