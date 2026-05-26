/**
 * /api/clubs/[clubId]
 *
 * GET — club detail: info, members, watchlist, recent messages, benchmarking.
 *       Only accessible to club members.
 *
 * Rate-limit: 30/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:clubs:detail");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> },
) {
  if (!(await isAllowed("clubs_detail_get", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { clubId } = await params;

  // Verify membership
  const { data: membership } = await supabase
    .from("club_members")
    .select("id, role, display_name")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return NextResponse.json({ error: "not_member" }, { status: 403 });

  // Fetch club + members + watchlist + messages in parallel
  const [
    { data: club },
    { data: members },
    { data: watchlist },
    { data: messages },
  ] = await Promise.all([
    supabase
      .from("investment_clubs")
      .select("id, name, slug, description, member_limit, created_by, created_at")
      .eq("id", clubId)
      .single(),
    supabase
      .from("club_members")
      .select("id, role, display_name, joined_at")
      .eq("club_id", clubId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("club_watchlist_items")
      .select("id, broker_id, notes, created_at, brokers(name, slug, logo_url, rating, asx_fee)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase
      .from("club_messages")
      .select("id, body, created_at, club_members(display_name, role)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!club) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Anonymised benchmarking: which brokers has each member shortlisted?
  // Uses admin client for cross-user read (user_shortlisted_brokers has
  // deny-all for other users).
  const memberUserIds = (members ?? []).map((m) => {
    // We need user_id but club_members RLS only returns id/role/display_name.
    // Use admin client to fetch user_ids for this club's members.
    return m.id;
  });

  let benchmark: { displayName: string; brokerSlugs: string[] }[] = [];
  try {
    const admin = createAdminClient();
    const { data: memberUsers } = await admin
      .from("club_members")
      .select("user_id, display_name")
      .eq("club_id", clubId);

    if (memberUsers && memberUsers.length > 0) {
      const userIds = memberUsers.map((m) => m.user_id as string);
      const { data: shortlists } = await admin
        .from("user_shortlisted_brokers")
        .select("user_id, broker_slug")
        .in("user_id", userIds);

      const byUser = new Map<string, string[]>();
      for (const s of shortlists ?? []) {
        const existing = byUser.get(s.user_id as string) ?? [];
        existing.push(s.broker_slug as string);
        byUser.set(s.user_id as string, existing);
      }

      benchmark = memberUsers
        .filter((m) => byUser.has(m.user_id as string))
        .map((m) => ({
          displayName: m.display_name as string,
          brokerSlugs: byUser.get(m.user_id as string) ?? [],
        }));
    }
  } catch (err) {
    log.warn("benchmark query failed (non-fatal)", { err });
  }

  // Suppress user_ids from response — return only display_names
  void memberUserIds; // resolved via admin query above
  return NextResponse.json({
    club,
    myMembership: { id: membership.id, role: membership.role, displayName: membership.display_name },
    members: (members ?? []).map((m) => ({ id: m.id, role: m.role, displayName: m.display_name, joinedAt: m.joined_at })),
    watchlist: (watchlist ?? []).map((w) => ({
      id: w.id,
      brokerId: w.broker_id,
      notes: w.notes,
      createdAt: w.created_at,
      broker: w.brokers,
    })),
    messages: (messages ?? [])
      .map((msg) => ({
        id: msg.id,
        body: msg.body,
        createdAt: msg.created_at,
        authorDisplayName: (msg.club_members as unknown as { display_name: string; role: string } | null)?.display_name ?? "Member",
        authorRole: (msg.club_members as unknown as { display_name: string; role: string } | null)?.role ?? "member",
      }))
      .reverse(), // chronological order
    benchmark,
  });
}
