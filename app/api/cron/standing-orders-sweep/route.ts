import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { sweepStandingOrders } from "@/lib/briefs/standing-orders";

const log = logger("cron:standing-orders-sweep");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Safety-net sweep for the standing-orders auto-accept engine.
 *
 * Standing orders normally fire inline when a brief is created or
 * approved out of risk review; this sweep catches anything those hooks
 * missed (process crash between insert and hook, or a standing order
 * created after the brief went live). Flag-gated inside
 * `sweepStandingOrders` — with the `standing_orders` flag off this is
 * a no-op, so registering the cron is safe ahead of launch.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const triggeredBy: "cron" | "admin_manual" = req.headers.get("x-admin-manual")
    ? "admin_manual"
    : "cron";

  return withCronRunLog(
    "standing-orders-sweep",
    async () => {
      const stats = await sweepStandingOrders();
      log.info("standing orders sweep complete", stats);
      return {
        response: NextResponse.json({ ok: true, ...stats }),
        stats,
      };
    },
    { triggeredBy },
  );
}
