import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";

export const runtime = "edge";
export const maxDuration = 60;

const log = logger("cron-rotate-featured-advisors");

/**
 * Cron: Rotate Featured Advisors (runs every Sunday at midnight AEST)
 *
 * Gold-tier advisors get a rotating homepage spotlight.
 * This job:
 *   1. Expires featured_until for Gold advisors whose turn has ended
 *   2. Selects the next batch of Gold advisors for the coming week
 *      (round-robin by last_lead_date to ensure fair rotation)
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Expire any featured_until that has passed
  const { error: expireError } = await supabase
    .from("professionals")
    .update({ featured_until: null })
    .lt("featured_until", now)
    .eq("advisor_tier", "gold");

  if (expireError) {
    log.error("Failed to expire featured advisors", { error: expireError.message });
  }

  // 2. Get Gold advisors not currently featured, ordered by least recently featured
  const { data: goldAdvisors, error: fetchError } = await supabase
    .from("professionals")
    .select("id, name, advisor_tier, featured_until, last_lead_date")
    .eq("status", "active")
    .eq("advisor_tier", "gold")
    .is("featured_until", null)
    .order("last_lead_date", { ascending: true, nullsFirst: true })
    .limit(6); // Feature up to 6 Gold advisors per week

  if (fetchError) {
    log.error("Failed to fetch Gold advisors", { error: fetchError.message });
    return NextResponse.json({ error: "Failed to fetch advisors" }, { status: 500 });
  }

  if (!goldAdvisors || goldAdvisors.length === 0) {
    log.info("No Gold advisors to feature this week");
    return NextResponse.json({ success: true, featured: 0 });
  }

  // 3. Set featured_until for the coming week
  const ids = goldAdvisors.map((a) => a.id);
  const { error: updateError } = await supabase
    .from("professionals")
    .update({ featured_until: nextWeek })
    .in("id", ids);

  if (updateError) {
    log.error("Failed to set featured_until", { error: updateError.message });
    return NextResponse.json({ error: "Failed to update advisors" }, { status: 500 });
  }

  log.info(`Rotated ${ids.length} Gold advisors into homepage spotlight`);

  return NextResponse.json({
    success: true,
    featured: ids.length,
    advisor_ids: ids,
    featured_until: nextWeek,
  });
}
