/**
 * POST /api/admin/pro-subscription — admin-only override of a pro's tier.
 *
 * Used for pre-launch testing (Stripe billing is feature-flag-gated and not
 * yet live). Once Stripe is on, this endpoint stays as the manual-override
 * lever for support cases.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  setProSubscriptionTier,
  type ProSubscriptionTier,
  type ProSubscriptionStatus,
} from "@/lib/pro-subscription";
import { logger } from "@/lib/logger";

const log = logger("api:admin:pro-subscription");

const Body = z.object({
  professional_id: z.number().int().positive(),
  tier: z.enum(["free", "starter", "growth", "scale"]),
  status: z
    .enum(["inactive", "trialing", "active", "past_due", "canceled"])
    .optional(),
  period_end: z.string().datetime().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (
    !(await isAllowed("admin_pro_subscription", ipKey(request), {
      max: 60,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  try {
    await setProSubscriptionTier({
      professionalId: parsed.data.professional_id,
      tier: parsed.data.tier as ProSubscriptionTier,
      status: parsed.data.status as ProSubscriptionStatus | undefined,
      periodEnd: parsed.data.period_end ?? null,
    });
    log.info("admin tier override", {
      professional_id: parsed.data.professional_id,
      tier: parsed.data.tier,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("admin tier override failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
