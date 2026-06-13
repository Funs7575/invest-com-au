/**
 * advisor-push — supply-side web-push delivery for the Adviser Push
 * Command Centre (RETENTION_MARKETPLACE_MEGA_SESSIONS idea #8).
 *
 * The consumer push pipeline (lib/push-dispatch.ts, lib/vapid-jwt.ts,
 * public/sw.js, push_subscriptions) is reused wholesale: same VAPID
 * transport, same `push_subscriptions` table, same stale-endpoint prune.
 * The only differences from `dispatchPushToUser` are:
 *
 *   1. Subscriptions are keyed by `professional_id` (owner_kind='advisor')
 *      rather than `user_id` (owner_kind='user').
 *   2. A NEW dormant feature flag `advisor_push` gates EVERY send — flag
 *      off ⇒ no-op (so the whole feature ships dark, and nothing 500s if
 *      the migration columns are not yet present in an environment where
 *      the flag is also off).
 *   3. Per-event preferences (`notification_prefs` jsonb on the row) gate
 *      each notification type. A missing key is treated as enabled
 *      (fail-open to "notify") so older rows still receive sends.
 *
 * Fire-and-forget-safe: returns a summary and never throws. Sends fail
 * soft — callers (notify fan-out, message route, dispute route, SLA
 * sweep) `void` this and swallow.
 *
 * AFSL note: callers own AFSL-safe copy. This module is transport only.
 */

// eslint-disable-next-line no-restricted-imports -- dispatches to a specific advisor's push_subscriptions rows from cron / route-handler contexts with no advisor JWT (advisor_sessions has no auth.uid() linkage); service-role is the documented path per CLAUDE.md § "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";
import { buildVapidAuthHeader } from "@/lib/vapid-jwt";
import type { PushPayload, DispatchResult, FetchLike } from "@/lib/push-dispatch";

const log = logger("advisor-push");

/** NEW dormant flag — fail-closed gate for the entire feature. */
export const ADVISOR_PUSH_FLAG = "advisor_push";

/**
 * The four adviser-facing notification events. Each maps to a key in the
 * subscription row's `notification_prefs` jsonb. The deep link + copy are
 * the caller's responsibility; this enum only gates delivery.
 */
export type AdvisorPushEvent =
  | "new_brief"
  | "new_message"
  | "dispute"
  | "sla_warning";

export const ADVISOR_PUSH_EVENTS: readonly AdvisorPushEvent[] = [
  "new_brief",
  "new_message",
  "dispute",
  "sla_warning",
] as const;

/** Default preference set — every event on. Used when a row has no prefs. */
export function defaultAdvisorPushPrefs(): Record<AdvisorPushEvent, boolean> {
  return {
    new_brief: true,
    new_message: true,
    dispute: true,
    sla_warning: true,
  };
}

interface AdvisorPushSubscriptionRow {
  id: string;
  endpoint: string;
  keys_p256dh: string;
  keys_auth: string;
  notification_prefs: Record<string, unknown> | null;
}

/**
 * A missing key is "enabled" — fail-open to notify. Only an explicit
 * `false` suppresses the event for that subscription.
 */
function prefAllows(
  prefs: Record<string, unknown> | null | undefined,
  event: AdvisorPushEvent,
): boolean {
  if (!prefs) return true;
  return prefs[event] !== false;
}

/**
 * Dispatch a push notification to all of an advisor's registered browser
 * subscriptions for a given event. Returns a summary; never throws.
 *
 * Guards (any one ⇒ no-op, returns the zeroed result):
 *   - `advisor_push` flag disabled (the default — feature ships dark).
 *   - VAPID keys not configured.
 *   - No advisor subscription rows (or none with the event enabled).
 *   - Migration columns absent (the query errors → swallowed, result returned).
 *
 * Stale endpoints (410 Gone / 404 Not Found) are pruned, exactly like the
 * consumer dispatcher.
 *
 * @param professionalId  professionals.id of the target adviser.
 * @param event           which adviser event this is (preference-gated).
 * @param payload         notification content (title, body, url deep link).
 * @param sender          override fetch for unit tests.
 */
export async function dispatchPushToAdvisor(
  professionalId: number,
  event: AdvisorPushEvent,
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
    // 1. Dormancy gate — flag off ⇒ no send, nothing touches the DB.
    const enabled = await isFlagEnabled(ADVISOR_PUSH_FLAG, { segment: "advisor" });
    if (!enabled) {
      result.skipped_no_sub = true;
      return result;
    }

    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
      log.warn("advisor-push skipped: VAPID keys not configured", { professionalId });
      result.skipped_no_sub = true;
      return result;
    }

    const supabase = createAdminClient();

    // 2. Load the advisor's active browser subscriptions.
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, keys_p256dh, keys_auth, notification_prefs")
      .eq("owner_kind", "advisor")
      .eq("professional_id", professionalId);

    if (subsErr) {
      // Includes the "column does not exist" case in an environment that has
      // the flag on but the migration not yet applied — fail soft.
      log.warn("advisor-push: subscription fetch failed", {
        professionalId,
        error: subsErr.message,
      });
      result.skipped_no_sub = true;
      return result;
    }

    const rows = (subs ?? []) as AdvisorPushSubscriptionRow[];

    // 3. Preference gate per subscription.
    const targets = rows.filter((s) => prefAllows(s.notification_prefs, event));
    if (targets.length === 0) {
      result.skipped_no_sub = true;
      return result;
    }

    // 4. Build payload. `tag` defaults to the event so repeat notifications
    //    of the same kind collapse on the lock screen.
    const payloadJson = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      icon: payload.icon ?? "/icon-192.png",
      tag: payload.tag ?? `advisor-${event}`,
    });

    // 5. Send to each endpoint concurrently.
    const staleIds: string[] = [];
    const results = await Promise.allSettled(
      targets.map(async (sub) => {
        const authHeader = await buildVapidAuthHeader(
          sub.endpoint,
          vapidPrivate,
          vapidPublic,
        );
        const res = await sender(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            TTL: "86400",
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

    // 6. Collect outcome; mark stale endpoints for pruning.
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        result.sent++;
      } else {
        result.failed++;
        const code = (r.reason as { statusCode?: number })?.statusCode;
        if (code === 410 || code === 404) {
          const target = targets[i];
          if (target) staleIds.push(target.id);
        }
      }
    });

    // 7. Prune stale subscriptions.
    if (staleIds.length > 0) {
      const { error: pruneErr } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", staleIds);
      if (pruneErr) {
        log.warn("advisor-push: stale prune failed", {
          professionalId,
          ids: staleIds,
          error: pruneErr.message,
        });
      } else {
        result.stale_removed = staleIds.length;
      }
    }

    if (result.sent > 0 || result.failed > 0) {
      log.info("advisor-push complete", { professionalId, event, ...result });
    }
  } catch (err) {
    log.warn("advisor-push threw unexpectedly", {
      professionalId,
      event,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}
