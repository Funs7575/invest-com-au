/**
 * Cron: watchlist weekly digest (W2.13 / WW-02).
 *
 * For each user with `watchlist_alert_preferences.alerts_opted_in=true`,
 * scan their watchlist for changes since their `last_digest_window_start`
 * (or 7d ago if unset), and send a Resend digest if there's anything to
 * report.
 *
 * Behaviour:
 *   - Empty digests are skipped per-user — never send "nothing changed".
 *   - last_digest_window_start advances to "now" on every successful send,
 *     so weeks with no signal don't carry forward into a giant catch-up
 *     digest the next time something changes.
 *   - De-dup: a successful send updates last_digest_sent_at on the user's
 *     preference row; re-running within the same edition window won't
 *     re-send.
 *
 * Wired into lib/cron-groups.ts under weekly-mon-9. Pure helpers live in
 * lib/watchlist-alerts.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import {
  collectChangesForUser,
  renderWatchlistDigestHtml,
  type ArticleSnapshot,
  type BrokerSnapshot,
  type WatchlistItemRow,
} from "@/lib/watchlist-alerts";

const log = logger("cron:watchlist-alerts");

export const runtime = "nodejs";
export const maxDuration = 300;

const DEFAULT_WINDOW_MS = 7 * 86400_000;
const UNSUBSCRIBE_HREF = "/account/watchlist";
const MANAGE_HREF = "/account/watchlist";

interface PreferenceRow {
  user_id: string;
  last_digest_window_start: string | null;
}

interface UserRow {
  id: string;
  email: string | null;
  raw_user_meta_data: { full_name?: string; name?: string } | null;
}

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const fallbackWindowStart = new Date(now.getTime() - DEFAULT_WINDOW_MS);

  // 1. Opted-in user IDs.
  const { data: prefs, error: prefsErr } = await supabase
    .from("watchlist_alert_preferences")
    .select("user_id, last_digest_window_start")
    .eq("alerts_opted_in", true);

  if (prefsErr) {
    log.error("preferences fetch failed", { error: prefsErr.message });
    return NextResponse.json(
      { error: "prefs_fetch_failed", detail: prefsErr.message },
      { status: 500 },
    );
  }

  const optedIn = (prefs ?? []) as PreferenceRow[];
  if (optedIn.length === 0) {
    log.info("no opted-in users — skipping run");
    return NextResponse.json({ ok: true, skipped: "no_opt_in" });
  }

  // 2. Load shared change-detection inputs (brokers + recent articles)
  //    in two batched queries. Per-user filtering happens in pure JS.
  const userIds = optedIn.map((p) => p.user_id);
  const oldestWindowStart = optedIn.reduce<Date>((acc, p) => {
    const t = p.last_digest_window_start ? new Date(p.last_digest_window_start) : fallbackWindowStart;
    return t < acc ? t : acc;
  }, fallbackWindowStart);

  const { data: itemsRaw, error: itemsErr } = await supabase
    .from("user_watchlist_items")
    .select("user_id, id, item_type, item_slug, display_name")
    .in("user_id", userIds);

  if (itemsErr) {
    log.error("watchlist items fetch failed", { error: itemsErr.message });
    return NextResponse.json(
      { error: "items_fetch_failed", detail: itemsErr.message },
      { status: 500 },
    );
  }

  const itemsByUser = new Map<string, WatchlistItemRow[]>();
  for (const row of itemsRaw ?? []) {
    const r = row as unknown as { user_id: string } & WatchlistItemRow;
    const list = itemsByUser.get(r.user_id) ?? [];
    list.push({
      id: r.id,
      item_type: r.item_type,
      item_slug: r.item_slug,
      display_name: r.display_name,
    });
    itemsByUser.set(r.user_id, list);
  }

  // Resolve the set of broker slugs watched across all opted-in users.
  const watchedBrokerSlugs = new Set<string>();
  for (const items of itemsByUser.values()) {
    for (const item of items) {
      if (item.item_type === "broker") watchedBrokerSlugs.add(item.item_slug);
    }
  }

  const brokers: BrokerSnapshot[] = await fetchBrokerSnapshots(
    supabase,
    Array.from(watchedBrokerSlugs),
    oldestWindowStart,
  );
  const articles: ArticleSnapshot[] = await fetchArticleSnapshots(
    supabase,
    oldestWindowStart,
  );

  // 3. Per-user: build the digest, send if non-empty, record state.
  const users = await fetchAuthUsers(supabase, userIds);
  const stats = { sent: 0, skipped_empty: 0, skipped_no_email: 0, failed: 0 };

  for (const pref of optedIn) {
    const items = itemsByUser.get(pref.user_id) ?? [];
    if (items.length === 0) {
      stats.skipped_empty += 1;
      continue;
    }
    const windowStart = pref.last_digest_window_start
      ? new Date(pref.last_digest_window_start)
      : fallbackWindowStart;

    const changes = collectChangesForUser({ items, windowStart, brokers, articles });
    if (changes.length === 0) {
      stats.skipped_empty += 1;
      continue;
    }

    const user = users.get(pref.user_id);
    if (!user?.email) {
      stats.skipped_no_email += 1;
      continue;
    }

    const recipientName =
      user.raw_user_meta_data?.full_name?.trim() ||
      user.raw_user_meta_data?.name?.trim() ||
      null;

    const html = renderWatchlistDigestHtml({
      changes,
      recipientName,
      now,
      unsubscribeHref: UNSUBSCRIBE_HREF,
      manageHref: MANAGE_HREF,
    });

    if (!html) {
      stats.skipped_empty += 1;
      continue;
    }

    const result = await sendEmail({
      to: user.email,
      subject: `📈 Your watchlist this week — ${changes.length} update${changes.length === 1 ? "" : "s"}`,
      html,
    });

    if (!result.ok) {
      stats.failed += 1;
      log.warn("send failed", { userId: pref.user_id, error: result.error });
      continue;
    }

    stats.sent += 1;
    const nowIso = now.toISOString();
    const { error: updateErr } = await supabase
      .from("watchlist_alert_preferences")
      .update({
        last_digest_sent_at: nowIso,
        last_digest_window_start: nowIso,
        updated_at: nowIso,
      })
      .eq("user_id", pref.user_id);

    if (updateErr) {
      log.warn("preference update after send failed", {
        userId: pref.user_id,
        error: updateErr.message,
      });
    }
  }

  log.info("watchlist digest sweep complete", { ...stats, opted_in: optedIn.length });
  return NextResponse.json({ ok: true, ...stats, opted_in: optedIn.length });
}

async function fetchBrokerSnapshots(
  supabase: ReturnType<typeof createAdminClient>,
  slugs: string[],
  windowStart: Date,
): Promise<BrokerSnapshot[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase
    .from("brokers")
    .select("slug, name, updated_at")
    .in("slug", slugs)
    .gte("updated_at", windowStart.toISOString());

  if (error) {
    log.warn("brokers fetch failed", { error: error.message });
    return [];
  }
  return (data ?? []).map((r) => {
    const row = r as { slug: string; name: string; updated_at: string };
    return { slug: row.slug, name: row.name, updated_at: row.updated_at };
  });
}

async function fetchArticleSnapshots(
  supabase: ReturnType<typeof createAdminClient>,
  windowStart: Date,
): Promise<ArticleSnapshot[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("slug, title, excerpt, related_brokers, published_at")
    .gte("published_at", windowStart.toISOString())
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    log.warn("articles fetch failed", { error: error.message });
    return [];
  }

  return (data ?? []).map((r) => {
    const row = r as {
      slug: string;
      title: string;
      excerpt: string | null;
      related_brokers: unknown;
      published_at: string;
    };
    return {
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      related_brokers: Array.isArray(row.related_brokers)
        ? (row.related_brokers as unknown[]).filter((s): s is string => typeof s === "string")
        : [],
      published_at: row.published_at,
    };
  });
}

async function fetchAuthUsers(
  supabase: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, UserRow>> {
  const out = new Map<string, UserRow>();
  if (userIds.length === 0) return out;

  // auth.admin.listUsers paginates; iterate until we've seen every requested id.
  const requested = new Set(userIds);
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      log.warn("auth user listing failed", { error: error.message, page });
      break;
    }
    const users = data?.users ?? [];
    for (const u of users) {
      if (!requested.has(u.id)) continue;
      out.set(u.id, {
        id: u.id,
        email: u.email ?? null,
        raw_user_meta_data: (u.user_metadata ?? null) as UserRow["raw_user_meta_data"],
      });
    }
    if (users.length < perPage) break;
    if (out.size >= requested.size) break;
    page += 1;
    if (page > 50) break; // hard cap — 10k users at 200/page; revisit if we cross this
  }
  return out;
}
