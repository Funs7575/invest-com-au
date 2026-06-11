import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { TeamMember, Article, Broker, Professional } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  profilePageJsonLd,
  formatRole,
  SITE_NAME,
} from "@/lib/seo";
import { personJsonLd } from "@/lib/schema-markup";
import { NOINDEX_PERSONA_SLUGS } from "@/lib/compliance";
import { computeAdvisorTrustScore } from "@/lib/advisor-trust-score";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("full_name, role, short_bio")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!member) return { title: "Reviewer Not Found" };

  const title = `${member.full_name} — ${formatRole(member.role)}`;
  const description =
    member.short_bio ||
    `${member.full_name} is a ${formatRole(member.role).toLowerCase()} at ${SITE_NAME}. They review and fact-check financial product content.`;

  const robots = NOINDEX_PERSONA_SLUGS.has(slug)
    ? { index: false, follow: false }
    : undefined;

  const ogImageUrl = `/api/og?title=${encodeURIComponent(member.full_name)}&subtitle=${encodeURIComponent(formatRole(member.role) + " at " + SITE_NAME)}&type=default`;
  return {
    title,
    description,
    ...(robots && { robots }),
    openGraph: {
      type: "profile" as const,
      title,
      description,
      url: absoluteUrl(`/reviewers/${slug}`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: member.full_name }],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: {
      canonical: `/reviewers/${slug}`,
    },
  };
}

/** Compute "years active" from the team member's created_at date. */
function yearsActive(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  if (isNaN(created)) return 0;
  return Math.floor((Date.now() - created) / (365.25 * 24 * 60 * 60 * 1000));
}

