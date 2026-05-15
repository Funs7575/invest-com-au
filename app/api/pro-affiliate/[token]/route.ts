import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { recordClick } from "@/lib/pro-affiliate/track";

const log = logger("pro-affiliate:redirect");

const COOKIE_NAME = "ref";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * GET /api/pro-affiliate/[token] — record a click and redirect to the
 * homepage with utm_source=pro_affiliate stamped. Also sets the `ref`
 * cookie (httpOnly:false, sameSite:lax, 90 days) so signup forms can
 * echo the token back when the lead converts.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  if (!token || token.length > 64) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  if (!(await isAllowed("pro_affiliate_redirect", ipKey(request), {
    max: 30,
    refillPerSec: 0.5,
  }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const sessionId =
    request.cookies.get("session_id")?.value ?? `srv-${token}-${Date.now()}`;

  const ip = ipKey(request);
  const ipHash = ip ? hashIp(ip) : null;
  const userAgent = request.headers.get("user-agent");
  const landingPage = request.headers.get("referer");

  // Fire-and-forget — never block the redirect on a slow DB.
  void recordClick({
    token,
    sessionId,
    ipHash,
    userAgent,
    landingPage,
  }).catch((err) => {
    log.warn("recordClick threw", {
      token,
      err: err instanceof Error ? err.message : String(err),
    });
  });

  const target = `/?utm_source=pro_affiliate&utm_campaign=${encodeURIComponent(
    token,
  )}`;
  const response = NextResponse.redirect(new URL(target, request.url), 303);

  // `ref` cookie: httpOnly false so signup forms can echo it back.
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
