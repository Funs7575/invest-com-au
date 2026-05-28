import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-user benchmark query (shortlisted brokers for club members)
import { createAdminClient } from "@/lib/supabase/admin";
import ClubDetail from "@/components/clubs/ClubDetail";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: "noindex, nofollow",
};

export default async function ClubDetailPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/clubs/${clubId}`);

  // Verify membership
  const { data: membership } = await supabase
    .from("club_members")
    .select("id, role, display_name")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/clubs");

  // Fetch club data
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

  if (!club) notFound();

  // Anonymised benchmark via admin client (cross-user shortlist read)
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
        const uid = s.user_id as string;
        const slugs = byUser.get(uid) ?? [];
        slugs.push(s.broker_slug as string);
        byUser.set(uid, slugs);
      }
      benchmark = memberUsers
        .filter((m) => byUser.has(m.user_id as string))
        .map((m) => ({
          displayName: m.display_name as string,
          brokerSlugs: byUser.get(m.user_id as string) ?? [],
        }));
    }
  } catch {
    // Benchmark is non-critical
  }

  const formattedMessages = (messages ?? [])
    .map((msg) => ({
      id: msg.id as string,
      body: msg.body as string,
      createdAt: msg.created_at as string,
      authorDisplayName: (msg.club_members as unknown as { display_name: string; role: string } | null)?.display_name ?? "Member",
      authorRole: (msg.club_members as unknown as { display_name: string; role: string } | null)?.role ?? "member",
    }))
    .reverse();

  return (
    <div className="container-custom max-w-2xl py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">{club.name as string}</h1>
        {(club.description as string | null) && (
          <p className="text-sm text-slate-500 mt-1">{club.description as string}</p>
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mt-3">
          {GENERAL_ADVICE_WARNING}
        </div>
      </div>

      <ClubDetail
        clubId={clubId}
        clubName={club.name as string}
        memberLimit={club.member_limit as number}
        myMembership={{ id: membership.id, role: membership.role, displayName: membership.display_name }}
        members={(members ?? []).map((m) => ({
          id: m.id as string,
          role: m.role as string,
          displayName: m.display_name as string,
          joinedAt: m.joined_at as string,
        }))}
        watchlist={(watchlist ?? []).map((w) => ({
          id: w.id as string,
          brokerId: w.broker_id as number,
          notes: w.notes as string | null,
          createdAt: w.created_at as string,
          broker: w.brokers as unknown as { name: string; slug: string; logo_url: string | null; rating: number | null; asx_fee: string | null } | null,
        }))}
        initialMessages={formattedMessages}
        benchmark={benchmark}
      />
    </div>
  );
}
