/**
 * In-app notification helpers.
 *
 * The `user_notifications` table holds a per-user inbox. Writers
 * call `notifyUser()` from anywhere in the backend (cron, webhook,
 * admin action) to drop a row. A bell icon in the header polls
 * the unread count; the /account/notifications page renders the
 * full list.
 *
 * Every notification optionally carries an `email_delivery_key` —
 * when present, we refuse to insert a duplicate with the same key
 * so a cron that already emailed the user doesn't also spam their
 * inbox with the same reminder.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("notifications");

export type NotificationType =
  | "system"
  | "deal"
  | "fee_change"
  | "reply"
  | "referral"
  | "announcement";

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  /** If set, dedup per (userId, email_delivery_key). Useful to
   *  pair with a drip cron so we only notify once per cycle. */
  emailDeliveryKey?: string | null;
}

/**
 * Insert a notification. Returns true if a new row landed, false
 * if we deduped against an existing row. Fire-and-forget on DB
 * errors — a broken inbox should never break the caller.
 */
export async function notifyUser(input: NotificationInput): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    // Dedup when an email delivery key is provided
    if (input.emailDeliveryKey) {
      const { data: existing } = await supabase
        .from("user_notifications")
        .select("id")
        .eq("user_id", input.userId)
        .eq("email_delivery_key", input.emailDeliveryKey)
        .limit(1);
      if (existing && existing.length > 0) return false;
    }

    const { error } = await supabase.from("user_notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body ? input.body.slice(0, 2000) : null,
      link_url: input.linkUrl ? input.linkUrl.slice(0, 500) : null,
      email_delivery_key: input.emailDeliveryKey ?? null,
    });
    if (error) {
      log.warn("user_notifications insert failed", {
        userId: input.userId,
        type: input.type,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("notifyUser threw", {
      userId: input.userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Count unread notifications for a user. Used by the header bell.
 * Returns 0 on error (don't crash the nav bar).
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    return count || 0;
  } catch {
    return 0;
  }
}

/** Mark a single notification as read */
export async function markRead(userId: string, notificationId: number): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", notificationId);
  } catch (err) {
    log.warn("markRead threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Mark every notification for a user as read */
export async function markAllRead(userId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
  } catch (err) {
    log.warn("markAllRead threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Load every registered user's email → user_id mapping into a Map.
 *
 * Crons that want to fire inbox notifications for a subscriber list
 * (keyed by email) should call this once at the top of their handler
 * and reuse the returned Map for O(1) lookups. Listing users is
 * expensive (paginated) so we don't want to do it per subscriber.
 *
 * Supabase's admin.listUsers() returns at most 1000 per page. We
 * fetch pages until the cursor runs dry or we hit a generous cap
 * (10 pages = 10k users) so runaway auth tables can't freeze a cron.
 */
export async function buildEmailToUserIdMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const supabase = createAdminClient();
    const PER_PAGE = 1000;
    const MAX_PAGES = 10;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (error || !data?.users || data.users.length === 0) break;
      for (const u of data.users) {
        if (u.email) map.set(u.email.toLowerCase(), u.id);
      }
      if (data.users.length < PER_PAGE) break;
    }
  } catch (err) {
    log.warn("buildEmailToUserIdMap threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return map;
}

/**
 * Single-shot lookup + notify by email. Convenient for routes that
 * only need to notify one user; internally builds the map, so do
 * NOT call this in a loop — use `buildEmailToUserIdMap()` first and
 * then call `notifyUser()` directly.
 *
 * Returns:
 *   { notified: true, userId }  — row landed in user_notifications
 *   { notified: false, reason } — no matching user, or dedup'd
 */
export async function notifyUserByEmail(
  email: string,
  input: Omit<NotificationInput, "userId">,
): Promise<{ notified: boolean; userId?: string; reason?: string }> {
  if (!email || typeof email !== "string") {
    return { notified: false, reason: "missing_email" };
  }
  const normalized = email.trim().toLowerCase();
  const map = await buildEmailToUserIdMap();
  const userId = map.get(normalized);
  if (!userId) return { notified: false, reason: "no_matching_user" };
  const ok = await notifyUser({ ...input, userId });
  return ok
    ? { notified: true, userId }
    : { notified: false, reason: "dedup_or_insert_failed", userId };
}
