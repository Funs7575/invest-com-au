import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { logger } from "@/lib/logger";

export const revalidate = 3600;

const log = logger("find-advisor");

// ─── Advisor type registry ────────────────────────────────────────────────────

const ADVISOR_TYPE_MAP: Record<string, { label: string; plural: string; description: string }> = {
  smsf_accountant:    { label: "SMSF Accountant",     plural: "SMSF Accountants",     description: "self-managed super fund specialists" },
  financial_planner:  { label: "Financial Planner",   plural: "Financial Planners",   description: "certified financial planners" },
  property_advisor:   { label: "Property Advisor",    plural: "Property Advisors",    description: "property investment advisors" },
  tax_agent:          { label: "Tax Agent",            plural: "Tax Agents",            description: "registered tax agents" },
  mortgage_broker:    { label: "Mortgage Broker",     plural: "Mortgage Brokers",     description: "accredited mortgage brokers" },
  estate_planner:     { label: "Estate Planner",      plural: "Estate Planners",      description: "estate planning specialists" },
  insurance_broker:   { label: "Insurance Broker",    plural: "Insurance Brokers",    description: "accredited insurance brokers" },
  buyers_agent:       { label: "Buyer's Agent",       plural: "Buyer's Agents",       description: "licensed buyer's agents" },
  wealth_manager:     { label: "Wealth Manager",      plural: "Wealth Managers",      description: "private wealth managers" },
  aged_care_advisor:  { label: "Aged Care Advisor",   plural: "Aged Care Advisors",   description: "aged care financial specialists" },
  crypto_advisor:     { label: "Crypto Advisor",      plural: "Crypto Advisors",      description: "digital asset advisors" },
  business_broker:    { label: "Business Broker",     plural: "Business Brokers",     description: "licensed business brokers" },
  migration_agent:    { label: "Migration Agent",     plural: "Migration Agents",     description: "registered migration agents" },
  conveyancer:        { label: "Conveyancer",         plural: "Conveyancers",         description: "licensed conveyancers" },
  property_lawyer:    { label: "Property Lawyer",     plural: "Property Lawyers",     description: "property law specialists" },
};

function slugToType(slug: string): string {
  return slug.replace(/-/g, "_");
}

