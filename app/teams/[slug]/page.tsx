import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- Member-only "Open squad inbox" CTA detection: looks up the calling professional (status pending or active, can_appear_publicly may be false) and their expert_team_members row. The anon-RLS policy on expert_team_members only exposes public members, so the admin client is required to detect non-public memberships. The page resolves the calling auth user first and reads only their own membership row.
import { createAdminClient } from "@/lib/supabase/admin";
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
import { getOnlineProsBatch } from "@/lib/presence";
import SquadStack from "./_components/SquadStack";
import BundledPricePreview from "./_components/BundledPricePreview";
import ActivityHeatmap from "./_components/ActivityHeatmap";

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
  if (!team) return { robots: { index: false } };
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
      rating: number | null;
      review_count: number | null;
    }
  > = {};
  if (proIds.length > 0) {
    const { data: pros } = await admin
      .from("professionals")
      .select("id, name, slug, type, photo_url, tagline, hourly_rate_cents, rating, review_count")
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
        rating: number | null;
        review_count: number | null;
      }[]).map((p) => [p.id, p]),
    );
  }

  // Combined case studies — published work from any public squad member,
  // attributed per member. Fail-soft: section hides on error/empty.
  interface TeamCaseStudy {
    id: number;
    professional_id: number;
    title: string;
    situation: string;
    approach: string;
    outcome: string;
    client_type: string;
  }
  let teamCaseStudies: TeamCaseStudy[] = [];
  if (proIds.length > 0) {
    try {
      const { data: csRaw } = await admin
        .from("advisor_case_studies")
        .select("id, professional_id, title, situation, approach, outcome, client_type")
        .in("professional_id", proIds)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6);
      teamCaseStudies = (csRaw ?? []) as TeamCaseStudy[];
    } catch {
      /* silent — section hides */
    }
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
        pro_rating: pro.rating ?? null,
        pro_review_count: pro.review_count ?? null,
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

  // Presence indicator — how many squad members are pinging right now
  // (heartbeat from /teams/[slug]/inbox). Fail-soft to empty set.
  const onlineProIds = await getOnlineProsBatch(proIds);
  const onlineNow = onlineProIds.size;

  // Activity heatmap — bucket the last 90 days of member-side
  // brief_messages into a 7-day × 24-hour grid for the trust strip.
  const heatmapCutoff = new Date(
    Date.now() - 90 * 86_400_000,
  ).toISOString();
  const heatmapBuckets: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0),
  );
  let heatmapTotal = 0;
  if (proIds.length > 0) {
    try {
      const { data: msgRaw } = await admin
        .from("brief_messages")
        .select("created_at, sender_professional_id, sender_team_id")
        .or(
          `sender_professional_id.in.(${proIds.join(",")}),sender_team_id.eq.${team.id}`,
        )
        .gte("created_at", heatmapCutoff);
      for (const m of (msgRaw ?? []) as { created_at: string }[]) {
        const d = new Date(m.created_at);
        const row = heatmapBuckets[d.getDay()];
        if (row) {
          const hour = d.getHours();
          row[hour] = (row[hour] ?? 0) + 1;
          heatmapTotal += 1;
        }
      }
    } catch {
      /* silent — heatmap hides on failure */
    }
  }

  // Is the calling visitor an active member of this team? If so, surface
  // the "Open squad inbox" link in the trust strip. We resolve the user
  // via the anon auth cookie, then look up the professional + membership
  // with the admin client because the anon RLS on expert_team_members
  // only exposes can_appear_publicly=true members (a private member
  // would not see their own link otherwise).
  const {
    data: { user: callingUser },
  } = await admin.auth.getUser();
  let isActiveMember = false;
  if (callingUser) {
    const adminClient = createAdminClient();
    const { data: callingPro } = await adminClient
      .from("professionals")
      .select("id")
      .or(`auth_user_id.eq.${callingUser.id},email.eq.${callingUser.email}`)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (callingPro) {
      const { data: callingMember } = await adminClient
        .from("expert_team_members")
        .select("status")
        .eq("team_id", team.id)
        .eq("professional_id", callingPro.id)
        .maybeSingle();
      isActiveMember =
        !!callingMember && (callingMember.status as string) === "active";
    }
  }

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

  // ProfessionalService schema for verified Pro Squads — gives Google
  // rich-result eligibility (rating stars in SERPs). aggregateRating
  // surfaces the outcome flywheel data from provider_outcome_scores.
  // Reviews stream from brief_outcomes (show_testimonial=true only).
  const completionPct = outcomeBadge?.completion_rate_pct;
  const outcomesSubmitted = outcomeBadge?.outcomes_submitted ?? 0;
  const teamLocation = (team.location_state as string | null) ?? null;
  const serviceAreas = (team.service_areas as string[] | null) ?? null;
  const teamUrl = absoluteUrl(`/teams/${slug}`);
  const professionalServiceLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: team.name,
    description: ((team.description as string) ?? "").slice(0, 280),
    url: teamUrl,
    ...(teamLocation
      ? {
          address: {
            "@type": "PostalAddress",
            addressRegion: teamLocation,
            addressCountry: "AU",
          },
        }
      : {}),
    ...(serviceAreas && serviceAreas.length > 0
      ? { areaServed: serviceAreas.map((s) => ({ "@type": "State", name: s })) }
      : {}),
    ...(squadMembers.length > 0
      ? {
          employee: squadMembers.slice(0, 10).map((m) => ({
            "@type": "Person",
            name: m.pro_name,
            ...(m.public_title ? { jobTitle: m.public_title } : {}),
            ...(m.pro_slug ? { url: absoluteUrl(`/advisor/${m.pro_slug}`) } : {}),
          })),
        }
      : {}),
    ...(typeof completionPct === "number" && outcomesSubmitted > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            // Map completion-rate percentage onto a 1-5 scale so search
            // engines surface stars (50% → 2.5, 100% → 5).
            ratingValue: Math.max(1, Math.round((completionPct / 100) * 5 * 10) / 10),
            reviewCount: outcomesSubmitted,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(testimonials.length > 0
      ? {
          review: testimonials.slice(0, 5).map((t) => ({
            "@type": "Review",
            ...(t.rating
              ? {
                  reviewRating: {
                    "@type": "Rating",
                    ratingValue: t.rating,
                    bestRating: 5,
                    worstRating: 1,
                  },
                }
              : {}),
            reviewBody: t.testimonial,
            author: { "@type": "Person", name: "Verified consumer" },
            ...(t.submitted_at ? { datePublished: t.submitted_at } : {}),
          })),
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(professionalServiceLd) }}
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
            {onlineNow > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-full"
                title="Squad members with an active session in the last 5 minutes"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {onlineNow} member{onlineNow === 1 ? "" : "s"} online
              </span>
            )}
            {isActiveMember && (
              <Link
                href={`/teams/${slug}/inbox`}
                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
              >
                Open squad inbox →
              </Link>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
            {team.name as string}
          </h1>
          {team.description && (
            <p className="text-slate-600 leading-relaxed max-w-3xl mb-3">
              {team.description as string}
            </p>
          )}

          {/* Specialty tags — finer-grained discovery signals beyond
              the headline team_category. Hides when none set. */}
          {Array.isArray(team.specialty_tags) &&
            (team.specialty_tags as string[]).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6">
                {(team.specialty_tags as string[]).slice(0, 12).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5"
                  >
                    {t.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
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
            <Link
              href={`/teams/${slug}/availability`}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold px-5 py-3 rounded-xl hover:border-emerald-300 hover:text-emerald-700"
              title="See when this squad is open for intro calls"
            >
              <Icon name="calendar" size={16} />
              See team availability
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

          {/* Activity heatmap — when this squad is most responsive.
              Reads 90d of brief_messages by member into a 7×24 grid.
              Returns null if no message history. */}
          <ActivityHeatmap
            buckets={heatmapBuckets}
            total={heatmapTotal}
          />

          {testimonials.length > 0 && (
            <TestimonialList testimonials={testimonials} />
          )}

          {/* Our story — long-form prose set by the squad lead. Renders only
              once the ecosystem migration lands and the team writes one. */}
          {typeof team.team_story === "string" && team.team_story.trim().length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                Our story
              </p>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line max-w-3xl">
                {team.team_story as string}
              </div>
            </section>
          )}

          <SquadStack members={squadMembers} />

          {/* Combined case studies — published work from squad members,
              attributed per member. */}
          {teamCaseStudies.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                Case studies from this squad
              </p>
              <p className="text-sm text-slate-600 mb-5">
                Real engagements written up by squad members. Outcomes are
                specific to each client&rsquo;s circumstances.
              </p>
              <div className="space-y-3">
                {teamCaseStudies.map((cs) => {
                  const author = professionals[cs.professional_id];
                  return (
                    <details
                      key={cs.id}
                      className="group border border-slate-100 rounded-xl open:border-amber-300"
                    >
                      <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{cs.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {author ? `By ${author.name}` : "Squad member"} ·{" "}
                            {cs.client_type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <Icon
                          name="chevron-down"
                          size={16}
                          className="text-slate-500 shrink-0 transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <div className="px-4 pb-4 space-y-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Situation</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{cs.situation}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Approach</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{cs.approach}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Outcome</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{cs.outcome}</p>
                        </div>
                        {author && (
                          <Link
                            href={`/advisor/${author.slug}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                          >
                            View {author.name}&rsquo;s profile →
                          </Link>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}

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
