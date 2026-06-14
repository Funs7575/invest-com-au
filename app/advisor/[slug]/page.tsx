import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import AdvisorProfileClient from "./AdvisorProfileClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import ComplianceFooter from "@/components/ComplianceFooter";
import ClaimListingButton from "@/components/claims/ClaimListingButton";
import OutcomeBadge from "@/components/outcomes/OutcomeBadge";
import TestimonialList from "@/components/outcomes/TestimonialList";
import EndorsementsSection from "./components/EndorsementsSection";
import {
  getProviderOutcomeBadge,
  getPublicTestimonials,
} from "@/lib/outcomes/profile-display";
import { computeAdvisorTrustScore } from "@/lib/advisor-trust-score";
import { computeAdvisorReputation } from "@/lib/advisor-reputation";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { SHOW_ADVISOR_RATINGS } from "@/lib/compliance-config";
import AdvisorTrustScoreSection from "./components/AdvisorTrustScoreSection";
import AdvisorReputationSummary from "./components/AdvisorReputationSummary";
import RecentAdvisorInsights from "./components/RecentAdvisorInsights";
import FollowAdvisorButton from "@/components/FollowAdvisorButton";
import { computeIdealClientBoost, type UserMatchProfile, type IdealClientCriteria } from "@/lib/advisor-profile-match";
import { describeIdealClientCriteria } from "@/lib/ideal-client-display";
import { getRelatedForAdvisor } from "@/lib/related-content";
import RelatedRail from "@/components/RelatedRail";
import { ADVISOR_PUBLIC_COLUMNS } from "./public-columns";

export const revalidate = 1800;

