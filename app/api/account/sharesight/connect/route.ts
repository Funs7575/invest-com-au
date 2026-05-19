import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { buildAuthorizeUrl, getSharesightConfig, signState } from "@/lib/sharesight";

const log = logger("api:account:sharesight:connect");

export const runtime = "nodejs";

/**
 * GET /api/account/sharesight/connect — start the OAuth2 round-trip.
 *
 * Returns a 302 to Sharesight's consent screen with a signed state
 * parameter binding the redirect to the current user. The callback
 * verifies that state before exchanging the auth code for tokens.
 *
 * Status codes:
 *   302 — redirect to Sharesight (happy path)
 *   401 — no session
 *   503 — Sharesight OAuth app not yet configured (founder-side gate)
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = getSharesightConfig();
  if (!config) {
    log.warn("sharesight connect attempted while not configured");
    return NextResponse.json(
      { error: "not_configured", message: "Sharesight integration is not yet enabled." },
      { status: 503 },
    );
  }

  const state = signState(user.id, config.stateSecret);
  const authorizeUrl = buildAuthorizeUrl(config, state);

  log.info("sharesight connect initiated", { user_id: user.id });
  return NextResponse.redirect(authorizeUrl, { status: 302 });
}
