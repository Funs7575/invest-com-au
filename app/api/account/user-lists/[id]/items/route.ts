/**
 * /api/account/user-lists/[id]/items — manage items within a user's list.
 *
 * GET    — items in the list (owner or public list)
 * POST   — add an item
 * DELETE — remove an item (item_type + item_ref required)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:user-lists:items");

export const runtime = "nodejs";

const ITEM_TYPES = ["broker", "etf", "article", "advisor", "property"] as const;

const AddItemBody = z.object({
  item_type: z.enum(ITEM_TYPES),
  item_ref: z.string().min(1).max(200),
  label: z.string().max(120).default(""),
  notes: z.string().max(500).default(""),
});

const RemoveItemBody = z.object({
  item_type: z.enum(ITEM_TYPES),
  item_ref: z.string().min(1).max(200),
});

function getListId(req: NextRequest): number | null {
  const segments = req.nextUrl.pathname.split("/");
  const idx = segments.indexOf("user-lists");
  if (idx === -1) return null;
  const id = parseInt(segments[idx + 1] ?? "", 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(req: NextRequest) {
  const listId = getListId(req);
  if (!listId) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Verify list access: owner always allowed; non-owners need is_public=true.
  const { data: list } = await supabase
    .from("user_lists")
    .select("id, owner_user_id, is_public")
    .eq("id", listId)
    .single();

  if (!list) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!list.is_public && list.owner_user_id !== user?.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("user_list_items")
    .select("id, item_type, item_ref, label, notes, added_at")
    .eq("list_id", listId)
    .order("added_at", { ascending: true });

  if (error) {
    log.warn("GET items failed", { listId, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddItemBody, async (req: NextRequest, body) => {
  const listId = getListId(req);
  if (!listId) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Verify ownership.
  const { data: list } = await supabase
    .from("user_lists")
    .select("id, owner_user_id")
    .eq("id", listId)
    .eq("owner_user_id", user.id)
    .single();

  if (!list) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await supabase
    .from("user_list_items")
    .insert({ list_id: listId, ...body })
    .select("id, item_type, item_ref, label, notes, added_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_in_list" }, { status: 409 });
    }
    log.warn("POST item failed", { listId, error: error.message });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
});

export const DELETE = withValidatedBody(RemoveItemBody, async (req: NextRequest, body) => {
  const listId = getListId(req);
  if (!listId) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Verify ownership via RLS (the policy enforces owner_user_id = auth.uid()).
  const { error } = await supabase
    .from("user_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("item_type", body.item_type)
    .eq("item_ref", body.item_ref);

  if (error) {
    log.warn("DELETE item failed", { listId, error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
