import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// ── In-memory rate limiter (5 attempts / 60s per IP) ──────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function isLocked(ipHash: string): { locked: boolean; remaining: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ipHash);

  if (!entry || now > entry.resetAt) {
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

// Clean up stale entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) loginAttempts.delete(key);
  }
}, 120_000);

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

  // Success — reset rate limit for this IP
  loginAttempts.delete(ipHash);

  return NextResponse.json({
    success: true,
    session: data.session,
  });
}
