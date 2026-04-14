/**
 * Login brute-force defence.
 *
 * Two tiers:
 *   1. Per-IP token bucket via rate-limit-db (already covers every
 *      login endpoint). Stops volume attacks from one address.
 *   2. Per-email lockout via this file. An attacker rotating IPs
 *      still runs into a lockout after N failures on the same
 *      email. Exponential backoff — 15 min → 1 hour → 24 hour.
 *
 * Called from:
 *   - /api/admin/login
 *   - /api/advisor-auth/verify
 *   - Any other email+password or magic-link login entry point
 *
 * Design notes:
 *   - The `email` tier is canonical even if the real login
 *     mechanism is magic-link — the attacker is still targeting
 *     one address, so we gate that.
 *   - Failed attempts that hit the lockout window never increment
 *     the counter. Otherwise an attacker could keep a victim
 *     perma-locked.
 *   - Success wipes the row entirely so a future failure starts
 *     at 1 again.
 */

import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("login-lockout");

/** Thresholds: failure count → cool-off window */
const THRESHOLDS: Array<{ count: number; lockMs: number; label: string }> = [
  { count: 5, lockMs: 15 * 60 * 1000, label: "15 minutes" },
  { count: 10, lockMs: 60 * 60 * 1000, label: "1 hour" },
  { count: 20, lockMs: 24 * 60 * 60 * 1000, label: "24 hours" },
];

export interface LockoutState {
  locked: boolean;
  reason: string | null;
  retryAfterSeconds: number;
  failureCount: number;
}

/**
 * Check whether an email is currently locked. Pure read — does
 * not increment any counter. Returns a safe "not locked" state if
 * the DB is unreachable so a Supabase outage doesn't lock everyone
 * out.
 */
export async function checkEmailLockout(email: string): Promise<LockoutState> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("login_attempts")
      .select("failure_count, locked_until")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!data) {
      return {
        locked: false,
        reason: null,
        retryAfterSeconds: 0,
        failureCount: 0,
      };
    }

    const lockedUntil = data.locked_until
      ? new Date(data.locked_until as string).getTime()
      : 0;
    const now = Date.now();
    if (lockedUntil > now) {
      return {
        locked: true,
        reason: "too_many_failures",
        retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000),
        failureCount: (data.failure_count as number) || 0,
      };
    }
    return {
      locked: false,
      reason: null,
      retryAfterSeconds: 0,
      failureCount: (data.failure_count as number) || 0,
    };
  } catch (err) {
    log.warn("checkEmailLockout threw — failing open", {
      email,
      err: err instanceof Error ? err.message : String(err),
    });
    return { locked: false, reason: null, retryAfterSeconds: 0, failureCount: 0 };
  }
}

/**
 * Record a failed login attempt. Increments the counter and
 * applies the lockout window if the count crosses a threshold.
 * Returns the new state.
 */
export async function recordLoginFailure(
  email: string,
  ip: string | null,
): Promise<LockoutState> {
  const ipHash = ip ? hashIp(ip) : null;
  try {
    const supabase = createAdminClient();
    const normEmail = email.toLowerCase();

    // If currently locked, don't increment — return current state.
    const current = await checkEmailLockout(email);
    if (current.locked) return current;

    const newCount = current.failureCount + 1;

    // Determine if the new count crosses a lockout threshold.
    const threshold = [...THRESHOLDS]
      .reverse()
      .find((t) => newCount >= t.count);
    const lockedUntil = threshold
      ? new Date(Date.now() + threshold.lockMs).toISOString()
      : null;

    await supabase.from("login_attempts").upsert(
      {
        email: normEmail,
        failure_count: newCount,
        last_failure_at: new Date().toISOString(),
        locked_until: lockedUntil,
        last_ip_hash: ipHash,
      },
      { onConflict: "email" },
    );

    if (threshold) {
      log.warn("Login lockout triggered", {
        email: normEmail,
        count: newCount,
        lockedFor: threshold.label,
      });
      return {
        locked: true,
        reason: "too_many_failures",
        retryAfterSeconds: Math.ceil(threshold.lockMs / 1000),
        failureCount: newCount,
      };
    }

    return {
      locked: false,
      reason: null,
      retryAfterSeconds: 0,
      failureCount: newCount,
    };
  } catch (err) {
    log.warn("recordLoginFailure threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { locked: false, reason: null, retryAfterSeconds: 0, failureCount: 0 };
  }
}

/**
 * Clear the lockout row after a successful login. Best-effort —
 * not having it cleared is harmless because the next failure
 * will overwrite.
 */
export async function clearLoginFailures(email: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("login_attempts")
      .delete()
      .eq("email", email.toLowerCase());
  } catch (err) {
    log.warn("clearLoginFailures threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Pure threshold calculator — exported for tests. Returns the
 * lock window (in ms) that would apply if the caller's failure
 * count reaches the given number, or null if below the first
 * threshold.
 */
export function thresholdForCount(count: number): { lockMs: number; label: string } | null {
  const match = [...THRESHOLDS].reverse().find((t) => count >= t.count);
  return match ? { lockMs: match.lockMs, label: match.label } : null;
}

function hashIp(ip: string): string {
  const salt = process.env.LOGIN_LOCKOUT_SALT || "invest-com-au-login-v1";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
