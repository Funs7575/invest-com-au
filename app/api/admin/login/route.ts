import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "invest-com-au-2026";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

  const { locked, remaining } = await checkRateLimit(ipHash);
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
  await clearRateLimit(ipHash);

  return NextResponse.json({
    success: true,
    session: data.session,
  });
}