function citySlugToDisplay(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("professionals")
      .select("type, location_suburb")
      .eq("status", "active")
      .not("location_suburb", "is", null);

    if (error || !data) return [];

    const seen = new Set<string>();
    const params: { "advisor-type": string; city: string }[] = [];

    for (const row of data) {
      if (!row.location_suburb) continue;
      const typeInfo = ADVISOR_TYPE_MAP[row.type];
      if (!typeInfo) continue;
      const typeSlug = row.type.replace(/_/g, "-");
      const citySlug = row.location_suburb.toLowerCase().replace(/\s+/g, "-");
      const key = `${typeSlug}:${citySlug}`;
      if (!seen.has(key)) {
        seen.add(key);
        params.push({ "advisor-type": typeSlug, city: citySlug });
      }
    }

    return params;
  } catch (err) {
    log.warn("generateStaticParams failed", { err: String(err) });
    return [];
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ "advisor-type": string; city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "advisor-type": typeSlug, city: citySlug } = await params;
  const dbType = slugToType(typeSlug);
  const typeInfo = ADVISOR_TYPE_MAP[dbType];
  if (!typeInfo) return {};

  const city = citySlugToDisplay(citySlug);
  const title = `Find ${typeInfo.plural} in ${city} (${CURRENT_YEAR})`;
  const description = `Compare verified ${typeInfo.description} in ${city}. View profiles, ratings, and fees. Free to browse — pay only when you connect.`;
  const canonical = `/find/${typeSlug}/${citySlug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
    },
    twitter: { card: "summary" },
  };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

interface AdvisorRow {
  id: number;
  name: string;
  slug: string;
  type: string;
  location_suburb: string | null;
  location_state: string | null;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
  photo_url: string | null;
  bio: string | null;
  fee_model: string | null;
  initial_consultation_free: boolean | null;
  is_sponsored: boolean;
}

async function getAdvisors(dbType: string, city: string): Promise<AdvisorRow[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("professionals")
    .select(
      "id, name, slug, type, location_suburb, location_state, rating, review_count, verified, photo_url, bio, fee_model, initial_consultation_free, is_sponsored"
    )
    .eq("status", "active")
    .eq("type", dbType)
    .ilike("location_suburb", city)
    .order("is_sponsored", { ascending: false })
    .order("verified", { ascending: false })
    .order("rating", { ascending: false })
    .limit(50);

  if (error) {
    log.error("getAdvisors query failed", { error: error.message, dbType, city });
    throw new Error("Failed to load advisors");
  }

  return (data as AdvisorRow[]) || [];
}

// ─── Components ───────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="text-amber-400 text-sm" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

function AdvisorCard({ advisor }: { advisor: AdvisorRow }) {
  return (
    <article className="bg-white rounded-xl border border-slate-200 p-5 flex gap-4 hover:border-slate-300 transition-colors">
      {advisor.photo_url ? (
        <img
          src={advisor.photo_url}
          alt={advisor.name}
          width={64}
          height={64}
          className="w-16 h-16 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-400 text-xl font-semibold">
          {advisor.name.charAt(0)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <Link
              href={`/advisors/${advisor.slug}`}
              className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {advisor.name}
            </Link>
            {advisor.verified && (
              <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                Verified
              </span>
            )}
            {advisor.is_sponsored && (
              <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                Featured
              </span>
            )}
          </div>
          <Link
            href={`/advisors/${advisor.slug}`}
            className="shrink-0 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Profile
          </Link>
        </div>

        {advisor.rating !== null && advisor.review_count !== null && advisor.review_count > 0 && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
            <StarRating rating={advisor.rating} />
            <span>{advisor.rating.toFixed(1)}</span>
            <span>({advisor.review_count} review{advisor.review_count !== 1 ? "s" : ""})</span>
          </div>
        )}

        {advisor.bio && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{advisor.bio}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-400">
          {advisor.location_suburb && (
            <span>{advisor.location_suburb}{advisor.location_state ? `, ${advisor.location_state}` : ""}</span>
          )}
          {advisor.initial_consultation_free && (
            <span className="text-emerald-600 font-medium">Free initial consultation</span>
          )}
          {advisor.fee_model && (
            <span className="capitalize">{advisor.fee_model.replace(/_/g, " ")}</span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FindAdvisorPage({ params }: Props) {
  const { "advisor-type": typeSlug, city: citySlug } = await params;
  const dbType = slugToType(typeSlug);
  const typeInfo = ADVISOR_TYPE_MAP[dbType];

  if (!typeInfo) notFound();

  const city = citySlugToDisplay(citySlug);
  const advisors = await getAdvisors(dbType, city);

  if (advisors.length === 0) notFound();

  const canonical = `/find/${typeSlug}/${citySlug}`;
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: typeInfo.plural, url: absoluteUrl(`/find/${typeSlug}`) },
    { name: city },
  ]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${typeInfo.plural} in ${city}`,
    description: `Verified ${typeInfo.description} in ${city}`,
    numberOfItems: advisors.length,
    itemListElement: advisors.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LocalBusiness",
        name: a.name,
        url: absoluteUrl(`/advisors/${a.slug}`),
        ...(a.location_suburb ? { address: { "@type": "PostalAddress", addressLocality: a.location_suburb, addressCountry: "AU" } } : {}),
        ...(a.rating !== null && a.review_count !== null && a.review_count > 0
          ? { aggregateRating: { "@type": "AggregateRating", ratingValue: a.rating, reviewCount: a.review_count } }
          : {}),
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <div className="container-custom py-8">
        <nav className="text-sm text-slate-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>›</span>
          <Link href="/advisors" className="hover:text-slate-600">Find an Advisor</Link>
          <span>›</span>
          <Link href={`/find/${typeSlug}`} className="hover:text-slate-600">{typeInfo.plural}</Link>
          <span>›</span>
          <span className="text-slate-600">{city}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {typeInfo.plural} in {city}
          </h1>
          <p className="mt-2 text-slate-500">
            {advisors.length} verified {typeInfo.description} in {city}. Compare profiles, ratings, and fees — free to browse.
          </p>
        </header>

        <div className="space-y-3">
          {advisors.map((advisor) => (
            <AdvisorCard key={advisor.id} advisor={advisor} />
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-400 text-center">
          All advisors listed on {SITE_NAME} are independently verified. Ratings are based on client reviews collected directly on the platform.
        </p>
      </div>
    </>
  );
}
