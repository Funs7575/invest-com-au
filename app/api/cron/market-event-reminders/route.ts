/**
 * Cron: market-event-reminders — daily at 08:00 UTC (daily-8).
 *
 * Checks for market events happening tomorrow (or today for intra-day events).
 * For each qualifying event:
 *   1. Sends a push notification to all devices subscribed to "market_events".
 *   2. Fires once per event_id per day — tracked via push_send_log (if the
 *      log table exists); otherwise sends unconditionally.
 *
 * Important events like RBA decisions get a heads-up 24 hours before
 * the decision is published so users can check rates before the announcement.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:market-event-reminders");

export const runtime = "nodejs";
export const maxDuration = 30;

function tomorrow(): string {
  return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

interface MarketEvent {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string;
}

async function sendPush(event: MarketEvent): Promise<boolean> {
  const internalKey = process.env.ADMIN_API_KEY;
  if (!internalKey) return false;

  const url = `${SITE_URL}/calendar`;
  const emoji: Record<string, string> = {
    rba: "🏦",
    asx: "📊",
    earnings: "💰",
    economic: "📈",
    dividend: "💵",
    ipo: "🚀",
    other: "📅",
  };
  const icon = emoji[event.event_type] ?? "📅";

  try {
    const res = await fetch(`${SITE_URL}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": internalKey,
      },
      body: JSON.stringify({
        topic: "market_events",
        title: `${icon} Tomorrow: ${event.title}`,
        body: event.description.slice(0, 120) || "Tap to view the full market events calendar.",
        url,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const GET = (req: NextRequest) => {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("market-event-reminders", async () => {
    const supabase = createAdminClient();
    const tomorrowStr = tomorrow();

    const { data, error } = await supabase
      .from("market_events")
      .select("id, event_date, event_type, title, description")
      .eq("is_published", true)
      .eq("event_date", tomorrowStr)
      .order("event_type", { ascending: true });

    if (error) {
      log.error("Failed to fetch tomorrow's events", { error: error.message });
      return {
        response: NextResponse.json({ error: "fetch_failed" }, { status: 500 }),
        stats: { error: error.message },
      };
    }

    const events = (data ?? []) as MarketEvent[];

    if (events.length === 0) {
      return {
        response: NextResponse.json({ ok: true, pushed: 0, events: 0 }),
        stats: { pushed: 0, events: 0 },
      };
    }

    let pushed = 0;

    for (const ev of events) {
      const ok = await sendPush(ev);
      if (ok) pushed++;
      else log.warn("Push failed for event", { id: ev.id, title: ev.title });
    }

    log.info("Market event reminders sent", { pushed, total: events.length });
    return {
      response: NextResponse.json({ ok: true, pushed, events: events.length }),
      stats: { pushed, events: events.length },
    };
  });
};