export default async function ReviewerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!member) notFound();

  const m = member as TeamMember;

  // Fetch articles reviewed by this person
  const { data: reviewedArticles } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, category, published_at, read_time")
    .eq("reviewer_id", m.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Fetch broker reviews by this person
  const { data: reviewedBrokers } = await supabase
    .from("brokers")
    .select("id, name, slug, rating, tagline, color")
    .eq("reviewer_id", m.id)
    .eq("status", "active")
    .order("name");

  const articles = (reviewedArticles || []) as Article[];
  const brokers = (reviewedBrokers || []) as Broker[];

  // Cross-link: if the reviewer is also a listed advisor, fetch their
  // professional profile for the Trust Score badge.
  let advisorProfile: Professional | null = null;
  if (m.advisor_slug) {
    const { data: prof } = await supabase
      .from("professionals")
      .select(
        "id, slug, name, type, verified, afsl_number, registration_number, " +
          "verified_at, created_at, years_experience, bio, photo_url, " +
          "qualifications, education, memberships, fee_structure, fee_description, " +
          "linkedin_url, website, languages, rating, review_count"
      )
      .eq("slug", m.advisor_slug)
      .eq("status", "active")
      .single();
    if (prof) advisorProfile = prof as unknown as Professional;
  }

  // Compute trust score only when we have a linked advisor profile
  const trustScore = advisorProfile
    ? computeAdvisorTrustScore({
        verified: advisorProfile.verified,
        afsl_number: advisorProfile.afsl_number,
        registration_number: advisorProfile.registration_number,
        verified_at: advisorProfile.verified_at,
        created_at: advisorProfile.created_at,
        years_experience: advisorProfile.years_experience,
        bio: advisorProfile.bio,
        photo_url: advisorProfile.photo_url,
        qualifications: advisorProfile.qualifications as unknown[],
        education: advisorProfile.education as unknown[],
        memberships: advisorProfile.memberships as unknown[],
        fee_structure: advisorProfile.fee_structure,
        fee_description: advisorProfile.fee_description,
        linkedin_url: advisorProfile.linkedin_url,
        website: advisorProfile.website,
        languages: advisorProfile.languages as unknown[],
        rating: advisorProfile.rating,
        review_count: advisorProfile.review_count,
      })
    : null;

  // JSON-LD
  const profileLd = profilePageJsonLd(m, "reviewers");
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reviewers", url: absoluteUrl("/reviewers") },
    { name: m.full_name },
  ]);

  // Richer Person block with sameAs + review activity counters
  const personLd = personJsonLd({
    name: m.full_name,
    profileUrl: `/reviewers/${m.slug}`,
    description: m.short_bio,
    jobTitle: formatRole(m.role),
    imageUrl: m.avatar_url,
    linkedinUrl: m.linkedin_url,
    twitterUrl: m.twitter_url,
    additionalSameAs: m.publications?.map((p) => p.url),
    credentials: m.credentials,
    articlesReviewedCount: articles.length > 0 ? articles.length : null,
    productReviewsCount: brokers.length > 0 ? brokers.length : null,
    activeFrom: m.created_at,
  });

  const initials = m.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Credential stats line
  const activeYears = yearsActive(m.created_at);
  const totalReviews = articles.length + brokers.length;

  return (
    <div>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profileLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Hero */}
      <section className="bg-brand text-white py-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <div className="text-sm text-slate-500 mb-8">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link href="/reviewers" className="hover:text-white transition-colors">
                Reviewers
              </Link>
              <span className="mx-2">/</span>
              <span className="text-slate-300">{m.full_name}</span>
            </div>

            <div className="flex items-start gap-6">
              {/* Avatar */}
              {m.avatar_url ? (
                <Image
                  src={m.avatar_url}
                  alt={m.full_name}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/20 shrink-0"
                  priority
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                  {initials}
                </div>
              )}

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
                  {m.full_name}
                </h1>
                <span className="inline-block text-sm font-medium bg-white/10 text-slate-300 px-3 py-1 rounded-full">
                  {formatRole(m.role)}
                </span>

                {/* Credential stats line */}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  {totalReviews > 0 && (
                    <span>
                      <span className="text-white font-semibold">{totalReviews}</span>{" "}
                      {totalReviews === 1 ? "review" : "reviews"} published
                    </span>
                  )}
                  {articles.length > 0 && (
                    <span>
                      <span className="text-white font-semibold">{articles.length}</span>{" "}
                      {articles.length === 1 ? "article" : "articles"} reviewed
                    </span>
                  )}
                  {brokers.length > 0 && (
                    <span>
                      <span className="text-white font-semibold">{brokers.length}</span>{" "}
                      broker{brokers.length === 1 ? "" : "s"} reviewed
                    </span>
                  )}
                  {activeYears > 0 && (
                    <span>
                      Active for{" "}
                      <span className="text-white font-semibold">{activeYears}</span>{" "}
                      {activeYears === 1 ? "year" : "years"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="py-5 md:py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Bio */}
            {m.short_bio && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">About</h2>
                <p className="text-slate-700 leading-relaxed">{m.short_bio}</p>
              </div>
            )}

            {/* Credentials */}
            {m.credentials && m.credentials.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">
                  Credentials &amp; Expertise
                </h2>
                <ul className="space-y-2">
                  {m.credentials.map((cred, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-slate-700"
                    >
                      <span className="text-emerald-600 mt-0.5">&#10003;</span>
                      {cred}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Advisor profile cross-link + Trust Score badge */}
            {advisorProfile && trustScore && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-emerald-900 mb-1">
                      Also listed as a Financial Advisor
                    </h3>
                    <p className="text-sm text-emerald-800/80 leading-relaxed mb-3">
                      {m.full_name} is also listed in the Invest.com.au advisor
                      directory. Their profile has been independently verified
                      and carries a Trust Score of{" "}
                      <span className={`font-bold ${trustScore.labelColor}`}>
                        {trustScore.overall}/100
                      </span>{" "}
                      ({trustScore.label}).
                    </p>
                    <Link
                      href={`/advisor/${advisorProfile.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      View Advisor Profile
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  {/* Mini Trust Score badge */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-14 h-14 rounded-full border-4 border-emerald-300 bg-white flex items-center justify-center">
                      <span className={`text-lg font-extrabold ${trustScore.labelColor}`}>
                        {trustScore.overall}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-700 font-medium mt-1">
                      Trust Score
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Disclosure */}
            {m.disclosure && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-amber-800 mb-1">
                  Disclosure
                </h3>
                <p className="text-sm text-amber-900/80 leading-relaxed">
                  {m.disclosure}
                </p>
              </div>
            )}

            {/* Review Process */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Review Process
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                As an expert reviewer, {m.full_name.split(" ")[0]} independently
                validates fee claims, checks compliance disclosures, and signs off
                on content accuracy before publication. All reviews follow our{" "}
                <Link href="/methodology" className="text-slate-700 font-medium hover:underline">
                  6-factor methodology
                </Link>{" "}
                and{" "}
                <Link href="/how-we-verify" className="text-slate-700 font-medium hover:underline">
                  fee verification process
                </Link>
                .
              </p>
            </div>

            {/* Links */}
            {(m.linkedin_url || m.twitter_url || (m.publications && m.publications.length > 0)) && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-3">Links</h2>
                <div className="flex flex-wrap gap-3">
                  {m.linkedin_url && (
                    <a
                      href={m.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {m.twitter_url && (
                    <a
                      href={m.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter / X
                    </a>
                  )}
                  {m.publications?.map((pub, i) => (
                    <a
                      key={i}
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {pub.name}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Editorial Contact
              </h3>
              <p className="text-sm text-slate-600">
                For corrections, questions, or feedback:{" "}
                <a
                  href="mailto:editorial@invest.com.au"
                  className="text-slate-700 hover:underline"
                >
                  editorial@invest.com.au
                </a>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                <Link href="/editorial-policy" className="text-slate-700 hover:underline">
                  Read our editorial policy
                </Link>
                {" "}&middot;{" "}
                <Link href="/methodology" className="text-slate-700 hover:underline">
                  Our methodology
                </Link>
              </p>
            </div>

            {/* Broker reviews by this reviewer */}
            {brokers.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Broker Reviews by {m.full_name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {brokers.map((broker) => (
                    <Link
                      key={broker.id}
                      href={`/broker/${broker.slug}`}
                      className="flex items-center gap-3 border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all bg-white"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: broker.color || "#334155" }}
                      >
                        {broker.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900">
                          {broker.name}
                        </div>
                        {broker.rating && (
                          <div className="text-xs text-amber-600">
                            {"★".repeat(Math.floor(broker.rating))}{" "}
                            {broker.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Articles reviewed */}
            {articles.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Articles Reviewed by {m.full_name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all bg-white"
                    >
                      {article.category && (
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {article.category}
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-slate-900 mt-1 mb-2 line-clamp-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {article.read_time && (
                          <span>{article.read_time} min read</span>
                        )}
                        {article.published_at && (
                          <span>
                            {new Date(article.published_at).toLocaleDateString(
                              "en-AU",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
