import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";

interface LocationConfig {
  slug: string;
  city: string;
  state: string;
  stateCode: string;
  description: string;
}

const LOCATIONS: LocationConfig[] = [
  { slug: "sydney", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Find verified financial advisors in Sydney. Compare fees, specialties, and read client reviews." },
  { slug: "melbourne", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne financial advisors compared. SMSF specialists, financial planners, and tax agents." },
  { slug: "brisbane", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane financial advisors and planners. Independent comparison with verified credentials." },
  { slug: "perth", city: "Perth", state: "Western Australia", stateCode: "WA", description: "Perth financial advisors compared. Find fee-for-service planners, SMSF accountants, and tax agents." },
  { slug: "adelaide", city: "Adelaide", state: "South Australia", stateCode: "SA", description: "Adelaide financial advisors and planners. Independent directory with verified AFSL credentials." },
  { slug: "canberra", city: "Canberra", state: "Australian Capital Territory", stateCode: "ACT", description: "Canberra financial advisors compared. Government and public sector super specialists." },
  { slug: "hobart", city: "Hobart", state: "Tasmania", stateCode: "TAS", description: "Hobart financial advisors and planners. Compare fees and specialties." },
  { slug: "darwin", city: "Darwin", state: "Northern Territory", stateCode: "NT", description: "Darwin financial advisors. Independent comparison and client reviews." },
  { slug: "gold-coast", city: "Gold Coast", state: "Queensland", stateCode: "QLD", description: "Gold Coast financial advisors compared. Retirement planning, SMSF, and property specialists." },
  // Specialty + location combos
  { slug: "sydney-smsf", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "SMSF accountants and specialists in Sydney. Compare fees and qualifications." },
  { slug: "melbourne-smsf", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne SMSF specialists compared. Audit, setup, and ongoing management." },
  { slug: "sydney-financial-planner", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Fee-for-service financial planners in Sydney. Independent, verified advisors." },
  { slug: "melbourne-financial-planner", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne financial planners compared. Fee-only and fee-for-service options." },
  { slug: "brisbane-financial-planner", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane financial planners. Independent comparison with fee transparency." },
];

function getLocationConfig(slug: string): LocationConfig | undefined {
  return LOCATIONS.find(l => l.slug === slug);
}

export async function generateStaticParams() {
  return LOCATIONS.map(l => ({ location: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ location: string }> }): Promise<Metadata> {
  const { location } = await params;
  const loc = getLocationConfig(location);
  if (!loc) return { title: "Financial Advisor" };

  const isSmsf = location.includes("smsf");
  const isPlanner = location.includes("financial-planner");
  const type = isSmsf ? "SMSF Specialist" : isPlanner ? "Financial Planner" : "Financial Advisor";

  return {
    title: `Best ${type} ${loc.city} (${CURRENT_YEAR}) — Find & Compare`,
    description: loc.description,
    alternates: { canonical: `${SITE_URL}/find-advisor/${location}` },
    openGraph: {
      title: `Best ${type} in ${loc.city}`,
      description: loc.description,
      url: `${SITE_URL}/find-advisor/${location}`,
    },
  };
}

export default async function LocationAdvisorPage({ params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  const loc = getLocationConfig(location);
  if (!loc) notFound();

  const isSmsf = location.includes("smsf");
  const isPlanner = location.includes("financial-planner");

  const supabase = await createClient();
  let query = supabase.from("professionals").select("*").eq("status", "active").eq("location_state", loc.stateCode);
  if (isSmsf) query = query.eq("type", "smsf_accountant");
  if (isPlanner) query = query.eq("type", "financial_planner");
  const { data: advisors } = await query.order("rating", { ascending: false });

  const type = isSmsf ? "SMSF Specialist" : isPlanner ? "Financial Planner" : "Financial Advisor";
  const allAdvisors = advisors || [];

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${type}s in ${loc.city}`,
    description: loc.description,
    numberOfItems: allAdvisors.length,
    itemListElement: allAdvisors.slice(0, 10).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "FinancialService",
        name: a.name,
        description: a.bio?.slice(0, 200),
        address: { "@type": "PostalAddress", addressLocality: loc.city, addressRegion: loc.state, addressCountry: "AU" },
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav className="text-[0.6rem] text-slate-400 mb-4 flex gap-1.5">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>/</span>
          <Link href="/find-advisor" className="hover:text-slate-600">Find Advisor</Link>
          <span>/</span>
          <span className="text-slate-600">{loc.city}</span>
        </nav>

        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
          Best {type}s in {loc.city}
        </h1>
        <p className="text-sm md:text-base text-slate-500 mb-6">
          {loc.description} All advisors hold verified Australian credentials.
        </p>

        {allAdvisors.length > 0 ? (
          <div className="space-y-3">
            {allAdvisors.map(advisor => (
              <Link
                key={advisor.id}
                href={`/advisor/${advisor.slug}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-lg font-bold text-violet-600 shrink-0">
                    {advisor.name?.charAt(0) || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{advisor.name}</p>
                    <p className="text-xs text-slate-500">{advisor.firm_name}{advisor.location_suburb ? ` · ${advisor.location_suburb}` : ""}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{advisor.bio?.slice(0, 150)}</p>
                    <div className="flex gap-2 mt-2">
                      {advisor.fee_structure && <span className="text-[0.55rem] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{advisor.fee_structure}</span>}
                      {advisor.verified && <span className="text-[0.55rem] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Verified</span>}
                    </div>
                  </div>
                  {advisor.rating && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{advisor.rating}/5</p>
                      <p className="text-[0.55rem] text-slate-400">{advisor.review_count || 0} reviews</p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-lg font-bold text-slate-900 mb-2">No {type.toLowerCase()}s listed in {loc.city} yet</p>
            <p className="text-sm text-slate-500 mb-4">We're growing our network. Check back soon or browse all advisors.</p>
            <Link href="/find-advisor" className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800">
              Browse All Advisors →
            </Link>
          </div>
        )}

        {/* SEO content */}
        <div className="mt-10 space-y-4 text-sm text-slate-600 leading-relaxed">
          <h2 className="text-lg font-bold text-slate-900">How to Choose a {type} in {loc.city}</h2>
          <p>When choosing a {type.toLowerCase()} in {loc.city}, look for: verified credentials (AFSL or authorised representative status), transparent fee structure (fee-for-service is generally better for clients than commission-based), relevant specialties for your situation, and positive client reviews.</p>
          <p>All advisors listed on Invest.com.au have their credentials independently verified. We check AFSL status, ASIC registration, and professional memberships before listing any advisor.</p>
          <h3 className="text-base font-bold text-slate-900">How Much Does a {type} in {loc.city} Cost?</h3>
          <p>Financial advice fees in {loc.city} typically range from $2,500-$5,000 for an initial Statement of Advice (SOA), with ongoing fees of $2,000-$4,000 per year. Some advisors offer fixed-fee packages while others charge hourly ($200-$450/hour). Fee-for-service advisors don't receive commissions, which means their advice is less likely to be conflicted.</p>
        </div>

        {/* Cross-links to other locations */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Find Advisors in Other Cities</h3>
          <div className="flex flex-wrap gap-1.5">
            {LOCATIONS.filter(l => !l.slug.includes("-") && l.slug !== location).map(l => (
              <Link key={l.slug} href={`/find-advisor/${l.slug}`} className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                {l.city}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
