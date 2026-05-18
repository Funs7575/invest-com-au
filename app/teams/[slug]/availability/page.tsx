/**
 * /teams/[slug]/availability — combined team availability overlay.
 *
 * Member-side surface (signed-in not required) that aggregates each
 * active team member's published consultation slots into a 14-day
 * day-of-week × hour-of-day overlay grid. Cells show how many members
 * are simultaneously available — denser cells = better odds of booking
 * a fast intro call.
 *
 * Reads `pro_availability_slots` via admin client because the read
 * crosses many professionals at once + the table's RLS only exposes
 * a pro's own slots to their own session. The data exposed is already
 * public-by-intent (a published consultation slot exists to be booked).
 *
 * Each cell links to /pros/<id>/book if exactly one member is available
 * — otherwise the cell shows the combined count and tooltips list the
 * available pros so the visitor can pick. We don't try to invent a
 * "team-level booking" flow here: the booking primitive is still
 * per-pro, this page just makes overlap legible.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

// eslint-disable-next-line no-restricted-imports -- team availability surface: cross-professional read aggregating slots beyond what RLS exposes to anon.
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo";

import TeamAvailabilityGrid from "./_components/TeamAvailabilityGrid";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Team availability — ${slug.replace(/-/g, " ")} | Invest.com.au`,
    description:
      "When this Pro Squad is open for intro calls — combined availability across every active member.",
    alternates: { canonical: `${SITE_URL}/teams/${slug}/availability` },
    robots: { index: false, follow: false },
  };
}

interface SlotRow {
  professional_id: number;
  start_at: string;
  end_at: string;
}

export default async function TeamAvailabilityPage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: team } = await admin
    .from("expert_teams")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();

  const { data: rosterRaw } = await admin
    .from("expert_team_members")
    .select("professional_id")
    .eq("team_id", team.id)
    .eq("status", "active");
  const memberIds = ((rosterRaw ?? []) as { professional_id: number }[]).map(
    (r) => r.professional_id,
  );

  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86_400_000);

  let slots: SlotRow[] = [];
  let pros: { id: number; name: string }[] = [];
  if (memberIds.length > 0) {
    const [slotsRes, prosRes] = await Promise.all([
      admin
        .from("pro_availability_slots")
        .select("professional_id, start_at, end_at")
        .in("professional_id", memberIds)
        .eq("status", "open")
        .gte("start_at", now.toISOString())
        .lt("start_at", horizon.toISOString())
        .order("start_at", { ascending: true }),
      admin
        .from("professionals")
        .select("id, name")
        .in("id", memberIds),
    ]);
    slots = (slotsRes.data ?? []) as SlotRow[];
    pros = (prosRes.data ?? []) as { id: number; name: string }[];
  }

  const nameById = new Map<number, string>(pros.map((p) => [p.id, p.name]));

  return (
    <main className="min-h-screen bg-slate-50 py-8 md:py-12">
      <div className="container-custom max-w-5xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href={`/teams/${team.slug}`} className="hover:text-slate-900">
            ← {team.name as string}
          </Link>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            When this squad is available
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            Combined intro-call windows across every active member, next
            14 days. Hover a cell to see which members are open; click an
            opening to jump to that pro&apos;s booking page.
          </p>
        </header>

        {memberIds.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-600">
              No active members on this team yet.
            </p>
          </div>
        ) : slots.length === 0 ? (
          <div className="bg-white border border-amber-200 bg-amber-50 rounded-2xl p-6">
            <p className="text-sm font-bold text-amber-900">
              No published openings in the next 14 days.
            </p>
            <p className="text-xs text-amber-800 mt-1">
              The squad hasn&apos;t posted intro-call windows yet. File a
              brief to request one — they&apos;ll respond inside the
              brief thread.
            </p>
            <Link
              href="/briefs/new"
              className="inline-block mt-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3 py-1.5"
            >
              File a brief →
            </Link>
          </div>
        ) : (
          <TeamAvailabilityGrid
            slots={slots.map((s) => ({
              professionalId: s.professional_id,
              proName: nameById.get(s.professional_id) ?? `Pro #${s.professional_id}`,
              startAt: s.start_at,
              endAt: s.end_at,
            }))}
            memberCount={memberIds.length}
          />
        )}

        <p className="text-[11px] text-slate-500 mt-6">
          Pro Squad listings are introductions only. Any consultation
          beyond the intro call is a separate engagement between you and
          the individual member, governed by their own AFSL or licence.
        </p>
      </div>
    </main>
  );
}
