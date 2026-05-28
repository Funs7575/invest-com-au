/**
 * POST /api/user-lists/[slug]/clone — clone a public list into the caller's account.
 *
 * Creates a new private list titled "Copy of <original title>" and copies all items.
 * Returns the new list's slug so the client can redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger("api:user-lists:clone");

export const runtime = "nodejs";

function makeSlug(title: string): string {
  const base = slugify(title) || "my-list";
  return `${base}-${Date.now().toString(36)}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (await isRateLimited(`list_clone:${user.id}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const segments = req.nextUrl.pathname.split("/");
  const idx = segments.indexOf("user-lists");
  const slug = segments[idx + 1] ?? "";

  const { data: source } = await supabase
    .from("user_lists")
    .select("id, title, description, is_public")
    .eq("slug", slug)
    .single();

  if (!source) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!source.is_public) return NextResponse.json({ error: "list_not_public" }, { status: 403 });

  const newTitle = `Copy of ${source.title}`.slice(0, 80);
  const newSlug = makeSlug(newTitle);

  // Create the new list.
  const { data: newList, error: listErr } = await supabase
    .from("user_lists")
    .insert({
      owner_user_id: user.id,
      title: newTitle,
      description: source.description,
      slug: newSlug,
      is_public: false,
    })
    .select("id, slug")
    .single();

  if (listErr || !newList) {
    log.warn("clone list insert failed", { slug, userId: user.id, error: listErr?.message });
    return NextResponse.json({ error: "clone_failed" }, { status: 500 });
  }

  // Copy items.
  const { data: items } = await supabase
    .from("user_list_items")
    .select("item_type, item_ref, label, notes")
    .eq("list_id", source.id);

  if (items && items.length > 0) {
    const toInsert = items.map((item) => ({ list_id: newList.id, ...item }));
    const { error: itemsErr } = await supabase.from("user_list_items").insert(toInsert);
    if (itemsErr) {
      log.warn("clone items insert failed", { newListId: newList.id, error: itemsErr.message });
      // Non-fatal — the list exists, items may be partial.
    }
  }

  return NextResponse.json({ ok: true, slug: newList.slug }, { status: 201 });
}
