import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { sweepBriefSla } from "@/lib/briefs/sla";

const log = logger("cron:brief-sla-sweep");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Response Guarantee sweep — warns providers approaching the 24h
 * first-response SLA on accepted briefs, then claws back silent accepts:
 * refund the credits, release the brief to the open pool, re-broadcast to
 * other eligible providers and notify both sides.
 *
 * Flag-gated inside `sweepBriefSla` (`response_guarantee`) — with the
 * flag off this is a no-op, so the cron ships safely ahead of launch.
 * Distinct from /api/cron/lead-sla-check (quiz-lead admin alerts) and
 * /api/cron/marketplace-stale-briefs (unaccepted-brief nudges): this one
 * acts on ACCEPTED briefs and moves money.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const triggeredBy: "cron" | "admin_manual" = req.headers.get("x-admin-manual")
    ? "admin_manual"
    : "cron";

  return withCronRunLog(
    "brief-sla-sweep",
    async () => {
      const stats = await sweepBriefSla();
      log.info("brief sla sweep complete", { ...stats });
      return {
        response: NextResponse.json({ ok: true, ...stats }),
        stats: { ...stats },
      };
    },
    { triggeredBy },
  );
}
