import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import type { Metadata } from "next";
import AdvisorProfileClient from "./AdvisorProfileClient";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: pro } = await supabase.from("professionals").select("name, firm_name, type, location_display, meta_title, meta_description").eq("slug", slug).eq("status", "active").single();
  if (!pro) return {};

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || "Financial Professional";
  const title = pro.meta_title || `${pro.name}${pro.firm_name ? ` — ${pro.firm_name}` : ""} | ${typeLabel}`;
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
        .select("*")
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
    </>
  );
}
