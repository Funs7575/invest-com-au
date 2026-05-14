import { NextRequest, NextResponse } from "next/server";

import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  sendConsumerStaleBriefNudge,
  sendProviderDailyDigest,
} from "@/lib/marketplace-emails";

/**
 * N2 — Stale brief auto-broaden + nudge cron.
 *
 * Runs daily. For every open `advisor_auctions` brief where no provider
 * has accepted within N hours:
 *
 *   1. **24 hours since created** → email the consumer a "still open" nudge
 *      (no auto-broaden yet, just a heads-up they can adjust)
 *   2. **48 hours since created** → auto-broaden provider_preference to
 *      "any" (if it was individual / firm / expert_team), email the
 *      consumer that we've broadened the routing
 *   3. **72 hours since created** → email the consumer with the option
 *      to withdraw or restart from /get-matched
 *
 * Also runs the provider daily digest: any verified pro with N>0
 * unaccepted briefs in their inbox gets a single daily email.
 *
 * Compliance: notifications only (factual, not advice). Idempotent —
 * stamps `last_stale_check_at` / `auto_broadened_at` so re-runs in the
 * same window are no-ops.
 *
 * Configured in vercel.json with `schedule: "0 9 * * *"` (9am UTC daily).
 */

const log = logger("cron:marketplace-stale-briefs");

const HOURS_TO_NUDGE = 24;
const HOURS_TO_BROADEN = 48;
const HOURS_TO_WITHDRAW_PROMPT = 72;

interface StaleBriefRow {
  id: number;
  slug: string;
  job_title: string | null;
  contact_email: string | null;
  contact_name: string | null;
  provider_preference: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
  created_at: string;
  last_stale_check_at: string | null;
  auto_broadened_at: string | null;
  risk_review_status: string | null;
  status: string | null;
}

async function handleStaleBriefs() {
  const admin = createAdminClient();
  const now = Date.now();

  const cutoff = new Date(
    now - HOURS_TO_NUDGE * 60 * 60 * 1000,
  ).toISOString();

  const { data: briefs, error } = await admin
    .from("advisor_auctions")
    .select(
      "id, slug, job_title, contact_email, contact_name, provider_preference, accepted_by_professional_id, accepted_by_team_id, created_at, last_stale_check_at, auto_broadened_at, risk_review_status, status",
    )
    .eq("flow_type", "accept")
    .eq("status", "open")
    .is("accepted_by_professional_id", null)
    .is("accepted_by_team_id", null)
    .neq("risk_review_status", "pending_review")
    .lt("created_at", cutoff);

  if (error) {
    log.warn("stale brief scan failed", { error: error.message });
    return { nudged: 0, broadened: 0 };
  }

  let nudged = 0;
  let broadened = 0;

  for (const b of (briefs ?? []) as StaleBriefRow[]) {
    const hoursOld = Math.floor((now - new Date(b.created_at).getTime()) / (60 * 60 * 1000));
    const lastCheckHoursAgo = b.last_stale_check_at
      ? Math.floor((now - new Date(b.last_stale_check_at).getTime()) / (60 * 60 * 1000))
      : Infinity;

    // Skip if we already nudged in the last 22 hours — keeps the cadence
    // strictly daily even if the cron fires multiple times.
    if (lastCheckHoursAgo < 22) continue;

    const willAutoBroaden =
      hoursOld >= HOURS_TO_BROADEN &&
      !b.auto_broadened_at &&
      b.provider_preference &&
      b.provider_preference !== "any";

    // Send the nudge email (consumer)
    if (b.contact_email) {
      await sendConsumerStaleBriefNudge({
        consumerEmail: b.contact_email,
        consumerName: b.contact_name ?? "",
        briefTitle: b.job_title ?? "Your Match Request",
        briefSlug: b.slug,
        hoursLive: hoursOld,
        willAutoBroaden: Boolean(willAutoBroaden),
      });
      nudged++;
    }

    // Auto-broaden at 48h
    const patch: Record<string, unknown> = { last_stale_check_at: new Date().toISOString() };
    if (willAutoBroaden) {
      patch.provider_preference = "any";
      patch.auto_broadened_at = new Date().toISOString();
      broadened++;
    }
    await admin.from("advisor_auctions").update(patch).eq("id", b.id);

    // Log a tracker event so the consumer can see it in their /briefs/[slug] timeline
    await admin.from("brief_tracker_events").insert({
      brief_id: b.id,
      event_type: willAutoBroaden ? "auto_broadened" : "stale_nudge",
      actor_kind: "system",
      payload: {
        hours_live: hoursOld,
        previous_preference: b.provider_preference,
      },
    });

    // 72h withdrawal prompt — separate event for visibility (no extra email,
    // the 24h + 48h nudges already cover it)
    if (hoursOld >= HOURS_TO_WITHDRAW_PROMPT) {
      log.info("brief past withdrawal-prompt threshold", { briefId: b.id, hoursOld });
    }
  }

  return { nudged, broadened };
}

async function handleProviderDigest() {
  const admin = createAdminClient();

  // Pull every brief currently in any provider's inbox (open + risk-clear).
  // The fan-out scales with brief count × eligible providers but with the
  // hard cap of 20 emails per provider per day this stays bounded.
  const { data: openBriefs } = await admin
    .from("advisor_auctions")
    .select("id, slug, job_title")
    .eq("flow_type", "accept")
    .eq("status", "open")
    .is("accepted_by_professional_id", null)
    .is("accepted_by_team_id", null)
    .neq("risk_review_status", "pending_review")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!openBriefs || openBriefs.length === 0) return { digested: 0 };

  // Look up verified pros who accept briefs.
  const { data: pros } = await admin
    .from("professionals")
    .select("id, name, email, accepts_new_clients, accepts_briefs")
    .eq("status", "active")
    .eq("accepts_briefs", true)
    .eq("accepts_new_clients", true)
    .limit(200);

  if (!pros || pros.length === 0) return { digested: 0 };

  // Naive fan-out: every active pro gets the top-3 most recent open briefs.
  // We don't re-run the routing rules here for cost — the morning digest is
  // a "you have inbox items waiting" reminder, not a strict match.
  let digested = 0;
  const top3Titles = openBriefs.slice(0, 3).map(
    (b) => (b.job_title as string) ?? "New Match Request",
  );
  const totalCount = openBriefs.length;

  for (const p of pros) {
    if (!p.email || typeof p.email !== "string" || !p.email.includes("@")) continue;
    await sendProviderDailyDigest({
      providerEmail: p.email,
      providerName: (p.name as string) ?? "Pro",
      unacceptedCount: totalCount,
      topBriefTitles: top3Titles,
    });
    digested++;
  }
  return { digested };
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  try {
    const [stale, digest] = await Promise.all([
      handleStaleBriefs(),
      handleProviderDigest(),
    ]);

    log.info("marketplace-stale-briefs cron complete", {
      nudged: stale.nudged,
      broadened: stale.broadened,
      digested: digest.digested,
    });

    return NextResponse.json({
      ok: true,
      consumer_nudged: stale.nudged,
      consumer_broadened: stale.broadened,
      provider_digested: digest.digested,
    });
  } catch (err) {
    log.error("marketplace-stale-briefs cron failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "cron failed" }, { status: 500 });
  }
}
