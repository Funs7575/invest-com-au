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
  const { data: pro } = await supabase.from("professionals").select("name, firm_name, type, location_display").eq("slug", slug).eq("status", "active").single();
  if (!pro) return {};

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || "Financial Professional";
  const title = `${pro.name}${pro.firm_name ? ` — ${pro.firm_name}` : ""} | ${typeLabel}`;
  const description = `${pro.name} is a verified ${typeLabel.toLowerCase()}${pro.location_display ? ` in ${pro.location_display}` : ""}. Request a free consultation on invest.com.au.`;

  return {
    title,
    description,
    openGraph: { title: `${pro.name} — Invest.com.au`, description },
    twitter: { card: "summary" },
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

  // Get similar advisors and approved reviews in parallel — gracefully handle missing tables
  let similar: Professional[] = [];
  let reviews: import("@/lib/types").ProfessionalReview[] = [];

  try {
    const [similarResult, reviewsResult] = await Promise.all([
      supabase
        .from("professionals")
        .select("id, name, slug, firm_name, type, location_display, rating, review_count, fee_description, verified, specialties, photo_url")
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
    ]);
    similar = (similarResult.data as Professional[]) || [];
    reviews = (reviewsResult.data as import("@/lib/types").ProfessionalReview[]) || [];
  } catch {
    // Secondary queries failed (e.g. missing table) — continue with defaults
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

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: pro.name,
    jobTitle: PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS],
    ...(pro.firm_name ? { worksFor: { "@type": "Organization", name: pro.firm_name } } : {}),
    ...(pro.location_display ? { address: { "@type": "PostalAddress", addressLocality: pro.location_display } } : {}),
    ...(pro.website ? { url: pro.website } : {}),
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
    ...(pro.rating ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: pro.rating,
        reviewCount: pro.review_count || 1,
        bestRating: 5,
      }
    } : {}),
    priceRange: pro.fee_description || "Contact for pricing",
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }} />
      {localBusinessLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }} />}
      <AdvisorProfileClient professional={pro as Professional} similar={similar} reviews={reviews} />
    </>
  );
}
