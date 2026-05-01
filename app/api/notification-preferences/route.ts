import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("notifications");

/**
 * Body schema for POST. Every preference is an optional boolean —
 * non-boolean values fall through to `undefined` per-field via
 * `.optional().catch(undefined)`, mirroring the previous
 * `typeof body[key] === "boolean" ? ... : drop` per-key filter (so a
 * mixed body like `{ fee_alerts: "yes", weekly_digest: true }` keeps
 * the valid key and drops only the bad one). The "no recognised keys
 * → 400" gate below stays the gatekeeper.
 *
 * Top-level `.catch({})` mirrors the previous "non-object body → 400
 * because zero allowed keys" path.
 */
const NotificationPreferencesSchema = z
  .object({
    fee_alerts: z.boolean().optional().catch(undefined),
    weekly_digest: z.boolean().optional().catch(undefined),
    deal_alerts: z.boolean().optional().catch(undefined),
    campaign_updates: z.boolean().optional().catch(undefined),
    marketing: z.boolean().optional().catch(undefined),
  })
  .passthrough()
  .catch({});

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
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("fee_alerts, weekly_digest, deal_alerts, campaign_updates, marketing")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Something went wrong on our end. Try again in a moment." },
      { status: 500 }
    );
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
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Some fields are invalid. Check and try again." },
      { status: 400 }
    );
  }
  const parsed = NotificationPreferencesSchema.parse(raw);

  // Only allow known preference keys (booleans only — non-bool drops out
  // because the schema marks each key `boolean | undefined`).
  const allowedKeys = ["fee_alerts", "weekly_digest", "deal_alerts", "campaign_updates", "marketing"] as const;
  const updates: Record<string, boolean> = {};

  for (const key of allowedKeys) {
    const value = parsed[key];
    if (typeof value === "boolean") {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Some fields are invalid. Check and try again." },
      { status: 400 }
    );
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
    log.error("Notification preferences upsert error", { error: error.message });
    return NextResponse.json(
      { error: "Something went wrong on our end. Try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ preferences: data });
}
