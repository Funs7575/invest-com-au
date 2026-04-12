import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TOPICS = ["fee_changes", "deals", "articles", "price_drops"] as const;

interface SubscribeBody {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  topics: string[];
}

/**
 * POST /api/push/subscribe
 *
 * Register a push subscription with selected notification topics.
 * Auth is optional — anonymous push subscriptions are allowed.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribeBody;

    // Validate subscription shape
    if (
      !body.subscription?.endpoint ||
      !body.subscription?.keys?.p256dh ||
      !body.subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid subscription object. Required: endpoint, keys.p256dh, keys.auth" },
        { status: 400 }
      );
    }

    // Validate topics
    const topics = (body.topics || []).filter((t) =>
      (VALID_TOPICS as readonly string[]).includes(t)
    );
    if (topics.length === 0) {
      return NextResponse.json(
        { error: `At least one valid topic required. Options: ${VALID_TOPICS.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Upsert based on endpoint (unique per browser)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: body.subscription.endpoint,
          keys_p256dh: body.subscription.keys.p256dh,
          keys_auth: body.subscription.keys.auth,
          topics,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Push subscribe error:", error.message);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, topics });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
