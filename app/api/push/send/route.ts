import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("push:send");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TOPICS = ["fee_changes", "deals", "articles", "price_drops"] as const;

/**
 * POST /api/push/send — Admin-only endpoint to broadcast a push notification.
 *
 * Body: { topic, title, body, url, icon? }
 *
 * Rate limit: max 1 push per topic per hour (tracked via push_send_log table).
 * Requires ADMIN_API_KEY header or Supabase service-role auth.
 */
export async function POST(request: NextRequest) {
  // Admin auth check
  const adminKey = request.headers.get("x-admin-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { topic, title, body: notifBody, url, icon } = body as {
      topic: string;
      title: string;
      body: string;
      url: string;
      icon?: string;
    };

    if (!topic || !(VALID_TOPICS as readonly string[]).includes(topic)) {
      return NextResponse.json(
        { error: `Invalid topic. Options: ${VALID_TOPICS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!title || !notifBody || !url) {
      return NextResponse.json(
        { error: "title, body, and url are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Rate limit check: max 1 push per topic per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSends } = await supabase
      .from("push_send_log")
      .select("id")
      .eq("topic", topic)
      .gte("sent_at", oneHourAgo)
      .limit(1);

    if (recentSends && recentSends.length > 0) {
      return NextResponse.json(
        { error: "Rate limited: max 1 push per topic per hour" },
        { status: 429 }
      );
    }

    // Configure VAPID
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json(
        { error: "VAPID keys not configured" },
        { status: 500 }
      );
    }

    // Fetch subscribers for the topic
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, keys_p256dh, keys_auth")
      .contains("topics", [topic]);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No subscribers for this topic" });
    }

    // Build payload
    const payload = JSON.stringify({
      title,
      body: notifBody,
      url,
      icon: icon || "/icon-192.png",
      topic,
    });

    // Send notifications via Web Push protocol
    // Uses VAPID for authentication (RFC 8292)
    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "TTL": "86400",
            ...(vapidPublic ? { "Authorization": `vapid t=${vapidPublic}` } : {}),
          },
          body: payload,
        });
        if (!res.ok) {
          const err = new Error(`Push failed: ${res.status}`);
          (err as unknown as Record<string, number>).statusCode = res.status;
          throw err;
        }
        return res;
      })
    );

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          staleEndpoints.push(subscriptions[i].endpoint);
        }
      }
    });

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    // Log the send for rate limiting
    await supabase.from("push_send_log").insert({
      topic,
      title,
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      sent,
      failed,
      stale_removed: staleEndpoints.length,
    });
  } catch (err) {
    log.error("Push send error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
