import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { runEngagementCheckins } from "@/lib/briefs/engagements";

const log = logger("cron:engagement-checkins");

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Engagement registry cron — seeds relationship rows from accepted briefs
 * and sends the 30/90/365-day check-ins (the 365-day touch is the annual
 * adviser review). Gated inside `runEngagementCheckins` by the
 * `engagement_checkins` feature flag — absent/off ⇒ no-op, so the cron
 * ships safely ahead of the founder enabling consumer sends.
 *
 * Distinct from /api/cron/marketplace-outcome-flywheel (the one-shot
 * 28-day outcome request): this loop keeps the relationship alive after
 * that first touch and stops the moment a consumer marks it wrapped up.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const triggeredBy: "cron" | "admin_manual" = req.headers.get("x-admin-manual")
    ? "admin_manual"
    : "cron";

  return withCronRunLog(
    "engagement-checkins",
    async () => {
      const stats = await runEngagementCheckins();
      log.info("engagement check-ins complete", { ...stats });
      return {
        response: NextResponse.json({ ok: true, ...stats }),
        stats: { ...stats },
      };
    },
    { triggeredBy },
  );
}
