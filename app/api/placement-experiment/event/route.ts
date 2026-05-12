/**
 * POST /api/placement-experiment/event
 *
 * Records a placement-experiment event (impression / click / conversion).
 * Used by the `<PlacementImpressionTracker>` client component mounted on
 * /best/<slug> pages.
 *
 * Body shape (Zod-validated):
 *   {
 *     experiment_id: number,
 *     variant: string,
 *     event_type: "impressions" | "clicks" | "conversions",
 *   }
 *
 * Rate-limited per IP (120 events/min) to keep abuse from inflating the
 * counters. The underlying RPC is also gated on `status IN ('running','paused')`
 * — events on completed experiments are silent no-ops.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limiter";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { recordPlacementEvent } from "@/lib/placement-experiments-server";
import {
  VARIANT_LABEL_PATTERN,
  type PlacementEventType,
} from "@/lib/placement-experiments";

const isRateLimited = createRateLimiter(60_000, 120);

const EventBody = z.object({
  experiment_id: z.number().int().positive(),
  variant: z.string().regex(VARIANT_LABEL_PATTERN, {
    message: "variant label must match [a-z0-9][a-z0-9_-]{0,30}",
  }),
  event_type: z.enum(["impressions", "clicks", "conversions"]),
});

export const POST = withValidatedBody(EventBody, async (request: NextRequest, body) => {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  await recordPlacementEvent(
    body.experiment_id,
    body.variant,
    body.event_type as PlacementEventType,
  );

  return NextResponse.json({ ok: true });
});
