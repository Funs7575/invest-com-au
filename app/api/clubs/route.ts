/**
 * /api/clubs
 *
 * GET  — list clubs the authenticated user is a member of
 * POST — create a new investment club (authenticated, max 10 clubs per user)
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

const log = logger("api:clubs");

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const CreateBody = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).nullish(),
  memberLimit: z.coerce.number().int().min(2).max(50).default(20),
  displayName: z.string().min(1).max(40),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await isAllowed("clubs_get", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("club_members")
    .select("role, joined_at, display_name, investment_clubs(id, name, slug, description, member_limit, created_by, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) {
    log.warn("clubs GET failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const clubs = (data ?? []).map((row) => {
    const club = row.investment_clubs as unknown as Record<string, unknown> | null;
    return {
      id: club?.id,
      name: club?.name,
      slug: club?.slug,
      description: club?.description,
      memberLimit: club?.member_limit,
      isOwner: club?.created_by === user.id,
      role: row.role,
      displayName: row.display_name,
      joinedAt: row.joined_at,
    };
  });

  return NextResponse.json({ clubs });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(CreateBody, async (req: NextRequest, body) => {
  if (!(await isAllowed("clubs_post", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Cap at 10 clubs per user
  const { count } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "You can belong to at most 10 clubs." }, { status: 422 });
  }

  const { name, description, memberLimit, displayName } = body;
  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  // Create club + owner membership in a transaction (sequential inserts, idempotent slug)
  const { data: club, error: clubErr } = await supabase
    .from("investment_clubs")
    .insert({ name, slug, description: description ?? null, created_by: user.id, member_limit: memberLimit })
    .select("id, slug")
    .single();

  if (clubErr || !club) {
    log.warn("club create failed", { error: clubErr?.message });
    return NextResponse.json({ error: "Could not create club." }, { status: 500 });
  }

  const { error: memberErr } = await supabase
    .from("club_members")
    .insert({ club_id: club.id, user_id: user.id, role: "owner", display_name: displayName });

  if (memberErr) {
    log.warn("club owner membership failed", { error: memberErr.message });
    return NextResponse.json({ error: "Club created but membership failed." }, { status: 500 });
  }

  log.info("club created", { userId: user.id, clubId: club.id });
  return NextResponse.json({ ok: true, clubId: club.id, slug: club.slug }, { status: 201 });
});
