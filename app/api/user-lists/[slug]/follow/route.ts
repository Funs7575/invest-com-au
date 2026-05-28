/**
 * POST   /api/user-lists/[slug]/follow — follow a public list
 * DELETE /api/user-lists/[slug]/follow — unfollow a public list
 *
 * Requires authentication. follower_count is maintained by a DB trigger.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("api:user-lists:follow");

export const runtime = "nodejs";

function getSlug(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split("/");
  const idx = segments.indexOf("user-lists");
  return segments[idx + 1] ?? "";
}

async function resolveList(slug: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("user_lists")
    .select("id, is_public, owner_user_id")
    .eq("slug", slug)
    .single();
  return data;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (await isRateLimited(`list_follow:${user.id}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const slug = getSlug(req);
  const list = await resolveList(slug, supabase);
  if (!list) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!list.is_public) return NextResponse.json({ error: "list_not_public" }, { status: 403 });
  if (list.owner_user_id === user.id) {
    return NextResponse.json({ error: "cannot_follow_own_list" }, { status: 409 });
  }

  const { error } = await supabase
    .from("user_list_follows")
    .insert({ list_id: list.id, follower_user_id: user.id });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, already: true });
    log.warn("follow insert failed", { slug, userId: user.id, error: error.message });
    return NextResponse.json({ error: "follow_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, following: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const slug = getSlug(req);
  const list = await resolveList(slug, supabase);
  if (!list) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await supabase
    .from("user_list_follows")
    .delete()
    .eq("list_id", list.id)
    .eq("follower_user_id", user.id);

  if (error) {
    log.warn("unfollow failed", { slug, userId: user.id, error: error.message });
    return NextResponse.json({ error: "unfollow_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, following: false });
}
