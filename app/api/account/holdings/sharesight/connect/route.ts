import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  buildAuthorizeUrl,
  getSharesightConfig,
} from "@/lib/sharesight/oauth";

const log = logger("api:account:holdings:sharesight:connect");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "sharesight_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

/**
 * GET /api/account/holdings/sharesight/connect
 *
 * Initiates the OAuth authorization-code flow. Generates a 32-byte random
 * `state`, stamps it into an HttpOnly cookie, and 302-redirects to
 * Sharesight's /oauth2/authorize endpoint. The callback verifies the
 * cookie matches the returned `state` query param — defends against CSRF
 * during OAuth.
 *
 * Returns 401 if the user isn't logged in, 503 if the integration isn't
 * configured (env vars not set).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = getSharesightConfig();
  if (!config) {
    log.info("sharesight connect attempted while unconfigured", {
      userId: user.id,
    });
    return NextResponse.json(
      { error: "sharesight_not_configured" },
      { status: 503 },
    );
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });

  const authorizeUrl = buildAuthorizeUrl(config, state);
  return NextResponse.redirect(authorizeUrl, { status: 302 });
}
