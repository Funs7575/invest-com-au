/**
 * GET /api/advisor-auth/pricing-position
 *
 * Where the authenticated advisor's typical quote sits relative to peer
 * quotes in their main category (the category they quote on most), from
 * the same corpus that powers the public /advice-fees benchmark.
 *
 * Privacy / framing rules:
 *   - Peer figures are aggregates only (median, IQR, percentile, count) —
 *     no individual peer quotes are ever returned.
 *   - Requires at least 8 peer quotes in the category; otherwise the
 *     response says so and the UI renders an "accumulating data" state.
 *   - This is market information, not a pricing instruction — copy on the
 *     client must stay neutral.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { getAdvisorPricingPosition, type PricingPosition } from "@/lib/fee-benchmark";

const log = logger("advisor-auth:pricing-position");

export type PricingPositionResponse = PricingPosition;

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`pricing-position:${ip}`, 30, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const position = await getAdvisorPricingPosition(advisorId);
    return NextResponse.json(position satisfies PricingPositionResponse);
  } catch (err) {
    log.error("Pricing position failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to compute pricing position." }, { status: 500 });
  }
}
