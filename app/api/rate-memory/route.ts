import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("rate-memory");

// POST /api/rate-memory
// Upserts the caller's last-seen rate for a broker+product.
// Returns { previousRateBps, currentRateBps } — client shows delta banner if they differ.

const Schema = z.object({
  brokerId: z.number().int().positive(),
  productKind: z.enum(["savings_account", "term_deposit"]),
  currentRateBps: z.number().int().min(0).max(99999),
});

export const POST = withValidatedBody(Schema, async (req: NextRequest, body) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (await isRateLimited(`rate_memory:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { brokerId, productKind, currentRateBps } = body;

  // Read existing record before upserting (to return the delta)
  const { data: existing } = await supabase
    .from("user_rate_memory")
    .select("last_seen_rate_bps")
    .eq("user_id", user.id)
    .eq("broker_id", brokerId)
    .eq("product_kind", productKind)
    .maybeSingle();

  const previousRateBps = existing?.last_seen_rate_bps ?? null;

  const { error: upsertError } = await supabase
    .from("user_rate_memory")
    .upsert(
      {
        user_id: user.id,
        broker_id: brokerId,
        product_kind: productKind,
        last_seen_rate_bps: currentRateBps,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,broker_id,product_kind" },
    );

  if (upsertError) {
    log.error("Rate memory upsert failed", { error: upsertError.message });
    return NextResponse.json({ error: "Failed to save rate memory" }, { status: 500 });
  }

  return NextResponse.json({ previousRateBps, currentRateBps });
});
