import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("push:subscribe");

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
    if (!(await isAllowed("push_subscribe", ipKey(request), { max: 5, refillPerSec: 5 / 3600 }))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    // eslint-disable-next-line invest/no-unvalidated-req-json -- subscription shape is hand-validated immediately below (endpoint + keys.p256dh + keys.auth required)
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

    // Resolve the calling user's ID if they're signed in. Auth is optional —
    // anonymous subscriptions remain supported but won't be linked to an account,
    // so the push-dispatch helper will never find them for user-targeted alerts.
    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    const userId = user?.id ?? null;

    // Upsert based on endpoint (unique per browser). Include user_id so the
    // dispatch helper can look up subscriptions by user when an alert fires.
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: body.subscription.endpoint,
          keys_p256dh: body.subscription.keys.p256dh,
          keys_auth: body.subscription.keys.auth,
          topics,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      log.error("Push subscribe error:", error.message);
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
