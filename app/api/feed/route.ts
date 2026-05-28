/**
 * /api/feed
 *
 * GET  — paginated unified feed for the logged-in homepage.
 *
 * Query params:
 *   tab    : for_you | markets | community | advisors  (default: for_you)
 *   cursor : ISO-8601 timestamp — return events older than this (default: now)
 *   limit  : 1–40 (default: 20)
 *
 * Response: { events: FeedEvent[], nextCursor: string | null }
 *
 * Personalization (for_you + advisors tabs):
 *   If authenticated, advisor_post events from followed advisors receive a
 *   ranking boost. Returned events are re-ordered by composite score within
 *   each fetched batch.
 *
 * Rate-limit: 60/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  getTabEventTypes,
  rankFeedEvents,
  type FeedTab,
  type FeedEvent,
} from "@/lib/feed-ranking";

export const runtime = "nodejs";

const log = logger("api:feed");

const VALID_TABS = new Set<FeedTab>([
  "for_you",
  "markets",
  "community",
  "advisors",
]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 40;

export async function GET(req: NextRequest) {
  if (!(await isAllowed("feed_get", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(req.url);
  const tabRaw = url.searchParams.get("tab") ?? "for_you";
  const tab: FeedTab = VALID_TABS.has(tabRaw as FeedTab)
    ? (tabRaw as FeedTab)
    : "for_you";
  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? new Date(cursorRaw) : new Date();
  if (isNaN(cursor.getTime())) {
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  }
  const limitRaw = parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw));

  // Fetch optional auth for personalization — don't block on failure
  let followedAdvisorRefIds = new Set<string>();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && (tab === "for_you" || tab === "advisors")) {
      const { data: follows } = await supabase
        .from("advisor_follows")
        .select("following_professional_id")
        .eq("follower_user_id", user.id);
      followedAdvisorRefIds = new Set(
        (follows ?? []).map((f) => String(f.following_professional_id)),
      );
    }
  } catch {
    // Personalization is optional — proceed without it
  }

  // Build query — admin client to avoid requiring caller cookies
  const admin = createAdminClient();
  let query = admin
    .from("feed_events")
    .select("id, event_type, ref_id, headline, summary, actor_name, actor_slug, entity_slug, image_url, score_base, published_at")
    .lt("published_at", cursor.toISOString())
    .order("published_at", { ascending: false })
    .limit(limit + 1); // +1 to detect hasMore

  const eventTypes = getTabEventTypes(tab);
  if (eventTypes !== null) {
    query = query.in("event_type", eventTypes);
  }

  const { data, error } = await query;

  if (error) {
    log.warn("feed GET failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as FeedEvent[];
  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit);

  // Re-rank within the fetched batch for personalized tabs
  const ranked = tab === "for_you" || tab === "advisors"
    ? rankFeedEvents(events, followedAdvisorRefIds)
    : events;

  // Cursor is the published_at of the last event in the original (pre-ranked)
  // chronological batch so the next page continues where we left off in time.
  const lastEvent = events[events.length - 1];
  const nextCursor = hasMore && lastEvent ? lastEvent.published_at : null;

  return NextResponse.json({ events: ranked, nextCursor });
}
