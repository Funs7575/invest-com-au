import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/notification-preferences
 * Fetch the current user's notification preferences.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("fee_alerts, weekly_digest, deal_alerts, campaign_updates, marketing")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }

  // Return defaults if no row exists yet
  const preferences = data || {
    fee_alerts: true,
    weekly_digest: true,
    deal_alerts: true,
    campaign_updates: true,
    marketing: false,
  };

  return NextResponse.json({ preferences });
}

/**
 * POST /api/notification-preferences
 * Update the current user's notification preferences.
 * Body: { fee_alerts?: boolean, weekly_digest?: boolean, deal_alerts?: boolean, campaign_updates?: boolean, marketing?: boolean }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only allow known preference keys
  const allowedKeys = ["fee_alerts", "weekly_digest", "deal_alerts", "campaign_updates", "marketing"] as const;
  const updates: Record<string, boolean> = {};

  for (const key of allowedKeys) {
    if (typeof body[key] === "boolean") {
      updates[key] = body[key] as boolean;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid preferences provided" }, { status: 400 });
  }

  // Upsert: insert if not exists, update if exists
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("fee_alerts, weekly_digest, deal_alerts, campaign_updates, marketing")
    .single();

  if (error) {
    console.error("[notification-preferences] upsert error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }

  return NextResponse.json({ preferences: data });
}
