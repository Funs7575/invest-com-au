import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// ── In-memory rate limiter (5 attempts / 60s per IP) ──────────
// Note: best-effort per serverless instance; stale entries are
// cleaned lazily when the map exceeds MAX_MAP_SIZE.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_MAP_SIZE = 1_000;

function isLocked(ipHash: string): { locked: boolean; remaining: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ipHash);

  if (!entry || now > entry.resetAt) {
    // Lazy cleanup when map grows too large
    if (loginAttempts.size > MAX_MAP_SIZE) {
      for (const [key, e] of loginAttempts.entries()) {
        if (now > e.resetAt) loginAttempts.delete(key);
      }
    }
    loginAttempts.set(ipHash, { count: 1, resetAt: now + WINDOW_MS });
    return { locked: false, remaining: MAX_ATTEMPTS - 1 };
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000);
    return { locked: true, remaining: waitSec };
  }
  return { locked: false, remaining: MAX_ATTEMPTS - entry.count };
}

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "invest-com-au-2026";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

export async function POST(request: NextRequest) {
  // Parse body
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const ipHash = hashIP(ip);

  const { locked, remaining } = isLocked(ipHash);
  if (locked) {
    return NextResponse.json(
      { error: `Too many login attempts. Please wait ${remaining} seconds.` },
      { status: 429 }
    );
  }

  // Authenticate via Supabase (server-side)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: error.message, attemptsRemaining: remaining },
      { status: 401 }
    );
  }

  // Verify this user is an admin
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@invest.com.au').split(',').map(e => e.trim().toLowerCase());
  if (!data.user?.email || !ADMIN_EMAILS.includes(data.user.email.toLowerCase())) {
    return NextResponse.json(
      { error: "Access denied. This account is not an administrator." },
      { status: 403 }
    );
  }

  // Success — reset rate limit for this IP
  loginAttempts.delete(ipHash);

  return NextResponse.json({
    success: true,
    session: data.session,
  });
}