// ADV-011: max reviews embedded in the initial page payload. The total approved
// count is fetched separately so the UI can offer a "view all" affordance.
const REVIEWS_LIMIT = 20;

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase.from("professionals").select("slug").eq("status", "active");
  return (data || []).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: pro } = await supabase.from("professionals").select("name, firm_name, type, location_display, meta_title, meta_description").eq("slug", slug).eq("status", "active").single();
  if (!pro) return { robots: { index: false } };

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || "Financial Professional";
  const title = pro.meta_title || `${pro.name}${pro.firm_name ? ` — ${pro.firm_name}` : ""} — ${typeLabel}`;
  const description = pro.meta_description || `${pro.name} is a verified ${typeLabel.toLowerCase()}${pro.location_display ? ` in ${pro.location_display}` : ""}. Request a free consultation on invest.com.au.`;

  return {
    title,
    description,
    openGraph: {
      title: pro.name,
      description,
      images: [
        {
          url: `/api/og/advisor?slug=${encodeURIComponent(slug)}`,
          width: 1200,
          height: 630,
          alt: `${pro.name} — ${typeLabel}`,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/advisor/${slug}` },
  };
}

export default async function AdvisorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: proRow } = await supabase
    .from("professionals")
    .select(ADVISOR_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  // Explicit column projection makes Supabase return GenericStringError typing; cast back to the row shape.
  const pro = proRow as unknown as Professional | null;
  const profileUpdatedAt = (proRow as Record<string, unknown> | null)?.updated_at as string | null ?? null;

  if (!pro) notFound();

  // Get similar advisors, reviews, and firm team in parallel
  let similar: Professional[] = [];
  let reviews: import("@/lib/types").ProfessionalReview[] = [];
  // ADV-011: reviews are capped at REVIEWS_LIMIT for the page payload; track the
  // approved total separately so the UI can say "Showing N of M".
  let reviewTotalCount = 0;
  let teamMembers: Professional[] = [];
  let firm: import("@/lib/types").AdvisorFirm | null = null;
  let expertArticles: { id: number; title: string; slug: string; excerpt: string; category: string; published_at: string; reading_time_mins: number | null; view_count: number }[] = [];

  try {
    const queries: PromiseLike<unknown>[] = [
      supabase
        .from("professionals")
        .select("id, name, slug, firm_name, type, location_display, rating, review_count, fee_description, verified, specialties, photo_url, account_type, hourly_rate_cents, flat_fee_cents, aum_percentage, initial_consultation_free")
        .eq("status", "active")
        .eq("type", pro.type)
        .neq("slug", slug)
        .order("rating", { ascending: false })
        .limit(3),
      supabase
        .from("professional_reviews")
        .select("*, advisor_response:professional_review_responses(id, body, created_at, updated_at)", { count: "exact" })
        .eq("professional_id", pro.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(REVIEWS_LIMIT),
      supabase
        .from("advisor_articles")
        .select("id, title, slug, excerpt, category, published_at, reading_time_mins, view_count")
        .eq("professional_id", pro.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(10),
    ];

    // If advisor is part of a firm, fetch team members and firm info
    if (pro.firm_id) {
      queries.push(
        supabase
          .from("professionals")
          .select("id, name, slug, type, photo_url, rating, review_count, specialties, fee_description, hourly_rate_cents, flat_fee_cents, aum_percentage, is_firm_admin")
          .eq("firm_id", pro.firm_id)
          .eq("status", "active")
          .neq("id", pro.id)
          .order("is_firm_admin", { ascending: false }),
        supabase
          .from("advisor_firms")
          .select("*")
          .eq("id", pro.firm_id)
          .single()
      );
    }

    const results = await Promise.all(queries);
    similar = ((results[0] as { data: Professional[] | null }).data as Professional[]) || [];
    reviews = ((results[1] as { data: import("@/lib/types").ProfessionalReview[] | null }).data as import("@/lib/types").ProfessionalReview[]) || [];
    reviewTotalCount = (results[1] as { count: number | null }).count ?? reviews.length;
    expertArticles = ((results[2] as { data: typeof expertArticles | null }).data) || [];
    if (pro.firm_id && results.length > 3) {
      teamMembers = ((results[3] as { data: Professional[] | null }).data as Professional[]) || [];
      firm = ((results[4] as { data: import("@/lib/types").AdvisorFirm | null }).data as import("@/lib/types").AdvisorFirm) || null;
    }
  } catch {
    // Secondary queries failed — continue with defaults
  }

  // ADV-013: surface verified, public Expert Team memberships so an advisor's
  // squad is discoverable from their profile (distinct from the firm "Practice"
  // card above — Expert Teams are cross-firm collaborations). Reads only public
  // rows (anon RLS exposes public members + verified public teams), so the
  // user-cookie client is sufficient.
  let expertTeams: { slug: string; name: string; public_title: string | null }[] = [];
  try {
    const { data: teamRows } = await supabase
      .from("expert_team_members")
      .select("public_title, team:expert_teams!inner(slug, name, public, verification_status)")
      .eq("professional_id", pro.id)
      .eq("status", "active")
      .eq("can_appear_publicly", true)
      .eq("team.public", true)
      .eq("team.verification_status", "verified");
    expertTeams = ((teamRows ?? []) as unknown as {
      public_title: string | null;
      team: { slug: string; name: string } | null;
    }[])
      .filter((r) => r.team)
      .map((r) => ({
        slug: r.team!.slug,
        name: r.team!.name,
        public_title: r.public_title,
      }));
  } catch {
    // Expert-team lookup failed — continue without the team link.
  }

  // Increment daily profile view counter (fire-and-forget)
  const today = new Date().toISOString().split("T")[0];
  try {
    await supabase.rpc("increment_advisor_view", { p_professional_id: pro.id, p_date: today });
  } catch {
    // RPC function may not exist yet — safe to ignore
  }

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: pro.name },
  ]);

  const profileUrl = absoluteUrl(`/advisor/${slug}`);
  const sameAs: string[] = [];
  if (pro.website) sameAs.push(pro.website);
  if (pro.linkedin_url) sameAs.push(pro.linkedin_url);
  if (pro.twitter_url) sameAs.push(pro.twitter_url);

  // Fetch social proof data: services, certifications, case studies
  type AdvisorService = {
    id: string;
    name: string;
    description: string | null;
    price_type: string;
    price_from_cents: number | null;
    price_to_cents: number | null;
    sort_order: number | null;
  };
  type AdvisorCertification = {
    id: string;
    name: string;
    issuer: string | null;
    issued_at: string | null;
    credential_url: string | null;
  };
  type AdvisorCaseStudy = {
    id: string;
    title: string;
    client_type: string | null;
    outcome_type: string | null;
    situation: string | null;
    approach: string | null;
    outcome: string | null;
  };

  let advisorServices: AdvisorService[] = [];
  let advisorCertifications: AdvisorCertification[] = [];
  let advisorCaseStudies: AdvisorCaseStudy[] = [];

  try {
    const [servicesResult, certificationsResult, caseStudiesResult] = await Promise.all([
      supabase
        .from("advisor_services")
        .select("id, name, description, price_type, price_from_cents, price_to_cents, sort_order")
        .eq("professional_id", pro.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("advisor_certifications")
        .select("id, name, issuer, issued_at, credential_url")
        .eq("professional_id", pro.id),
      supabase
        .from("advisor_case_studies")
        .select("id, title, client_type, outcome_type, situation, approach, outcome")
        .eq("professional_id", pro.id)
        .eq("status", "published")
        .limit(3),
    ]);
    advisorServices = (servicesResult.data as AdvisorService[]) ?? [];
    advisorCertifications = (certificationsResult.data as AdvisorCertification[]) ?? [];
    advisorCaseStudies = (caseStudiesResult.data as AdvisorCaseStudy[]) ?? [];
  } catch {
    // Social proof queries failed — continue with defaults
  }

  // Outcome flywheel display data + endorsements + user session + ideal-client
  // criteria (public-read; powers the "Who I Work With" chips) — in parallel.
  const [outcomeBadge, testimonials, endorsementsResult, sessionResult, idealClientResult] = await Promise.all([
    getProviderOutcomeBadge({ professionalId: pro.id }),
    getPublicTestimonials({ professionalId: pro.id, limit: 5 }),
    supabase.from("advisor_endorsements").select("skill, user_id").eq("professional_id", pro.id).limit(500),
    supabase.auth.getUser(),
    supabase.from("advisor_ideal_clients").select("criteria").eq("professional_id", pro.id).maybeSingle(),
  ]);

  const idealClientCriteria = (idealClientResult.data?.criteria ?? null) as IdealClientCriteria | null;
  const idealClientGroups = describeIdealClientCriteria(idealClientCriteria);

  const endorsementRows: { skill: string; user_id: string }[] = endorsementsResult.data ?? [];
  const sessionUser = sessionResult.data.user;

  // Pre-fetch the logged-in user's follow state + good-fit check
  let initialFollowing = false;
  let isGoodFit = false;
  if (sessionUser) {
    const [followRow, investorProfileRow] = await Promise.all([
      supabase
        .from("advisor_follows")
        .select("id")
        .eq("follower_user_id", sessionUser.id)
        .eq("following_professional_id", pro.id)
        .maybeSingle(),
      supabase
        .from("investor_profiles")
        .select("primary_vertical, budget_band, is_fhb, is_hnw, is_pre_retiree, experience_level, location_state")
        .eq("auth_user_id", sessionUser.id)
        .maybeSingle(),
    ]);
    initialFollowing = !!followRow.data;

    if (investorProfileRow.data && idealClientCriteria) {
      const ip = investorProfileRow.data as {
        primary_vertical: string | null;
        budget_band: string | null;
        is_fhb: boolean;
        is_hnw: boolean;
        is_pre_retiree: boolean;
        experience_level: string | null;
        location_state: string | null;
      };
      const userProfile: UserMatchProfile = {
        primary_vertical: ip.primary_vertical,
        budget_band: ip.budget_band,
        is_fhb: ip.is_fhb,
        is_hnw: ip.is_hnw,
        is_pre_retiree: ip.is_pre_retiree,
        experience_level: ip.experience_level,
        location_state: ip.location_state,
      };
      const boost = computeIdealClientBoost(userProfile, idealClientCriteria);
      isGoodFit = boost >= 5; // at least 50% of criteria match
    }
  }

  const endorsementCounts: Record<string, number> = {};
  for (const row of endorsementRows) {
    endorsementCounts[row.skill] = (endorsementCounts[row.skill] ?? 0) + 1;
  }
  const myEndorsed = new Set(
    sessionUser ? endorsementRows.filter((r) => r.user_id === sessionUser.id).map((r) => r.skill) : []
  );
  const initialSkills = Object.entries(endorsementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([skill, count]) => ({ skill, count, endorsedByMe: myEndorsed.has(skill) }));

  const personLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: pro.name,
    url: profileUrl,
    jobTitle: PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS],
    ...(pro.firm_name ? { worksFor: { "@type": "Organization", name: pro.firm_name } } : {}),
    ...(pro.location_display ? { address: { "@type": "PostalAddress", addressLocality: pro.location_display, addressCountry: "AU" } } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(pro.photo_url ? { image: pro.photo_url } : {}),
    ...(pro.qualifications?.length ? { hasCredential: pro.qualifications.map((q: string) => ({ "@type": "EducationalOccupationalCredential", credentialCategory: q })) } : {}),
    ...(pro.education?.length ? { alumniOf: pro.education.map((e: { institution: string; degree: string }) => ({ "@type": "EducationalOrganization", name: e.institution })) } : {}),
    ...(pro.languages?.length && pro.languages.length > 1 ? { knowsLanguage: pro.languages } : {}),
  };

  // LocalBusiness schema for advisor firms — helps Google rich results
  const localBusinessLd = pro.firm_name ? {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: pro.firm_name,
    description: pro.bio ? String(pro.bio).slice(0, 200) : `${PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS]} in ${pro.location_display || "Australia"}`,
    ...(pro.location_display ? {
      address: {
        "@type": "PostalAddress",
        addressLocality: pro.location_suburb || "",
        addressRegion: pro.location_state || "",
        addressCountry: "AU",
      }
    } : {}),
    ...(pro.website ? { url: pro.website } : {}),
    ...(pro.phone ? { telephone: String(pro.phone) } : {}),
    ...(SHOW_ADVISOR_RATINGS && pro.rating && pro.review_count > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: pro.rating,
        reviewCount: pro.review_count,
        bestRating: 5,
        worstRating: 1,
      }
    } : {}),
    priceRange: pro.fee_description || "Contact for pricing",
  } : null;

  function formatServicePrice(service: { price_type: string; price_from_cents: number | null; price_to_cents: number | null }): string {
    if (service.price_type === "fixed" && service.price_from_cents) {
      return `$${Math.round(service.price_from_cents / 100).toLocaleString("en-AU")}`;
    }
    if (service.price_type === "hourly" && service.price_from_cents) {
      return `From $${Math.round(service.price_from_cents / 100).toLocaleString("en-AU")}/hr`;
    }
    return "Contact for pricing";
  }

  // ── Advisor Trust Score (computed on-read from existing profile data) ──
  const trustScore = computeAdvisorTrustScore({
    verified: pro.verified,
    afsl_number: pro.afsl_number,
    registration_number: pro.registration_number,
    verified_at: pro.verified_at,
    created_at: pro.created_at,
    years_experience: pro.years_experience,
    bio: pro.bio,
    photo_url: pro.photo_url,
    qualifications: pro.qualifications as unknown[] | null,
    education: pro.education as unknown[] | null,
    memberships: pro.memberships as unknown[] | null,
    fee_structure: pro.fee_structure,
    fee_description: pro.fee_description,
    linkedin_url: pro.linkedin_url,
    website: pro.website,
    languages: pro.languages as unknown[] | null,
    rating: pro.rating,
    review_count: pro.review_count,
  });

  // ── Advisor Reputation Score (computed from approved reviews) ──
  const verifiedReviewCount = reviews.filter((r) => r.verified_engagement).length;
  const totalReviewCount = reviews.length;
  const avgRating =
    totalReviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewCount
      : null;

  const reputationScore = computeAdvisorReputation({
    total_reviews: totalReviewCount,
    verified_reviews: verifiedReviewCount,
    avg_rating: avgRating,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      {localBusinessLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }} />}
      {(pro.faqs?.length ?? 0) > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (pro.faqs ?? []).map((f: { q: string; a: string }) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }) }} />
      )}
      <AdvisorProfileClient professional={pro as Professional} similar={similar} reviews={reviews} reviewTotalCount={reviewTotalCount} teamMembers={teamMembers} firm={firm} expertTeams={expertTeams} expertArticles={expertArticles} idealClientGroups={idealClientGroups} />
      {/* Good-fit hint — shown when logged-in user's profile matches ideal-client criteria */}
      {isGoodFit && (
        <div className="container-custom max-w-4xl mt-4">
          <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
            <span className="text-violet-600 font-bold text-sm">✓</span>
            <p className="text-sm font-semibold text-violet-800">
              Good fit for your profile — based on your stated investment preferences
            </p>
            <span className="ml-auto text-[10px] text-violet-500">factual match, not personal advice</span>
          </div>
        </div>
      )}

      {/* Follow strip — visible below the profile header */}
      <div className="container-custom max-w-4xl mt-4">
        <div className="flex items-center justify-between py-2">
          <FollowAdvisorButton
            professionalId={pro.id}
            initialFollowing={initialFollowing}
            followerCount={pro.follower_count ?? 0}
          />
          {profileUpdatedAt && (
            <span className="text-xs text-slate-500">
              Profile updated{" "}
              {(() => {
                // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe
                const days = Math.floor((Date.now() - new Date(profileUpdatedAt).getTime()) / 86400000);
                if (days < 1) return "today";
                if (days === 1) return "yesterday";
                if (days < 30) return `${days} days ago`;
                const months = Math.floor(days / 30);
                return months === 1 ? "1 month ago" : `${months} months ago`;
              })()}
            </span>
          )}
        </div>
      </div>

      {/* ── Social proof: Services, Certifications, Case Studies ───────── */}
      {(advisorServices.length > 0 || advisorCertifications.length > 0 || advisorCaseStudies.length > 0) && (
        <div className="container-custom max-w-4xl mt-6 space-y-5">

          {/* Services section */}
          {advisorServices.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-teal-600">
                    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <h2 className="text-[15px] font-bold text-slate-900 m-0">Services Offered</h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {advisorServices.map((service) => (
                    <div
                      key={service.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 m-0 leading-snug">
                          {service.name}
                        </h3>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2 py-0.5 shrink-0 whitespace-nowrap">
                          {formatServicePrice(service)}
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-[13px] text-slate-500 m-0 leading-relaxed line-clamp-2">
                          {service.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Certifications section */}
          {advisorCertifications.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-teal-600">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                </div>
                <h2 className="text-[15px] font-bold text-slate-900 m-0">Certifications</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2.5">
                  {advisorCertifications.map((cert) => {
                    const inner = (
                      <div className="flex flex-col gap-px">
                        <span className="text-[13px] font-bold text-slate-900">{cert.name}</span>
                        <span className="text-[11px] text-slate-500">
                          {[cert.issuer, cert.issued_at ? new Date(cert.issued_at).getFullYear() : null].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    );
                    return cert.credential_url ? (
                      <a
                        key={cert.id}
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 border border-teal-200 rounded-[10px] bg-teal-50 no-underline transition-colors duration-150 hover:border-teal-300"
                      >
                        {inner}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-teal-600">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <div
                        key={cert.id}
                        className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 rounded-[10px] bg-slate-50"
                      >
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Case Studies section */}
          {advisorCaseStudies.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-teal-600">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-900 m-0">Case Studies</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-col gap-3">
                  {advisorCaseStudies.map((cs) => (
                    <details key={cs.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <summary className="flex items-center justify-between gap-3 px-[18px] py-3.5 cursor-pointer list-none bg-slate-50">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-sm font-bold text-slate-900 leading-snug">{cs.title}</span>
                          {cs.client_type && (
                            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md px-2 py-0.5 shrink-0">
                              {cs.client_type}
                            </span>
                          )}
                          {cs.outcome_type && (
                            <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-md px-2 py-0.5 shrink-0">
                              {cs.outcome_type}
                            </span>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-slate-500">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </summary>
                      <div className="px-[18px] pt-4 pb-[18px] bg-white flex flex-col gap-3.5">
                        {cs.situation && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.06em] mb-1">Situation</p>
                            <p className="text-[13px] text-slate-900 m-0 leading-relaxed">{cs.situation}</p>
                          </div>
                        )}
                        {cs.approach && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.06em] mb-1">Approach</p>
                            <p className="text-[13px] text-slate-900 m-0 leading-relaxed">{cs.approach}</p>
                          </div>
                        )}
                        {cs.outcome && (
                          <div>
                            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-[0.06em] mb-1">Outcome</p>
                            <p className="text-[13px] text-slate-900 m-0 leading-relaxed">{cs.outcome}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Advisor Trust Score section ── */}
      <div className="container-custom max-w-4xl mt-6">
        <AdvisorTrustScoreSection
          trustScore={trustScore}
          advisorName={pro.name}
          generalAdviceWarning={GENERAL_ADVICE_WARNING}
        />
      </div>

      {/* ── Advisor Reputation Summary (review-side factual signals) ── */}
      <div className="container-custom max-w-4xl mt-6">
        <AdvisorReputationSummary
          reputation={reputationScore}
          advisorName={pro.name}
          generalAdviceWarning={GENERAL_ADVICE_WARNING}
        />
      </div>

      {/* Outcome-flywheel badge + verified testimonials — fetched in
          parallel above. Renders below the main profile so it
          augments without disrupting the existing layout. */}
      {(outcomeBadge || testimonials.length > 0) && (
        <div className="container-custom max-w-4xl mt-6 space-y-4">
          {outcomeBadge && (
            <div className="flex items-center gap-2 px-1">
              <OutcomeBadge badge={outcomeBadge} />
            </div>
          )}
          <TestimonialList testimonials={testimonials} />
        </div>
      )}
      <div className="container-custom max-w-4xl mt-4">
        <EndorsementsSection
          slug={slug}
          initialSkills={initialSkills}
          isLoggedIn={!!sessionUser}
        />
      </div>
      {/* ── Recent insights from this advisor ── */}
      <RecentAdvisorInsights slug={slug} advisorId={pro.id} advisorName={pro.name} />

      {/* Related advisors + guide rail — factual discovery, not advice. */}
      {(() => {
        const { advisors: relAdvisors, guides: relGuides } = getRelatedForAdvisor(
          { id: pro.id, slug: pro.slug, type: pro.type, specialties: pro.specialties ?? [], location_state: pro.location_state },
          similar.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            type: s.type,
            specialties: s.specialties ?? [],
            location_state: s.location_state,
            location_display: s.location_display,
            rating: s.rating,
            verified: s.verified,
            firm_name: s.firm_name,
          })),
        );
        if (relAdvisors.length === 0 && relGuides.length === 0) return null;
        return (
          <div className="container-custom max-w-4xl mt-6">
            {relAdvisors.length > 0 && (
              <RelatedRail
                heading={`Similar ${PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS] ?? "Advisors"}`}
                items={relAdvisors}
              />
            )}
            {relGuides.length > 0 && (
              <RelatedRail
                heading="Useful Guides"
                items={[]}
                secondaryItems={relGuides}
                className="mt-4"
              />
            )}
          </div>
        );
      })()}
      <ClaimListingButton
        claimType="advisor"
        targetSlug={pro.slug}
        targetName={pro.name}
      />
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}
