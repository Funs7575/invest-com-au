/**
 * Market events — data layer for the public events calendar.
 *
 * Single source for reading published `market_events` rows (RBA cash
 * rate decisions, ABS economic releases, ASX rebalances, dividend and
 * IPO dates) plus the pure ordering/grouping helpers shared by
 * /calendar, /today and any future consumer (e.g. RBA-day community
 * megathreads — see docs/plans/COMMUNITY_MASTER_PLAN.md).
 *
 * All output is FACTUAL scheduling data sourced from the relevant
 * authority's published schedule — no commentary, no forecasts.
 *
 * RLS: `market_events` has an anon SELECT policy scoped to
 * `is_published = true`, so reads go through the standard server
 * client — no service role needed.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("market-events");

export interface MarketEvent {
  id: number;
  /** Calendar date of the event (YYYY-MM-DD). */
  event_date: string;
  /** One of: rba | asx | earnings | economic | dividend | ipo | other. */
  event_type: string;
  title: string;
  description: string;
  source_url: string;
  is_all_day: boolean;
  /** HH:MM:SS local to `timezone`, when not all-day. */
  start_time: string | null;
  timezone: string;
}

/** Display labels per event type (presentation colours stay page-side). */
export const MARKET_EVENT_TYPE_LABELS: Record<string, string> = {
  rba: "RBA",
  asx: "ASX",
  earnings: "Earnings",
  economic: "Economic",
  dividend: "Dividend",
  ipo: "IPO",
  other: "Other",
};

/** UTC calendar day (YYYY-MM-DD) — matches the convention used by the calendar page and API. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusOneYear(fromIso: string): string {
  const d = new Date(`${fromIso}T00:00:00.000Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Pure helpers (unit-tested) ──────────────────────────────────

/**
 * Filter a list of events to those on-or-after `fromIso`, sorted by
 * event_date ascending (ties keep stable input order), optionally
 * capped at `limit`. Pure — usable on any in-memory event list.
 */
export function filterUpcoming(
  events: MarketEvent[],
  fromIso: string,
  limit?: number,
): MarketEvent[] {
  const upcoming = events
    .filter((ev) => ev.event_date >= fromIso)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
  return typeof limit === "number" ? upcoming.slice(0, Math.max(0, limit)) : upcoming;
}

/**
 * The next (earliest) event of a given type from an event list, or
 * null. Intended for "next RBA decision" style lookups — e.g. the
 * /today TL;DR and future RBA-day megathread wiring.
 */
export function nextEventOfType(
  events: MarketEvent[],
  eventType: string,
): MarketEvent | null {
  let next: MarketEvent | null = null;
  for (const ev of events) {
    if (ev.event_type !== eventType) continue;
    if (!next || ev.event_date < next.event_date) next = ev;
  }
  return next;
}

/** Group events by YYYY-MM month key, preserving input order within each month. */
export function groupEventsByMonth(events: MarketEvent[]): Map<string, MarketEvent[]> {
  const map = new Map<string, MarketEvent[]>();
  for (const ev of events) {
    const key = ev.event_date.slice(0, 7); // YYYY-MM
    const arr = map.get(key) ?? [];
    arr.push(ev);
    map.set(key, arr);
  }
  return map;
}

// ─── I/O ─────────────────────────────────────────────────────────

export interface UpcomingEventsOptions {
  /** Inclusive start date (YYYY-MM-DD). Defaults to today (UTC). */
  from?: string;
  /** Inclusive end date (YYYY-MM-DD). Defaults to one year after `from`. */
  to?: string;
  /** Maximum rows returned. Defaults to 200 (matches /calendar). */
  limit?: number;
}

/**
 * Read upcoming published market events, ordered by event_date
 * ascending. Returns [] on any error so pages degrade to an honest
 * empty state rather than throwing.
 */
export async function getUpcomingMarketEvents(
  options: UpcomingEventsOptions = {},
): Promise<MarketEvent[]> {
  const from = options.from ?? todayIso();
  const to = options.to ?? plusOneYear(from);
  const limit = options.limit ?? 200;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("market_events")
      .select(
        "id, event_date, event_type, title, description, source_url, is_all_day, start_time, timezone",
      )
      .eq("is_published", true)
      .gte("event_date", from)
      .lte("event_date", to)
      .order("event_date", { ascending: true })
      .limit(limit);
    if (error) {
      log.error("getUpcomingMarketEvents failed", { error: error.message });
      return [];
    }
    return (data as MarketEvent[] | null) ?? [];
  } catch (err) {
    log.error("getUpcomingMarketEvents threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
