import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { awardIfEligible } from "@/lib/quests-server";
import { logger } from "@/lib/logger";

const log = logger("api:account:watchlist");

export const runtime = "nodejs";

/**
 * /api/account/watchlist
 *
 *   GET    — authenticated user's watchlist items
 *   POST   — add an item to the watchlist
 *   DELETE — remove an item by id
 */

const WATCHABLE_TYPES = ["stock", "etf", "broker", "fund", "crypto"] as const;

const AddItemBody = z.object({
  item_type: z.enum(WATCHABLE_TYPES),
  item_slug: z.string().min(1).max(200),
  display_name: z.string().max(200).nullish(),
});

const RemoveItemBody = z.object({
  id: z.number().int().positive(),
});

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_watchlist_items")
    .select("id, item_type, item_slug, display_name, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });

  if (error) {
    log.error("watchlist fetch failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddItemBody, async (_req, body) => {
  const { supabase, user } = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_watchlist_items")
    .insert({
      user_id: user.id,
      item_type: body.item_type,
      item_slug: body.item_slug,
      display_name: body.display_name ?? null,
    })
    .select("id, item_type, item_slug, display_name, added_at")
    .single();

  if (error) {
    // 23505 = unique_violation — item already in watchlist
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });
    }
    log.error("watchlist add failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }

  // Quest: first-watchlist-item. Fire-and-forget — flag-gated + fail-soft.
  void awardIfEligible(user.id, "first-watchlist-item");
  return NextResponse.json({ item: data }, { status: 201 });
});

export const DELETE = withValidatedBody(RemoveItemBody, async (_req, body) => {
  const { supabase, user } = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("user_watchlist_items")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id); // RLS-safe: ensures users can only delete their own items

  if (error) {
    log.error("watchlist remove failed", { userId: user.id, itemId: body.id, error: error.message });
    return NextResponse.json({ error: "Failed to remove item" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});

