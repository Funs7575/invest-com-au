import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSharesightConfig } from "@/lib/sharesight/config";
import { buildAuthorizeUrl } from "@/lib/sharesight/client";
import { logger } from "@/lib/logger";

const log = logger("api:account:holdings:sharesight:connect");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "iv_sharesight_state";
const STATE_MAX_AGE_SECONDS = 600;

/**
 * GET /api/account/holdings/sharesight/connect
 *
 * Initiates the Sharesight OAuth flow. Generates a CSRF-safe random
 * `state`, stores it in an HTTP-only cookie scoped to the callback
 * path, and 303s the user to Sharesight's authorize endpoint.
 *
 * Auth required — anonymous callers get redirected to /account/login
 * so the post-callback flow has a valid `auth.uid()` to bind the
 * token to.
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

  let config;
  try {
    config = getSharesightConfig();
  } catch (err) {
    log.warn("sharesight connect: config missing", {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(
      new URL("/account/holdings?sharesight=not_configured", request.url),
      303,
    );
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const authorizeUrl = buildAuthorizeUrl(config, state);

  const res = NextResponse.redirect(authorizeUrl, 303);
  res.cookies.set(STATE_COOKIE, state, {
    maxAge: STATE_MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/account/holdings/sharesight",
  });
  return res;
}
