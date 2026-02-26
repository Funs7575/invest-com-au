import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function authorize(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * GET /api/admin/content/calendar
 * Query params: ?status=planned&limit=50
 */
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

  const supabase = getSupabase();
  let query = supabase
    .from("content_calendar")
    .select("*, author:team_members!assigned_author_id(id, full_name, slug), reviewer:team_members!assigned_reviewer_id(id, full_name, slug)")
    .order("target_publish_date", { ascending: true })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

/**
 * POST /api/admin/content/calendar
 * Create a new content calendar item
 */
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("content_calendar")
    .insert({
      title: body.title,
      target_keyword: body.target_keyword || null,
      secondary_keywords: body.secondary_keywords || [],
      article_type: body.article_type || "article",
      category: body.category || null,
      status: "planned",
      assigned_author_id: body.assigned_author_id || null,
      assigned_reviewer_id: body.assigned_reviewer_id || null,
      target_publish_date: body.target_publish_date || null,
      brief: body.brief || null,
      related_brokers: body.related_brokers || [],
      related_tools: body.related_tools || [],
      internal_links: body.internal_links || [],
      notes: body.notes || null,
      priority: body.priority || "normal",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data }, { status: 201 });
}

/**
 * PATCH /api/admin/content/calendar
 * Update a content calendar item: { id, ...fields }
 */
export async function PATCH(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("content_calendar")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

/**
 * DELETE /api/admin/content/calendar
 * Body: { id: number }
 */
export async function DELETE(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("content_calendar")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
