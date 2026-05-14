import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  acceptReferral,
  ReferralError,
} from "@/lib/team-brief-referrals";

const log = logger("api:referrals:accept");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("referrals_accept", ipKey(request), {
        max: 20,
        refillPerSec: 0.1,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { id } = await ctx.params;
    const referralId = Number(id);
    if (!Number.isFinite(referralId) || referralId <= 0) {
      return NextResponse.json(
        { error: "Invalid referral id." },
        { status: 400 },
      );
    }

    try {
      const referral = await acceptReferral(referralId, advisorId);
      return NextResponse.json({ referral });
    } catch (err) {
      if (err instanceof ReferralError) {
        return NextResponse.json(
          { error: err.code },
          { status: mapStatus(err.code) },
        );
      }
      throw err;
    }
  } catch (err) {
    log.error("accept-referral error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to accept referral." },
      { status: 500 },
    );
  }
}

function mapStatus(code: string): number {
  switch (code) {
    case "referral_not_pending":
    case "brief_already_accepted":
      return 409;
    case "not_team_member":
      return 403;
    case "referral_not_found":
      return 404;
    default:
      return 500;
  }
}
