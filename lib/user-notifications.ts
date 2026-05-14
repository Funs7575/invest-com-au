/**
 * Marketplace-event adapter for the in-app notification inbox (C1 / mm06).
 *
 * The general inbox primitives live in `lib/notifications.ts` and key off
 * `user_id`, `type`, `link_url`. Marketplace fan-out call sites express
 * intent in domain terms — `authUserId`, `kind`, `href` — so this thin
 * adapter maps the spec's shape to the existing table without forking a
 * second inbox.
 *
 * Why two interfaces? Different callers, different concerns:
 *   - `notifyUser({ userId, type, linkUrl })` — long-running general inbox
 *     (deal cron, fee-change cron, article replies). Already wired across
 *     the codebase.
 *   - `enqueueUserNotification({ authUserId, kind, href })` — marketplace
 *     fan-out (briefs, top-ups, quote_received). Added by mm06.
 *
 * Both write to `public.user_notifications`. The mm06 migration extended
 * the `type` CHECK constraint with the new kind values so the same table
 * accepts both shapes.
 *
 * Fire-and-forget on DB errors — a broken inbox must never break the
 * caller (provider acceptance, admin risk action, auto-recharge webhook
 * all proceed regardless).
 */

import {
  notifyUser,
  notifyUserByEmail,
  type NotificationType,
} from "@/lib/notifications";

/**
 * Marketplace-event kinds. Aligned with the CHECK-constraint extension
 * landed by `20260514_mm06_user_notifications.sql`.
 */
export type UserNotificationKind =
  | "brief_accepted"
  | "message_received"
  | "outcome_request"
  | "plan_diff"
  | "topup_succeeded"
  | "topup_failed"
  | "quote_received"
  | "generic";

export interface EnqueueUserNotificationInput {
  authUserId: string;
  kind: UserNotificationKind;
  title: string;
  body?: string | null;
  href?: string | null;
}

/**
 * Insert a marketplace notification for the given auth user. Returns
 * true on insert, false on error / no-op.
 *
 * Refuses to write when `authUserId` is missing — marketplace lookups
 * sometimes fail to resolve a user (e.g. a provider with an email but
 * no matching auth row), and a row with a null user_id would be
 * unreachable from the inbox.
 */
export async function enqueueUserNotification(
  input: EnqueueUserNotificationInput,
): Promise<boolean> {
  if (!input.authUserId || typeof input.authUserId !== "string") {
    return false;
  }
  return notifyUser({
    userId: input.authUserId,
    // The `notifications` lib types its enum narrowly; the underlying
    // table CHECK constraint was widened in mm06 to accept the new
    // marketplace kinds. We cast on the boundary rather than splay the
    // narrower union across every call site.
    type: input.kind as unknown as NotificationType,
    title: input.title,
    body: input.body ?? null,
    linkUrl: input.href ?? null,
  });
}

/**
 * Convenience: enqueue a marketplace notification keyed by email.
 *
 * Marketplace flows (brief accept, admin risk decision, auto-recharge
 * webhook) often only have the consumer/provider's email — not their
 * auth_user_id — at hand. Internally this delegates to
 * `notifyUserByEmail` which uses the existing email→userId lookup map.
 *
 * Returns `false` when the email doesn't match an auth.users row
 * (anonymous brief flow, deleted user, etc.). Never throws.
 */
export async function enqueueUserNotificationByEmail(
  email: string | null | undefined,
  input: Omit<EnqueueUserNotificationInput, "authUserId">,
): Promise<boolean> {
  if (!email) return false;
  const result = await notifyUserByEmail(email, {
    type: input.kind as unknown as NotificationType,
    title: input.title,
    body: input.body ?? null,
    linkUrl: input.href ?? null,
  });
  return result.notified;
}
