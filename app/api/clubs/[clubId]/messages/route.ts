/**
 * /api/clubs/[clubId]/messages
 *
 * GET  — paginated messages (club members only; before=<ISO cursor>)
 * POST — send a message (club members only)
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

const log = logger("api:clubs:messages");

const PostBody = z.object({
  body: z.string().min(1).max(2000),
});

type Params = { params: Promise<{ clubId: string }> };

async function getMembership(supabase: Awaited<ReturnType<typeof createClient>>, clubId: string, userId: string) {
  const { data } = await supabase
    .from("club_members")
    .select("id, role, display_name")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .single();
  return data;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  if (!(await isAllowed("clubs_messages_get", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { clubId } = await params;
  const membership = await getMembership(supabase, clubId, user.id);
  if (!membership) return NextResponse.json({ error: "not_member" }, { status: 403 });

  const before = new URL(req.url).searchParams.get("before");
  const cursor = before ? new Date(before) : new Date();
  if (isNaN(cursor.getTime())) {
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("club_messages")
    .select("id, body, created_at, club_members(display_name, role)")
    .eq("club_id", clubId)
    .lt("created_at", cursor.toISOString())
    .order("created_at", { ascending: false })
    .limit(51);

  if (error) {
    log.warn("messages GET failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > 50;
  const messages = rows.slice(0, 50).map((msg) => ({
    id: msg.id,
    body: msg.body,
    createdAt: msg.created_at,
    authorDisplayName: (msg.club_members as unknown as { display_name: string; role: string } | null)?.display_name ?? "Member",
    authorRole: (msg.club_members as unknown as { display_name: string; role: string } | null)?.role ?? "member",
  })).reverse();

  const oldest = rows[49];
  const nextCursor = hasMore && oldest ? oldest.created_at : null;

  return NextResponse.json({ messages, nextCursor });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(PostBody, async (req: NextRequest, body, ctx?: unknown) => {
  if (!(await isAllowed("clubs_messages_post", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { clubId } = await (ctx as Params)!.params;
  const membership = await getMembership(supabase, clubId, user.id);
  if (!membership) return NextResponse.json({ error: "not_member" }, { status: 403 });

  const { error } = await supabase.from("club_messages").insert({
    club_id: clubId,
    author_member_id: membership.id,
    body: body.body,
  });

  if (error) {
    log.warn("message send failed", { error: error.message });
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
