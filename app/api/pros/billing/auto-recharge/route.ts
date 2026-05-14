import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPack } from "@/lib/advisor-credit-packs";
import { logger } from "@/lib/logger";

const log = logger("api:pros:auto-recharge");

const Body = z.object({
  enabled: z.boolean(),
  threshold_credits: z.number().int().min(1).max(500),
  pack_slug: z.string().min(1).max(80),
});

export async function POST(request: NextRequest) {
  try {
    if (
      !(await isAllowed("pros_auto_recharge", ipKey(request), {
        max: 20,
        refillPerSec: 0.3,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = Body.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    // Verify the pack slug is a known marketplace credit pack (other
    // pack slugs aren't valid auto-recharge targets).
    const pack = getPack(parsed.data.pack_slug);
    if (!pack || !pack.isCredit || !parsed.data.pack_slug.startsWith("marketplace_")) {
      return NextResponse.json(
        { error: "Pack must be a marketplace credit pack." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("professionals")
      .update({
        auto_recharge_enabled: parsed.data.enabled,
        auto_recharge_threshold_credits: parsed.data.threshold_credits,
        auto_recharge_pack_slug: parsed.data.pack_slug,
      })
      .eq("id", advisorId);

    if (error) {
      log.warn("auto-recharge update failed", {
        advisorId,
        error: error.message,
      });
      return NextResponse.json({ error: "Could not save." }, { status: 500 });
    }

    log.info("Auto-recharge settings updated", {
      advisorId,
      enabled: parsed.data.enabled,
      threshold: parsed.data.threshold_credits,
      pack: parsed.data.pack_slug,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("auto-recharge error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }
}
