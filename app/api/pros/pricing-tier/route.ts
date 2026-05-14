/**
 * POST /api/pros/pricing-tier — flip the calling pro between the standard
 * and success_only tiers. The change applies to NEW accepts only;
 * already-accepted briefs keep `pricing_tier_at_accept` from acceptance time.
 *
 * Auth: required. Handler scopes the UPDATE to the calling user's own
 * professional row by joining on auth_user_id, so a malicious client can't
 * flip another pro's tier.
 * Rate-limit: low — IP-keyed, expected at most a handful of times per pro.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:pros:pricing-tier");

const Body = z.object({
  professional_id: z.number().int().positive(),
  tier: z.enum(["standard", "success_only"]),
});

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("pros_pricing_tier", ipKey(request), {
      max: 10,
      refillPerSec: 0.05,
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Auth required." }, { status: 401 });
  }

  const admin = createAdminClient();
  // Confirm the calling user actually owns this professional row.
  const { data: owned } = await admin
    .from("professionals")
    .select("id")
    .eq("id", parsed.data.professional_id)
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await admin
    .from("professionals")
    .update({ pricing_tier: parsed.data.tier })
    .eq("id", parsed.data.professional_id);
  if (error) {
    log.error("pricing tier update failed", { error: error.message });
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  log.info("pricing tier set", {
    professional_id: parsed.data.professional_id,
    tier: parsed.data.tier,
  });
  return NextResponse.json({ ok: true, tier: parsed.data.tier });
}
