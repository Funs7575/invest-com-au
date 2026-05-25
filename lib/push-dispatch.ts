/**
 * push-dispatch — server-side web-push delivery helper.
 *
 * Sends a Web Push notification to every browser subscription registered
 * for a given userId. Stale subscriptions (push server returns 410 Gone
 * or 404 Not Found) are pruned automatically.
 *
 * Usage inside a cron / route handler:
 *
 *   import { dispatchPushToUser } from "@/lib/push-dispatch";
 *
 *   await dispatchPushToUser(userId, {
 *     title: "Savings rate alert",
 *     body:  "Your threshold was crossed.",
 *     url:   "/savings-accounts",
 *   });
 *
 * The helper is fire-and-forget-safe: it returns a summary record and
 * never throws — callers should log failures but should not block on
 * them.
 *
 * Dependency-injection:
 *   The optional `sender` parameter accepts a function with the same
 *   signature as `fetch`. Tests pass a mock so no real HTTP is issued.
 *
 * AFSL note:
 *   Callers are responsible for AFSL-safe copy. This module only
 *   handles transport; it applies no compliance filtering.
 */

// eslint-disable-next-line no-restricted-imports -- runs from the alert crons (no user JWT), dispatching to a specific user's push_subscriptions rows; service-role required for this cross-user/cron context
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { buildVapidAuthHeader } from "@/lib/vapid-jwt";

const log = logger("push-dispatch");

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  icon?: string;
  /** Used as the notification `tag` in the service worker (dedups visible toasts). */
  tag?: string;
}

export interface DispatchResult {
  sent: number;
  failed: number;
  skipped_no_sub: boolean;
  stale_removed: number;
}

/**
 * The subset of `fetch` that push-dispatch needs — injectable for tests.
 * The default value is `globalThis.fetch`, which is available in both
 * Node 20+ (cron routes) and the Edge runtime.
 */
export type FetchLike = (
  url: string,
  init: RequestInit
) => Promise<{ ok: boolean; status: number }>;

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
}

// ── Core dispatch ──────────────────────────────────────────────────────────────

/**
 * Dispatch a push notification to all registered browser subscriptions for
 * a given `userId`. Returns a summary; never throws.
 *
 * Guards:
 *   - Skips immediately if VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.
 *   - Skips if the user has no `push_subscriptions` rows.
 *   - Prunes endpoints that reply 410 or 404 (browser revoked permission).
 *
 * @param userId    Supabase auth user UUID.
 * @param payload   Notification content (title, body, url).
 * @param sender    Override fetch for unit tests. Defaults to globalThis.fetch.
 */
export async function dispatchPushToUser(
  userId: string,
  payload: PushPayload,
  sender: FetchLike = globalThis.fetch as FetchLike,
): Promise<DispatchResult> {
  const result: DispatchResult = {
    sent: 0,
    failed: 0,
    skipped_no_sub: false,
    stale_removed: 0,
  };

  try {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
      log.warn("push-dispatch skipped: VAPID keys not configured", { userId });
      return result;
    }

    const supabase = createAdminClient();

    // 1. Check user has opted in via notification_preferences.browser_push
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("browser_push")
      .eq("user_id", userId)
      .maybeSingle();

    if (!prefs?.browser_push) {
      // User hasn't opted in (null or false). Skip silently.
      result.skipped_no_sub = true;
      return result;
    }

    // 2. Load the user's active browser subscriptions
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys_p256dh, keys_auth")
      .eq("user_id", userId);

    if (subsErr) {
      log.warn("push-dispatch: subscription fetch failed", {
        userId,
        error: subsErr.message,
      });
      return result;
    }

    if (!subs || subs.length === 0) {
      result.skipped_no_sub = true;
      return result;
    }

    // 3. Build notification payload
    const payloadJson = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      icon: payload.icon ?? "/icon-192.png",
      tag: payload.tag ?? "rate-alert",
    });

    // 4. Send to each endpoint concurrently
    const staleIds: string[] = [];

    const results = await Promise.allSettled(
      (subs as PushSubscriptionRow[]).map(async (sub) => {
        // RFC 8292 — ES256 JWT signed with the VAPID private key.
        // buildVapidAuthHeader returns: `vapid t=<jwt>, k=<publicKey>`
        const authHeader = await buildVapidAuthHeader(
          sub.endpoint,
          vapidPrivate,
          vapidPublic,
        );

        const res = await sender(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
            Authorization: authHeader,
          },
          body: payloadJson,
        });

        if (!res.ok) {
          const err = new Error(`Push failed for endpoint: HTTP ${res.status}`);
          (err as Error & { statusCode: number }).statusCode = res.status;
          throw err;
        }
      }),
    );

    // 5. Collect outcome; mark stale endpoints for pruning
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        result.sent++;
      } else {
        result.failed++;
        const code = (r.reason as { statusCode?: number })?.statusCode;
        if (code === 410 || code === 404) {
          staleIds.push((subs as PushSubscriptionRow[])[i].id);
        }
      }
    });

    // 6. Prune stale subscriptions
    if (staleIds.length > 0) {
      const { error: pruneErr } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);

      if (pruneErr) {
        log.warn("push-dispatch: stale prune failed", {
          userId,
          ids: staleIds,
          error: pruneErr.message,
        });
      } else {
        result.stale_removed = staleIds.length;
      }
    }

    if (result.sent > 0 || result.failed > 0) {
      log.info("push-dispatch complete", { userId, ...result });
    }
  } catch (err) {
    log.warn("push-dispatch threw unexpectedly", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}
