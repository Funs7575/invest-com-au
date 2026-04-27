import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { ADMIN_EMAILS } from "@/lib/admin";
import { logger } from "@/lib/logger";
import {
  checkEmailLockout,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/login-lockout";
import {
  isAdminMfaEnrolled,
  verifyAdminMfaCode,
  verifyAdminRecoveryCode,
} from "@/lib/admin-mfa";
import { isFlagEnabled } from "@/lib/feature-flags";

const log = logger("admin-login");

const INITIAL_WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

/**
 * Exponential backoff schedule (audit K-03 — defense against the
 * "wait out the 60s and retry" pattern). After the IP hits the
 * MAX_ATTEMPTS burst threshold, each additional in-window attempt
 * extends the lockout to the next tier.
 *
 * count threshold | lockout window
 * --------------- | ---------------
 *      ≤ 5        | 60 s   (initial burst window)
 *      6–10       | 5 min  (1st extension)
 *     11–20       | 15 min (2nd extension)
 *      21+        | 60 min (cap)
 *
 * Past 60 min the attacker has clearly given up on burst attempts
 * and has switched to a slow distributed approach — the email-tier
 * lockout (`lib/login-lockout.ts`, 15 min → 1 hr → 24 hr by
 * failure count) takes over from there.
 */
function getBackoffWindowMs(count: number): number {
  if (count <= MAX_ATTEMPTS) return INITIAL_WINDOW_MS;
  if (count <= 10) return 5 * 60_000;
  if (count <= 20) return 15 * 60_000;
  return 60 * 60_000;
}

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "invest-com-au-2026";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

function createAdminSupabase() {
  return createAdminClient();
}

async function checkRateLimit(ipHash: string): Promise<{ locked: boolean; remaining: number }> {
  const supabase = createAdminSupabase();
  const now = new Date();

  // Atomically increment-or-insert the counter via a DB function (K-11).
  // The old SELECT → upsert/UPDATE pattern had a TOCTOU race: two concurrent
  // requests could both read count=N, both compute N+1, and both write N+1 —
  // losing one increment and allowing an extra attempt through the budget.
  // admin_rate_limit_increment does the increment in one INSERT ... ON CONFLICT
  // DO UPDATE statement, closing the race window.
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "admin_rate_limit_increment",
    { p_ip_hash: ipHash, p_initial_window_ms: INITIAL_WINDOW_MS },
  );

  if (rpcError || !rpcData || (rpcData as unknown[]).length === 0) {
    // Fail-open: don't block legitimate admin logins on a transient DB error.
    log.warn("admin-rate-limit RPC error — failing open", {
      err: rpcError?.message ?? "empty result",
    });
    return { locked: false, remaining: MAX_ATTEMPTS };
  }

  const row = (rpcData as { attempt_count: number; reset_at: string }[])[0]!;
  const newCount = row.attempt_count;
  const currentResetAt = new Date(row.reset_at);

  if (newCount > MAX_ATTEMPTS) {
    // Apply the exponential backoff extension. This UPDATE is non-atomic with
    // the counter increment — concurrent extensions write the same monotonic
    // value, so the worst-case race is a harmless double-write to the same
    // future timestamp.
    const backoffMs = getBackoffWindowMs(newCount);
    const extendedResetAt = new Date(now.getTime() + backoffMs);
    if (extendedResetAt > currentResetAt) {
      await supabase
        .from("admin_login_attempts")
        .update({ reset_at: extendedResetAt.toISOString() })
        .eq("ip_hash", ipHash);
      const waitSec = Math.ceil((extendedResetAt.getTime() - now.getTime()) / 1000);
      return { locked: true, remaining: waitSec };
    }
    const waitSec = Math.ceil((currentResetAt.getTime() - now.getTime()) / 1000);
    return { locked: true, remaining: waitSec };
  }

  return { locked: false, remaining: MAX_ATTEMPTS - newCount };
}

async function clearRateLimit(ipHash: string): Promise<void> {
  const supabase = createAdminSupabase();
  await supabase
    .from("admin_login_attempts")
    .delete()
    .eq("ip_hash", ipHash);
}

export async function POST(request: NextRequest) {
  // Parse body
  let body: {
    email?: string;
    password?: string;
    mfa_code?: string;
    recovery_code?: string;
  };
  try {
    body = await request.json();
  } catch (err) {
    log.warn("Admin login invalid JSON", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password, mfa_code, recovery_code } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // ── Rate limit by IP (existing legacy tier) ──
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const ipHash = hashIP(ip);

  const { locked, remaining } = await checkRateLimit(ipHash);
  if (locked) {
    return NextResponse.json(
      { error: `Too many login attempts. Please wait ${remaining} seconds.` },
      { status: 429 }
    );
  }

  // ── Email-tier lockout ──
  // Protects against attackers rotating IPs against a single admin.
  const emailLockout = await checkEmailLockout(email);
  if (emailLockout.locked) {
    return NextResponse.json(
      {
        error: `This account is temporarily locked. Try again in ${Math.ceil(emailLockout.retryAfterSeconds / 60)} minutes.`,
      },
      { status: 429 }
    );
  }

  // ── Authenticate via Supabase (server-side) ──
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Failed password — increment the email counter.
    await recordLoginFailure(email, ip);
    return NextResponse.json(
      { error: error.message, attemptsRemaining: remaining },
      { status: 401 }
    );
  }

  // Verify this user is an admin
  if (!data.user?.email || !ADMIN_EMAILS.includes(data.user.email.toLowerCase())) {
    // Still record the failure so "found an admin password but
    // not an allowlisted email" counts toward lockout too.
    await recordLoginFailure(email, ip);
    return NextResponse.json(
      { error: "Access denied. This account is not an administrator." },
      { status: 403 }
    );
  }

  // ── MFA gate ──
  // If the admin has MFA enrolled, password alone is not enough.
  // A feature flag lets us enforce MFA for all admins once enough
  // of them have enrolled.
  const adminEmail = data.user.email.toLowerCase();
  const enrolled = await isAdminMfaEnrolled(adminEmail);
  const mfaRequired = await isFlagEnabled("admin_mfa_required", { segment: "admin" });

  if (enrolled || mfaRequired) {
    if (!mfa_code && !recovery_code) {
      // Step-up: ask the client to collect a code
      if (!enrolled) {
        // Required but not enrolled — tell the user to enrol via
        // the admin console rather than blocking them forever.
        return NextResponse.json(
          {
            error: "MFA is required for admin login. Please enrol via /admin/settings/mfa.",
            code: "mfa_required_not_enrolled",
          },
          { status: 403 },
        );
      }
      return NextResponse.json(
        {
          error: "MFA code required",
          code: "mfa_required",
        },
        { status: 401 },
      );
    }

    const result = recovery_code
      ? await verifyAdminRecoveryCode(adminEmail, recovery_code)
      : await verifyAdminMfaCode(adminEmail, mfa_code || "");

    if (result !== "ok") {
      await recordLoginFailure(email, ip);
      const msg =
        result === "bad_code"
          ? "Invalid MFA code"
          : result === "disabled"
            ? "MFA is disabled for this account"
            : "MFA not enrolled";
      return NextResponse.json({ error: msg, code: result }, { status: 401 });
    }
  }

  // Success — reset both rate limiters
  await clearRateLimit(ipHash);
  await clearLoginFailures(email);

  return NextResponse.json({
    success: true,
    user: { email: data.session?.user?.email },
  });
}
