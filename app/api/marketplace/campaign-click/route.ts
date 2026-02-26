import { createClient } from "@supabase/supabase-js";
import { recordCpcClick } from "@/lib/marketplace/allocation";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";

// In-memory rate limiter (per-IP, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 CPC clicks per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "invest-com-au-2026";
  if (!process.env.IP_HASH_SALT) console.warn("[env] IP_HASH_SALT not set — using default. Set this env var in production.");
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

/**
 * POST /api/marketplace/campaign-click
 * Records a CPC click event, debits the broker's wallet, and updates campaign spend.
 * Called from the /go/[slug] redirect route when a campaign_id (cid) is present.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaign_id,
      broker_slug,
      rate_cents,
      click_id,
      page,
      session_id,
    } = body;

    if (!campaign_id || !broker_slug || !rate_cents) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const userAgent = request.headers.get("user-agent") || "";

    // Rate limit check — prevent click-bomb attacks
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const success = await recordCpcClick(
      campaign_id,
      broker_slug,
      rate_cents,
      {
        click_id,
        page,
        ip_hash: hashIP(ip),
        user_agent: userAgent.slice(0, 500),
        session_id,
      }
    );

    if (!success) {
      return NextResponse.json({ error: "Insufficient funds", billed: false }, { status: 402 });
    }

    return NextResponse.json({ success: true, billed: true });
  } catch (err) {
    console.error("Campaign click error:", err);
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}
