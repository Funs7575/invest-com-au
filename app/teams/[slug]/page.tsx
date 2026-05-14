import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import { estimateBundledPrice } from "@/lib/expert-teams/pricing";
import Icon from "@/components/Icon";
import OutcomeBadge from "@/components/outcomes/OutcomeBadge";
import TestimonialList from "@/components/outcomes/TestimonialList";
import SquadTierBadge from "@/components/expert-teams/SquadTierBadge";
import {
  getProviderOutcomeBadge,
  getPublicTestimonials,
} from "@/lib/outcomes/profile-display";
import { computeSquadTier } from "@/lib/expert-teams/badge-tier";
import SquadStack from "./_components/SquadStack";
import BundledPricePreview from "./_components/BundledPricePreview";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const admin = await createClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("name, description, team_category")
    .eq("slug", slug)
    .eq("public", true)
    .eq("verification_status", "verified")
    .maybeSingle();
  if (!team) return {};
  return {
    title: `${team.name} — Verified Expert Team (${CURRENT_YEAR})`,
    description: (team.description as string)?.slice(0, 155) ?? `${team.name} is a verified expert team on Invest.com.au.`,
    alternates: { canonical: `${SITE_URL}/teams/${slug}` },
  };
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeamProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const admin = await createClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("*")
    .eq("slug", slug)
    .eq("public", true)
    .eq("verification_status", "verified")
    .maybeSingle();
  if (!team) notFound();

  const { data: membersRaw } = await admin
    .from("expert_team_members")
    .select(
      "id, professional_id, member_role, public_title, can_appear_publicly, status",
    )
    .eq("team_id", team.id)
    .eq("status", "active")
    .eq("can_appear_publicly", true);
  const members = (membersRaw ?? []) as {
    id: number;
    professional_id: number;
    member_role: string;
    public_title: string | null;
    status: string;
  }[];

  const proIds = members.map((m) => m.professional_id);
  let professionals: Record<
    number,
    {
      name: string;
      slug: string;
      type: string;
      photo_url: string | null;
      tagline: string | null;
      hourly_rate_cents: number | null;
    }
  > = {};
  if (proIds.length > 0) {
    const { data: pros } = await admin
      .from("professionals")
      .select("id, name, slug, type, photo_url, tagline, hourly_rate_cents")
      .in("id", proIds);
    professionals = Object.fromEntries(
      ((pros ?? []) as {
        id: number;
        name: string;
        slug: string;
        type: string;
        photo_url: string | null;
        tagline: string | null;
        hourly_rate_cents: number | null;
      }[]).map((p) => [p.id, p]),
    );
  }

  // Build the enriched member list for <SquadStack /> + <BundledPricePreview />.
  const squadMembers = members
    .map((m) => {
      const pro = professionals[m.professional_id];
      if (!pro) return null;
      return {
        id: m.id,
        professional_id: m.professional_id,
        member_role: m.member_role,
        public_title: m.public_title,
        pro_name: pro.name,
        pro_slug: pro.slug,
        pro_type: pro.type,
        pro_photo_url: pro.photo_url,
        pro_tagline: pro.tagline ?? null,
      };
    })
    .filter(
      (m): m is NonNullable<typeof m> => m !== null,
    );

  const priceEstimate = estimateBundledPrice(
    members.map((m) => {
      const pro = professionals[m.professional_id];
      return {
        hourly_rate_cents: pro?.hourly_rate_cents ?? null,
        role: m.member_role,
      };
    }),
  );

  // Outcome flywheel data (fail-soft, both null → section hides).
  const [outcomeBadge, testimonials] = await Promise.all([
    getProviderOutcomeBadge({ teamId: team.id }),
    getPublicTestimonials({ teamId: team.id, limit: 5 }),
  ]);

  // Verification tier — derived from member count + unique disciplines +
  // outcome scoreboard. Pure function over data we already loaded.
  const uniqueDisciplines = new Set(
    members
      .map((m) => professionals[m.professional_id]?.type)
      .filter((t): t is string => typeof t === "string"),
  );
  const squadTier = computeSquadTier({
    memberCount: members.length,
    uniqueDisciplineCount: uniqueDisciplines.size,
    completionRatePct: outcomeBadge?.completion_rate_pct ?? null,
    outcomesSubmitted: outcomeBadge?.outcomes_submitted ?? 0,
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Experts", url: absoluteUrl("/advisors") },
    { name: team.name as string },
  ]);

  const acceptedTemplates = (team.accepted_brief_templates as string[]) ?? [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3 text-xs text-slate-500 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-800">
              Home
            </Link>
            <span>/</span>
            <Link href="/advisors" className="hover:text-slate-800">
              Experts
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">{team.name as string}</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
              <Icon name="shield-check" size={12} /> Verified Expert Team
            </span>
            <span className="text-xs text-slate-500">
              {String(team.team_category).replace(/_/g, " ")} · {String(team.team_type).replace(/_/g, " ")}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
            {team.name as string}
          </h1>
          {team.description && (
            <p className="text-slate-600 leading-relaxed max-w-3xl mb-6">
              {team.description as string}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mb-10">
            <Link
              href={`/briefs/new?team=${encodeURIComponent(slug)}`}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-5 py-3 rounded-xl"
            >
              <Icon name="edit" size={16} />
              Get quotes from this Pro Squad
            </Link>
            <Link
              href="/briefs/new"
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold px-5 py-3 rounded-xl hover:border-slate-300"
            >
              Compare other experts
            </Link>
          </div>

          {acceptedTemplates.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                Briefs this team handles
              </p>
              <div className="flex flex-wrap gap-2">
                {acceptedTemplates.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-1"
                  >
                    {(BRIEF_TEMPLATE_LABELS as Record<string, string>)[t] ?? t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <SquadTierBadge badge={squadTier} />
            {outcomeBadge && <OutcomeBadge badge={outcomeBadge} />}
          </div>

          <BundledPricePreview estimate={priceEstimate} />

          {testimonials.length > 0 && (
            <TestimonialList testimonials={testimonials} />
          )}

          <SquadStack members={squadMembers} />

          {team.disclosure && (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800 mb-1">Team disclosure</p>
              <p>{team.disclosure as string}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
