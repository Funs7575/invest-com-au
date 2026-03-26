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
  // ── Capital cities ────────────────────────────────────────────────────────
  { slug: "sydney", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Find verified financial advisors in Sydney. Compare fees, specialties, and read client reviews." },
  { slug: "melbourne", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne financial advisors compared. SMSF specialists, financial planners, and tax agents." },
  { slug: "brisbane", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane financial advisors and planners. Independent comparison with verified credentials." },
  { slug: "perth", city: "Perth", state: "Western Australia", stateCode: "WA", description: "Perth financial advisors compared. Find fee-for-service planners, SMSF accountants, and tax agents." },
  { slug: "adelaide", city: "Adelaide", state: "South Australia", stateCode: "SA", description: "Adelaide financial advisors and planners. Independent directory with verified AFSL credentials." },
  { slug: "canberra", city: "Canberra", state: "Australian Capital Territory", stateCode: "ACT", description: "Canberra financial advisors compared. Government and public sector super specialists." },
  { slug: "hobart", city: "Hobart", state: "Tasmania", stateCode: "TAS", description: "Hobart financial advisors and planners. Compare fees and specialties." },
  { slug: "darwin", city: "Darwin", state: "Northern Territory", stateCode: "NT", description: "Darwin financial advisors. Independent comparison and client reviews." },
  // ── Regional cities ───────────────────────────────────────────────────────
  { slug: "gold-coast", city: "Gold Coast", state: "Queensland", stateCode: "QLD", description: "Gold Coast financial advisors compared. Retirement planning, SMSF, and property specialists." },
  { slug: "newcastle", city: "Newcastle", state: "New South Wales", stateCode: "NSW", description: "Newcastle financial advisors and planners. Independent comparison with verified credentials." },
  { slug: "geelong", city: "Geelong", state: "Victoria", stateCode: "VIC", description: "Geelong financial advisors compared. SMSF, financial planning, and property specialists." },
  { slug: "sunshine-coast", city: "Sunshine Coast", state: "Queensland", stateCode: "QLD", description: "Sunshine Coast financial advisors. Find verified planners, SMSF accountants, and mortgage brokers." },
  { slug: "wollongong", city: "Wollongong", state: "New South Wales", stateCode: "NSW", description: "Wollongong financial advisors and planners. Local expertise and verified AFSL credentials." },
  { slug: "ballarat", city: "Ballarat", state: "Victoria", stateCode: "VIC", description: "Ballarat financial advisors. Compare local planners and SMSF specialists." },
  { slug: "bendigo", city: "Bendigo", state: "Victoria", stateCode: "VIC", description: "Bendigo financial advisors. Independent comparison for regional Victorian investors." },
  { slug: "townsville", city: "Townsville", state: "Queensland", stateCode: "QLD", description: "Townsville financial advisors. Find verified planners for North Queensland investors." },
  { slug: "cairns", city: "Cairns", state: "Queensland", stateCode: "QLD", description: "Cairns financial advisors. Compare local and regional Far North Queensland advisors." },
  { slug: "toowoomba", city: "Toowoomba", state: "Queensland", stateCode: "QLD", description: "Toowoomba financial advisors. Independent directory for Darling Downs investors." },
  { slug: "albury-wodonga", city: "Albury-Wodonga", state: "New South Wales", stateCode: "NSW", description: "Albury-Wodonga financial advisors. Border region specialists with NSW and VIC expertise." },
  { slug: "launceston", city: "Launceston", state: "Tasmania", stateCode: "TAS", description: "Launceston financial advisors. Find verified Tasmanian planners and SMSF specialists." },
  // ── SMSF specialists by city ──────────────────────────────────────────────
  { slug: "sydney-smsf", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "SMSF accountants and specialists in Sydney. Compare fees and qualifications." },
  { slug: "melbourne-smsf", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne SMSF specialists compared. Audit, setup, and ongoing management." },
  { slug: "brisbane-smsf", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane SMSF accountants compared. Setup, compliance, and annual audit specialists." },
  { slug: "perth-smsf", city: "Perth", state: "Western Australia", stateCode: "WA", description: "Perth SMSF specialists. Compare fees, qualifications, and client reviews." },
  { slug: "adelaide-smsf", city: "Adelaide", state: "South Australia", stateCode: "SA", description: "Adelaide SMSF accountants. Independent comparison for South Australian self-managed funds." },
  { slug: "gold-coast-smsf", city: "Gold Coast", state: "Queensland", stateCode: "QLD", description: "Gold Coast SMSF specialists. Compare SMSF accountants and advisors on the Gold Coast." },
  // ── Financial planners by city ────────────────────────────────────────────
  { slug: "sydney-financial-planner", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Fee-for-service financial planners in Sydney. Independent, verified advisors." },
  { slug: "melbourne-financial-planner", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne financial planners compared. Fee-only and fee-for-service options." },
  { slug: "brisbane-financial-planner", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane financial planners. Independent comparison with fee transparency." },
  { slug: "perth-financial-planner", city: "Perth", state: "Western Australia", stateCode: "WA", description: "Perth financial planners. Find fee-for-service advisors for retirement and wealth planning." },
  { slug: "adelaide-financial-planner", city: "Adelaide", state: "South Australia", stateCode: "SA", description: "Adelaide financial planners. Verified AFSL holders for retirement, wealth, and super planning." },
  { slug: "canberra-financial-planner", city: "Canberra", state: "Australian Capital Territory", stateCode: "ACT", description: "Canberra financial planners. Public sector super, government employee specialists." },
  { slug: "gold-coast-financial-planner", city: "Gold Coast", state: "Queensland", stateCode: "QLD", description: "Gold Coast financial planners. Retirement, SMSF, and estate planning specialists." },
  // ── Mortgage brokers by city ──────────────────────────────────────────────
  { slug: "sydney-mortgage-broker", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Compare Sydney mortgage brokers. Investment property loans, refinancing, and first home buyers." },
  { slug: "melbourne-mortgage-broker", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne mortgage brokers compared. Investment loans, refinancing, and home loan structuring." },
  { slug: "brisbane-mortgage-broker", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane mortgage brokers. Compare 30+ lenders for investment and owner-occupied loans." },
  { slug: "perth-mortgage-broker", city: "Perth", state: "Western Australia", stateCode: "WA", description: "Perth mortgage brokers compared. Investment property, first home buyer, and refinancing specialists." },
  { slug: "gold-coast-mortgage-broker", city: "Gold Coast", state: "Queensland", stateCode: "QLD", description: "Gold Coast mortgage brokers. Investment loan specialists for Queensland property." },
  // ── Buyers agents by city ─────────────────────────────────────────────────
  { slug: "sydney-buyers-agent", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Sydney buyers agents compared. Off-market access, investment property specialists, and auction bidding." },
  { slug: "melbourne-buyers-agent", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne buyers agents. Compare fees, off-market networks, and investment track records." },
  { slug: "brisbane-buyers-agent", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane buyers agents. Investment property specialists for Queensland and interstate buyers." },
  { slug: "perth-buyers-agent", city: "Perth", state: "Western Australia", stateCode: "WA", description: "Perth buyers agents compared. Off-market access and investment property specialists." },
  // ── Tax agents by city ────────────────────────────────────────────────────
  { slug: "sydney-tax-agent", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Sydney tax agents for investors. CGT specialists, crypto tax, and investment property deductions." },
  { slug: "melbourne-tax-agent", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne tax agents for investors. Capital gains tax, SMSF, and investment property specialists." },
  { slug: "brisbane-tax-agent", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane tax agents. Investment tax specialists for Queensland property and share investors." },
  // ── Property advisors by city ─────────────────────────────────────────────
  { slug: "sydney-property-advisor", city: "Sydney", state: "New South Wales", stateCode: "NSW", description: "Sydney property investment advisors. Fee-for-service property strategy and portfolio analysis." },
  { slug: "melbourne-property-advisor", city: "Melbourne", state: "Victoria", stateCode: "VIC", description: "Melbourne property investment advisors. Compare fee-for-service specialists." },
  { slug: "brisbane-property-advisor", city: "Brisbane", state: "Queensland", stateCode: "QLD", description: "Brisbane property advisors. Queensland investment property strategy and analysis." },
  // ── Inner-suburb SEO pages ────────────────────────────────────────────────
  { slug: "north-sydney", city: "North Sydney", state: "New South Wales", stateCode: "NSW", description: "North Sydney financial advisors. Lower North Shore specialists for wealth and investment planning." },
  { slug: "parramatta", city: "Parramatta", state: "New South Wales", stateCode: "NSW", description: "Parramatta financial advisors. Western Sydney specialists for investment and retirement planning." },
  { slug: "bondi", city: "Bondi", state: "New South Wales", stateCode: "NSW", description: "Bondi and Eastern Suburbs financial advisors. Compare Sydney east-side planners and SMSF specialists." },
  { slug: "st-kilda", city: "St Kilda", state: "Victoria", stateCode: "VIC", description: "St Kilda and inner Melbourne financial advisors. Compare fee-for-service planners." },
  { slug: "south-yarra", city: "South Yarra", state: "Victoria", stateCode: "VIC", description: "South Yarra financial advisors. Inner Melbourne wealth management and investment specialists." },
  { slug: "fortitude-valley", city: "Fortitude Valley", state: "Queensland", stateCode: "QLD", description: "Brisbane inner-city financial advisors. Find planners and SMSF specialists near Fortitude Valley." },
];

const SLUG_TYPE_MAP: Record<string, string> = {
  "smsf": "smsf_accountant",
  "financial-planner": "financial_planner",
  "mortgage-broker": "mortgage_broker",
  "buyers-agent": "buyers_agent",
  "tax-agent": "tax_agent",
  "property-advisor": "property_advisor",
};

const SLUG_TYPE_LABEL: Record<string, string> = {
  "smsf": "SMSF Specialist",
  "financial-planner": "Financial Planner",
  "mortgage-broker": "Mortgage Broker",
  "buyers-agent": "Buyers Agent",
  "tax-agent": "Tax Agent",
  "property-advisor": "Property Advisor",
};

function getLocationConfig(slug: string): LocationConfig | undefined {
  return LOCATIONS.find(l => l.slug === slug);
}

function getSpecialtyFromSlug(slug: string): { type: string | null; label: string } {
  for (const [key, dbType] of Object.entries(SLUG_TYPE_MAP)) {
    if (slug.endsWith(`-${key}`)) return { type: dbType, label: SLUG_TYPE_LABEL[key] };
  }
  return { type: null, label: "Financial Advisor" };
}

export async function generateStaticParams() {
  return LOCATIONS.map(l => ({ location: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ location: string }> }): Promise<Metadata> {
  const { location } = await params;
  const loc = getLocationConfig(location);
  if (!loc) return { title: "Financial Advisor" };

  const { label: type } = getSpecialtyFromSlug(location);

  return {
    title: `Best ${type}s in ${loc.city} (${CURRENT_YEAR}) — Find & Compare`,
    description: loc.description,
    alternates: { canonical: `${SITE_URL}/find-advisor/${location}` },
    openGraph: {
      title: `Best ${type}s in ${loc.city}`,
      description: loc.description,
      url: `${SITE_URL}/find-advisor/${location}`,
    },
  };
}

export default async function LocationAdvisorPage({ params }: { params: Promise<{ location: string }> }) {
  const { location } = await params;
  const loc = getLocationConfig(location);
  if (!loc) notFound();

  const { type: specialtyType, label: type } = getSpecialtyFromSlug(location);

  const supabase = await createClient();
  let query = supabase.from("professionals").select("*").eq("status", "active").eq("location_state", loc.stateCode);
  if (specialtyType) query = query.eq("type", specialtyType);
  const { data: advisors } = await query.order("rating", { ascending: false });
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
