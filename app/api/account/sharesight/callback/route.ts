import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { exchangeCodeForTokens, getSharesightConfig, verifyState } from "@/lib/sharesight";

const log = logger("api:account:sharesight:callback");

export const runtime = "nodejs";

/**
 * GET /api/account/sharesight/callback?code=...&state=... — OAuth2
 * authorization-code redirect target.
 *
 * Flow:
 *   1. Verify state (HMAC + TTL + uid match the current session)
 *   2. Exchange code for tokens at Sharesight's /oauth2/token
 *   3. Upsert the row into `sharesight_connections` (one per user)
 *   4. Redirect back to /account/holdings?sharesight=connected
 *
 * On any error we redirect to /account/holdings?sharesight=error&reason=...
 * with a human-readable reason — never leak raw upstream error bodies to
 * the URL bar.
 */

function redirectBack(req: NextRequest, params: Record<string, string>): NextResponse {
  const dest = new URL("/account/holdings", req.url);
  for (const [k, v] of Object.entries(params)) {
    dest.searchParams.set(k, v);
  }
  return NextResponse.redirect(dest, { status: 302 });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = getSharesightConfig();
  if (!config) {
    log.warn("sharesight callback hit while not configured");
    return redirectBack(req, { sharesight: "error", reason: "not_configured" });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    log.info("sharesight oauth declined by user", { error: oauthError });
    return redirectBack(req, { sharesight: "error", reason: "declined" });
  }

  if (!code) {
    return redirectBack(req, { sharesight: "error", reason: "missing_code" });
  }

  const verified = verifyState(state, config.stateSecret);
  if (!verified.ok) {
    log.warn("sharesight callback state verify failed", { reason: verified.reason });
    return redirectBack(req, { sharesight: "error", reason: `state_${verified.reason}` });
  }
  if (verified.payload.uid !== user.id) {
    // State signed for a different user → cross-account replay attempt.
    log.warn("sharesight callback state uid mismatch", {
      state_uid: verified.payload.uid,
      session_uid: user.id,
    });
    return redirectBack(req, { sharesight: "error", reason: "state_uid_mismatch" });
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(config, code);
  } catch (err) {
    log.warn("sharesight token exchange failed", { err: String(err) });
    return redirectBack(req, { sharesight: "error", reason: "token_exchange_failed" });
  }

  const expiresAtS = Math.floor(Date.now() / 1000) + tokens.expires_in;

  const { error: upsertError } = await supabase.from("sharesight_connections").upsert(
    {
      auth_user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at_s: expiresAtS,
      api_base_url: config.apiBaseUrl,
      last_import_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "auth_user_id" },
  );

  if (upsertError) {
    log.warn("sharesight connection upsert failed", { err: upsertError.message });
    return redirectBack(req, { sharesight: "error", reason: "store_failed" });
  }

  log.info("sharesight connected", { user_id: user.id });
  return redirectBack(req, { sharesight: "connected" });
}
