/**
 * /api/account/watchlist/alerts — per-user opt-in for the watchlist
 * weekly digest (W2.13 / WW-02). GET returns the current preference,
 * PUT toggles it. Default (no row) is opted-out.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:watchlist:alerts");

export const runtime = "nodejs";

const PutBody = z.object({
  alerts_opted_in: z.boolean(),
});

interface PreferenceResponse {
  alerts_opted_in: boolean;
  last_digest_sent_at: string | null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("watchlist_alert_preferences")
    .select("alerts_opted_in, last_digest_sent_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    log.error("preference fetch failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to load preference" }, { status: 500 });
  }

  const response: PreferenceResponse = {
    alerts_opted_in: data?.alerts_opted_in ?? false,
    last_digest_sent_at: data?.last_digest_sent_at ?? null,
  };
  return NextResponse.json(response);
}

export const PUT = withValidatedBody(PutBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("watchlist_alert_preferences")
    .upsert(
      {
        user_id: user.id,
        alerts_opted_in: body.alerts_opted_in,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    log.error("preference upsert failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to save preference" }, { status: 500 });
  }

  const response: PreferenceResponse = {
    alerts_opted_in: body.alerts_opted_in,
    last_digest_sent_at: null,
  };
  return NextResponse.json(response);
});
