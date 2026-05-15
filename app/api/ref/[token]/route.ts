/**
 * GET /api/ref/[token] — investor referral landing redirect.
 *
 * Records a click on the referral link, sets an `iv_ref` cookie that the
 * signup + brief-create attribution helpers will pick up later, and 303s
 * the visitor to the homepage with UTM tags.
 */
import { NextRequest, NextResponse } from "next/server";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getLinkByToken, recordClick } from "@/lib/investor-referrals";
import { logger } from "@/lib/logger";

const log = logger("api:ref");

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  if (
    !(await isAllowed("investor_ref_click", ipKey(request), {
      max: 60,
      refillPerSec: 1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { token } = await ctx.params;
  if (!token || token.length < 8 || token.length > 32) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const link = await getLinkByToken(token);
  if (!link) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  // Fire-and-forget click record so the redirect stays fast.
  void recordClick(token).catch((err: unknown) => {
    log.warn("recordClick failed", {
      token,
      err: err instanceof Error ? err.message : String(err),
    });
  });

  const dest = new URL("/", request.url);
  dest.searchParams.set("utm_source", "investor_referral");
  dest.searchParams.set("utm_campaign", token);
  const res = NextResponse.redirect(dest, 303);
  res.cookies.set("iv_ref", token, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
