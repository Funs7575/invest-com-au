import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

const log = logger("cron:sponsored-placement-apply");

export const maxDuration = 60;

/**
 * True iff the broker's currently-applied sponsorship end-date is the
 * same instant as the booking we're about to clear. Prevents the "end"
 * sweep from stomping on a later booking that was already activated —
 * a case we'd otherwise hit whenever two back-to-back bookings
 * briefly overlap the sweep tick.
 *
 * Both inputs come from Postgres `timestamptz` via the JS client, so
 * they arrive as ISO strings. Millisecond precision is enough; we
 * don't accidentally match sub-ms clock drift because Postgres
 * doesn't produce sub-ms values for these columns.
 */
export function sponsorshipEndMatches(
  brokerEnd: string | null | undefined,
  bookingEndsAt: string,
): boolean {
  if (!brokerEnd) return false;
  const a = new Date(brokerEnd).getTime();
  const b = new Date(bookingEndsAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return a === b;
}

/**
 * Sponsored placement daily sweep.
 *
 *   scheduled → active: booking starts_at ≤ now ≤ ends_at
 *                      → apply sponsorship_tier + sponsorship_end
 *                        to the broker row.
 *   active    → ended:   booking ends_at < now
 *                      → clear sponsorship_tier on the broker IF the
 *                        broker's current sponsorship_end matches this
 *                        booking's ends_at (avoids stomping on a later
 *                        manual override).
 *
 * Idempotent — running twice has no extra effect.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  let activated = 0;
  let ended = 0;

  // 1) Activate newly-in-window bookings
  const { data: toActivate } = await supabase
    .from("sponsored_placement_bookings")
    .select("id, broker_slug, tier, starts_at, ends_at")
    .eq("status", "scheduled")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso);

  for (const b of toActivate ?? []) {
    const { error: brokerErr } = await supabase
      .from("brokers")
      .update({
        sponsorship_tier: b.tier,
        sponsorship_start: b.starts_at,
        sponsorship_end: b.ends_at,
      })
      .eq("slug", b.broker_slug);
    if (brokerErr) {
      log.error("broker_update_failed", { booking: b.id, err: brokerErr.message });
      continue;
    }
    await supabase
      .from("sponsored_placement_bookings")
      .update({ status: "active", applied_at: nowIso })
      .eq("id", b.id);
    activated++;
  }

  // 2) End bookings whose window has closed
  const { data: toEnd } = await supabase
    .from("sponsored_placement_bookings")
    .select("id, broker_slug, ends_at")
    .eq("status", "active")
    .lt("ends_at", nowIso);

  for (const b of toEnd ?? []) {
    // Only clear if the broker's stored sponsorship_end still matches
    // this booking — don't clobber a later booking already applied.
    const { data: broker } = await supabase
      .from("brokers")
      .select("sponsorship_end")
      .eq("slug", b.broker_slug)
      .maybeSingle();
    if (sponsorshipEndMatches(broker?.sponsorship_end, b.ends_at)) {
      await supabase
        .from("brokers")
        .update({
          sponsorship_tier: null,
          sponsorship_start: null,
          sponsorship_end: null,
        })
        .eq("slug", b.broker_slug);
    }
    await supabase
      .from("sponsored_placement_bookings")
      .update({ status: "ended", cleared_at: nowIso })
      .eq("id", b.id);
    ended++;
  }

  return NextResponse.json({ ok: true, activated, ended });
}
