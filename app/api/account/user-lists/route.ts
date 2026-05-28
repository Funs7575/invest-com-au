/**
 * /api/account/user-lists — user_lists CRUD (owner operations only).
 *
 * GET    — current user's lists (owned, ordered by updated_at DESC)
 * POST   — create a list
 * PATCH  — update title/description/is_public (id required)
 * DELETE — delete a list (id required; cascades items + follows)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { slugify } from "@/lib/utils";
import { logger } from "@/lib/logger";

const log = logger("api:account:user-lists");

export const runtime = "nodejs";

function makeSlug(title: string): string {
  const base = slugify(title) || "my-list";
  return `${base}-${Date.now().toString(36)}`;
}

const CreateBody = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(500).default(""),
  is_public: z.boolean().default(false),
});

const UpdateBody = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
});

const DeleteBody = z.object({
  id: z.coerce.number().int().positive(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_lists")
    .select("id, title, description, slug, is_public, item_count, follower_count, created_at, updated_at")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    log.warn("GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ lists: data ?? [] });
}

export const POST = withValidatedBody(CreateBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const slug = makeSlug(body.title);
  const { data, error } = await supabase
    .from("user_lists")
    .insert({ owner_user_id: user.id, slug, ...body })
    .select("id, title, description, slug, is_public, item_count, follower_count, created_at, updated_at")
    .single();

  if (error) {
    log.warn("POST failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ list: data }, { status: 201 });
});

export const PATCH = withValidatedBody(UpdateBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, ...rest } = body;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) update[k] = v;
  }

  const { data, error } = await supabase
    .from("user_lists")
    .update(update)
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .select("id, title, description, slug, is_public, item_count, follower_count, updated_at")
    .single();

  if (error) {
    log.warn("PATCH failed", { userId: user.id, id, error: error.message });
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ list: data });
});

export const DELETE = withValidatedBody(DeleteBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("user_lists")
    .delete()
    .eq("id", body.id)
    .eq("owner_user_id", user.id);

  if (error) {
    log.warn("DELETE failed", { userId: user.id, id: body.id, error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
