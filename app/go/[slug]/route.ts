import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// ── In-memory rate limiter (30 redirects / 60s per IP) ──────────
// Note: In serverless environments each container has its own Map.
// This provides best-effort rate limiting per warm instance. For
// stricter limits, consider a distributed store (e.g. Upstash Redis).
const redirectMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REDIRECTS = 30;
const MAX_MAP_SIZE = 10_000; // Prevent unbounded memory growth

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = redirectMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // Lazy cleanup: evict stale entries when map grows too large
    if (redirectMap.size > MAX_MAP_SIZE) {
      for (const [key, e] of redirectMap.entries()) {
        if (now > e.resetAt) redirectMap.delete(key);
      }
    }
    redirectMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REDIRECTS;
}

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "invest-com-au-2026";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || typeof slug !== "string") {
    return NextResponse.redirect(new URL("/compare", request.url), 302);
  }

  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (isRateLimited(ip)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  // Look up broker
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: broker } = await supabase
    .from("brokers")
    .select("id, name, slug, affiliate_url")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  // If no broker or no affiliate URL → fallback to broker review page
  if (!broker?.affiliate_url) {
    return NextResponse.redirect(new URL(`/broker/${slug}`, request.url), 302);
  }

  // Insert server-side click record and get click_id
  const userAgent = request.headers.get("user-agent") || "";
  const ipHash = hashIP(ip);
  const referer = request.headers.get("referer") || "";

  const { data: inserted } = await supabase
    .from("affiliate_clicks")
    .insert({
      broker_id: broker.id,
      broker_name: broker.name,
      broker_slug: broker.slug,
      source: "go-redirect",
      page: referer.slice(0, 500) || "/go/" + slug,
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
    })
    .select("click_id")
    .single();

  // Build destination URL with click_id for attribution
  const destination = new URL(broker.affiliate_url);
  if (inserted?.click_id) {
    destination.searchParams.set("click_id", inserted.click_id);
  }

  // ── Marketplace CPC attribution ──
  // If a campaign_id was passed via ?cid= query param, record the CPC click
  const cid = request.nextUrl.searchParams.get("cid");
  if (cid) {
    try {
      const campaignId = parseInt(cid, 10);
      if (!isNaN(campaignId)) {
        const { recordCpcClick } = await import("@/lib/marketplace/allocation");

        // Look up campaign rate
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("rate_cents, status, broker_slug")
          .eq("id", campaignId)
          .eq("status", "active")
          .maybeSingle();

        if (campaign && campaign.broker_slug === slug) {
          await recordCpcClick(campaignId, slug, campaign.rate_cents, {
            click_id: inserted?.click_id || undefined,
            page: referer.slice(0, 500) || `/go/${slug}`,
            ip_hash: ipHash,
            user_agent: userAgent.slice(0, 200),
          });
        }
      }
    } catch (err) {
      // Non-blocking: CPC billing failure should not prevent redirect
      console.error("CPC click recording error:", err);
    }
  }

  // 302 redirect with no-index and no-cache headers
  const response = NextResponse.redirect(destination.toString(), 302);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}
