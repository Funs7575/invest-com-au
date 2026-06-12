import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  applyEngagementStatus,
  submitAnnualReview,
  type EngagementStatus,
} from "@/lib/briefs/engagements";
import { QUOTE_BUDGET_BANDS } from "@/lib/api-schemas";

const log = logger("api:engagement");

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    status: z.enum(["engaged", "completed", "ended"]),
  }),
  z.object({
    action: z.literal("annual_review"),
    rating: z.number().int().min(1).max(5),
    fee_band: z.enum(QUOTE_BUDGET_BANDS).nullable(),
    considering_change: z.boolean(),
  }),
]);

/**
 * POST /api/engagement/[token] — apply a check-in status or submit the
 * annual review. The opaque token is the auth factor (same model as the
 * outcome and brief-tracker surfaces); responses never include PII.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  if (!(await isAllowed("engagement_checkin", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  const { token } = await ctx.params;

  try {
    if (parsed.data.action === "status") {
      const row = await applyEngagementStatus(
        token,
        parsed.data.status as EngagementStatus,
      );
      if (!row) return NextResponse.json({ error: "Link not found." }, { status: 404 });
      return NextResponse.json({ success: true, status: row.status });
    }

    const result = await submitAnnualReview(token, {
      rating: parsed.data.rating,
      feeBand: parsed.data.fee_band,
      consideringChange: parsed.data.considering_change,
    });
    if (!result) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    return NextResponse.json({
      success: true,
      rebrief_url: result.rebriefUrl,
    });
  } catch (err) {
    log.error("engagement POST failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
