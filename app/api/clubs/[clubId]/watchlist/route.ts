/**
 * /api/clubs/[clubId]/watchlist
 *
 * POST — add a broker to the club watchlist (club members only)
 * DELETE — remove an item from the watchlist (added_by member or owner only)
 *
 * Rate-limits: 30/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:clubs:watchlist");

const AddBody = z.object({
  brokerId: z.coerce.number().int().positive(),
  notes: z.string().max(300).nullish(),
});

type Params = { params: Promise<{ clubId: string }> };

// ── POST — add to watchlist ───────────────────────────────────────────────────

export const POST = withValidatedBody(AddBody, async (req: NextRequest, body, ctx?: unknown) => {
  if (!(await isAllowed("clubs_watchlist_post", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { clubId } = await (ctx as Params)!.params;

  const { data: membership } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "not_member" }, { status: 403 });

  const { brokerId, notes } = body;

  const { error } = await supabase.from("club_watchlist_items").insert({
    club_id: clubId,
    added_by_member_id: membership.id,
    broker_id: brokerId,
    notes: notes ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already on watchlist." }, { status: 409 });
    }
    log.warn("watchlist add failed", { error: error.message });
    return NextResponse.json({ error: "Could not add to watchlist." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});

// ── DELETE — remove from watchlist ────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!(await isAllowed("clubs_watchlist_delete", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { clubId } = await params;
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "itemId is required." }, { status: 400 });

  const { data: membership } = await supabase
    .from("club_members")
    .select("id, role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "not_member" }, { status: 403 });

  // Owner can remove any item; others can only remove their own
  const { data: item } = await supabase
    .from("club_watchlist_items")
    .select("id, added_by_member_id")
    .eq("id", itemId)
    .eq("club_id", clubId)
    .single();

  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (membership.role !== "owner" && item.added_by_member_id !== membership.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("club_watchlist_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    log.warn("watchlist delete failed", { error: error.message });
    return NextResponse.json({ error: "Could not remove item." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
