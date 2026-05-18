import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSharesightConfig } from "@/lib/sharesight/config";
import { encryptToken } from "@/lib/sharesight/crypto";
import { exchangeCodeForToken, fetchPortfolios } from "@/lib/sharesight/client";
import { logger } from "@/lib/logger";

const log = logger("api:account:holdings:sharesight:callback");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "iv_sharesight_state";

/**
 * GET /api/account/holdings/sharesight/callback?code=<code>&state=<state>
 *
 * Exchanges the auth code for tokens, captures the user's primary
 * portfolio id, encrypts both tokens with `INVESTOR_OAUTH_KEY`, and
 * upserts a row into `investor_oauth_connections`. Then 303s back to
 * /account/holdings with a `sharesight=connected` query so the UI can
 * surface the success state.
 *
 * On any failure (state mismatch, token-exchange 4xx/5xx, no
 * portfolios, encryption refused), redirects back with
 * `sharesight=<reason>` so the UI can show a typed error.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/account/login?redirect=/account/holdings", request.url),
      303,
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Always clear the state cookie on the way out so a replay can't
  // re-use it after a failure.
  const failRedirect = (reason: string) => {
    const dest = new URL("/account/holdings", request.url);
    dest.searchParams.set("sharesight", reason);
    const res = NextResponse.redirect(dest, 303);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (error) {
    log.info("sharesight callback: provider returned error", { error });
    return failRedirect(`error_${error.replace(/[^a-z0-9_]/gi, "")}`.slice(0, 40));
  }
  if (!code || !state) {
    return failRedirect("missing_code");
  }

  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!expectedState || expectedState !== state) {
    log.warn("sharesight callback: state mismatch");
    return failRedirect("state_mismatch");
  }

  let config;
  try {
    config = getSharesightConfig();
  } catch (err) {
    log.warn("sharesight callback: config missing", {
      message: err instanceof Error ? err.message : String(err),
    });
    return failRedirect("not_configured");
  }

  let token;
  try {
    token = await exchangeCodeForToken(config, code);
  } catch (err) {
    log.warn("sharesight callback: token exchange failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return failRedirect("token_exchange_failed");
  }

  // Pick the first portfolio; users with multiple portfolios can switch
  // in a follow-up (the dropdown isn't this PR's scope — Sharesight
  // users overwhelmingly have a single primary portfolio).
  let portfolioId: string | null = null;
  try {
    const portfolios = await fetchPortfolios(config, token.access_token);
    if (portfolios.length > 0) {
      portfolioId = String(portfolios[0]!.id);
    }
  } catch (err) {
    log.warn("sharesight callback: portfolio fetch failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return failRedirect("portfolio_fetch_failed");
  }

  if (!portfolioId) {
    return failRedirect("no_portfolios");
  }

  let accessEnc: string;
  let refreshEnc: string | null = null;
  try {
    accessEnc = encryptToken(token.access_token);
    if (token.refresh_token) {
      refreshEnc = encryptToken(token.refresh_token);
    }
  } catch (err) {
    log.warn("sharesight callback: token encryption failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return failRedirect("encryption_failed");
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

  const { error: upsertError } = await supabase
    .from("investor_oauth_connections")
    .upsert(
      {
        auth_user_id: user.id,
        provider: "sharesight",
        access_token_enc: accessEnc,
        refresh_token_enc: refreshEnc,
        expires_at: expiresAt,
        scope: token.scope ?? config.scope,
        external_account_id: portfolioId,
        connected_at: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id,provider" },
    );

  if (upsertError) {
    log.warn("sharesight callback: upsert failed", { message: upsertError.message });
    return failRedirect("storage_failed");
  }

  const dest = new URL("/account/holdings", request.url);
  dest.searchParams.set("sharesight", "connected");
  const res = NextResponse.redirect(dest, 303);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
