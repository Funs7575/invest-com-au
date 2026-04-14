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

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

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
  const resetAt = new Date(now.getTime() + WINDOW_MS);

  // Try to get existing entry
  const { data: entry } = await supabase
    .from("admin_login_attempts")
    .select("count, reset_at")
    .eq("ip_hash", ipHash)
    .single();

  if (!entry || new Date(entry.reset_at) < now) {
    // No entry or expired — upsert a fresh one
    await supabase
      .from("admin_login_attempts")
      .upsert({ ip_hash: ipHash, count: 1, reset_at: resetAt.toISOString() });
    return { locked: false, remaining: MAX_ATTEMPTS - 1 };
  }

  // Increment count
  const newCount = entry.count + 1;
  await supabase
    .from("admin_login_attempts")
    .update({ count: newCount })
    .eq("ip_hash", ipHash);

  if (newCount > MAX_ATTEMPTS) {
    const waitSec = Math.ceil((new Date(entry.reset_at).getTime() - now.getTime()) / 1000);
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
