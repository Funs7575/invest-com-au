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
import AdvisorTrustScoreSection from "./components/AdvisorTrustScoreSection";
import AdvisorReputationSummary from "./components/AdvisorReputationSummary";
import { getRelatedForAdvisor } from "@/lib/related-content";
import RelatedRail from "@/components/RelatedRail";

export const revalidate = 1800;

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
  if (!pro) return {};

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

  const { data: pro } = await supabase
    .from("professionals")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!pro) notFound();

  // Get similar advisors, reviews, and firm team in parallel
  let similar: Professional[] = [];
  let reviews: import("@/lib/types").ProfessionalReview[] = [];
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
        .select("*, advisor_response:professional_review_responses(id, body, created_at, updated_at)")
        .eq("professional_id", pro.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20),
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
    expertArticles = ((results[2] as { data: typeof expertArticles | null }).data) || [];
    if (pro.firm_id && results.length > 3) {
      teamMembers = ((results[3] as { data: Professional[] | null }).data as Professional[]) || [];
      firm = ((results[4] as { data: import("@/lib/types").AdvisorFirm | null }).data as import("@/lib/types").AdvisorFirm) || null;
    }
  } catch {
    // Secondary queries failed — continue with defaults
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
    issued_year: number | null;
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
        .select("id, name, issuer, issued_year, credential_url")
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

  // Outcome flywheel display data + endorsements + user session — fetched in parallel.
  const [outcomeBadge, testimonials, endorsementsResult, sessionResult] = await Promise.all([
    getProviderOutcomeBadge({ professionalId: pro.id }),
    getPublicTestimonials({ professionalId: pro.id, limit: 5 }),
    supabase.from("advisor_endorsements").select("skill, user_id").eq("professional_id", pro.id).limit(500),
    supabase.auth.getUser(),
  ]);

  const endorsementRows: { skill: string; user_id: string }[] = endorsementsResult.data ?? [];
  const sessionUser = sessionResult.data.user;

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
    ...(pro.rating && pro.review_count > 0 ? {
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
      {pro.faqs?.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: pro.faqs.map((f: { q: string; a: string }) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }) }} />
      )}
      <AdvisorProfileClient professional={pro as Professional} similar={similar} reviews={reviews} teamMembers={teamMembers} firm={firm} expertArticles={expertArticles} />

      {/* ── Social proof: Services, Certifications, Case Studies ───────── */}
      {(advisorServices.length > 0 || advisorCertifications.length > 0 || advisorCaseStudies.length > 0) && (
        <div className="container-custom max-w-4xl mt-6 space-y-5">

          {/* Services section */}
          {advisorServices.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-teal-600, #0d9488)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink-900, #0f172a)", margin: 0 }}>Services Offered</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {advisorServices.map((service) => (
                    <div
                      key={service.id}
                      style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fafafa", display: "flex", flexDirection: "column", gap: 8 }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900, #0f172a)", margin: 0, lineHeight: 1.4 }}>
                          {service.name}
                        </h3>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-teal-600, #0d9488)", background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 6, padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                          {formatServicePrice(service)}
                        </span>
                      </div>
                      {service.description && (
                        <p style={{ fontSize: 13, color: "var(--color-ink-500, #64748b)", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
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
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-teal-600, #0d9488)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink-900, #0f172a)", margin: 0 }}>Certifications</h2>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {advisorCertifications.map((cert) => {
                    const inner = (
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-900, #0f172a)" }}>{cert.name}</span>
                        <span style={{ fontSize: 11, color: "var(--color-ink-500, #64748b)" }}>
                          {[cert.issuer, cert.issued_year].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    );
                    return cert.credential_url ? (
                      <a
                        key={cert.id}
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid #99f6e4", borderRadius: 10, background: "#f0fdfa", textDecoration: "none", transition: "border-color 0.15s" }}
                      >
                        {inner}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-teal-600, #0d9488)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ) : (
                      <div
                        key={cert.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#f8fafc" }}
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
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-teal-600, #0d9488)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink-900, #0f172a)", margin: 0 }}>Case Studies</h2>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {advisorCaseStudies.map((cs) => (
                    <details key={cs.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                      <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", cursor: "pointer", listStyle: "none", background: "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900, #0f172a)", lineHeight: 1.4 }}>{cs.title}</span>
                          {cs.client_type && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-teal-600, #0d9488)", background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>
                              {cs.client_type}
                            </span>
                          )}
                          {cs.outcome_type && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>
                              {cs.outcome_type}
                            </span>
                          )}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </summary>
                      <div style={{ padding: "16px 18px 18px", background: "#fff", display: "flex", flexDirection: "column", gap: 14 }}>
                        {cs.situation && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink-500, #64748b)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Situation</p>
                            <p style={{ fontSize: 13, color: "var(--color-ink-900, #0f172a)", margin: 0, lineHeight: 1.6 }}>{cs.situation}</p>
                          </div>
                        )}
                        {cs.approach && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink-500, #64748b)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Approach</p>
                            <p style={{ fontSize: 13, color: "var(--color-ink-900, #0f172a)", margin: 0, lineHeight: 1.6 }}>{cs.approach}</p>
                          </div>
                        )}
                        {cs.outcome && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-teal-600, #0d9488)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Outcome</p>
                            <p style={{ fontSize: 13, color: "var(--color-ink-900, #0f172a)", margin: 0, lineHeight: 1.6 }}>{cs.outcome}</p>
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
      {/* Related advisors + guide rail — factual discovery, not advice.
          Uses the same-type advisors already fetched above; no extra DB call. */}
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
