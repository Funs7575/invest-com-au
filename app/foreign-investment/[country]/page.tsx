import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import SectionHeading from "@/components/SectionHeading";
import ForeignInvestmentNav from "../ForeignInvestmentNav";

export const revalidate = 86400;

// Only handle the 7 new countries — static pages exist for the other 5
const SLUG_TO_CODE: Record<string, string> = {
  "united-states": "US",
  japan: "JP",
  india: "IN",
  malaysia: "MY",
  "new-zealand": "NZ",
  "south-korea": "KR",
  "saudi-arabia": "SA",
};

export async function generateStaticParams() {
  return Object.keys(SLUG_TO_CODE).map((country) => ({ country }));
}

const VISA_DESCRIPTIONS: Record<string, { name: string; desc: string }> = {
  business_188: {
    name: "Business Innovation Visa (188A)",
    desc: "Invest AUD $800K+ in an Australian business. 2-year provisional, pathway to permanent residency (888).",
  },
  significant_investor: {
    name: "Significant Investor Visa (188C)",
    desc: "Invest AUD $5M in complying investments. Minimal residency requirements. Direct pathway to permanent residency.",
  },
  global_talent: {
    name: "Global Talent Visa (858)",
    desc: "For exceptional talent in tech, fintech, medtech, energy, and agri-food. No employer sponsorship required.",
  },
  e3_visa: {
    name: "E-3 Visa (US Citizens only)",
    desc: "US-specific work visa for specialty occupations. 2-year renewable. Must be offered a job in Australia.",
  },
  skilled_worker: {
    name: "Skilled Worker Visa (482 / 189 / 190)",
    desc: "Points-based skilled migration for qualified professionals. Employer-sponsored or state-nominated pathways.",
  },
  special_category_visa: {
    name: "Special Category Visa (NZ Citizens)",
    desc: "NZ citizens automatically receive a special category visa on arrival. Full work rights, simplified property purchase.",
  },
  student_visa: {
    name: "Student Visa (500)",
    desc: "Study in Australia with work rights (48 hrs/fortnight). Multiple graduate pathways to permanent residency.",
  },
};

const SECTOR_LINKS: Record<string, { name: string; href: string; icon: string }> = {
  property: { name: "Residential Property", href: "/property", icon: "🏠" },
  shares: { name: "Shares & ETFs", href: "/compare", icon: "📈" },
  mining: { name: "Mining & Resources", href: "/invest/mining", icon: "⛏️" },
  commercial_property: { name: "Commercial Property", href: "/invest/commercial-property", icon: "🏢" },
  agriculture: { name: "Farmland & Agriculture", href: "/invest/farmland", icon: "🌾" },
  farmland: { name: "Farmland & Agriculture", href: "/invest/farmland", icon: "🌾" },
  renewable_energy: { name: "Renewable Energy", href: "/invest/renewable-energy", icon: "⚡" },
  tech: { name: "Startups & Tech", href: "/invest/startups", icon: "🚀" },
  business: { name: "Buy a Business", href: "/invest/buy-business", icon: "🏭" },
  infrastructure: { name: "Commercial Property", href: "/invest/commercial-property", icon: "🏗️" },
  manufacturing: { name: "Commercial Property", href: "/invest/commercial-property", icon: "🏭" },
  crypto: { name: "Crypto", href: "/foreign-investment/crypto", icon: "₿" },
};

type CountryProfile = {
  id: number;
  country_code: string;
  country_name: string;
  flag_emoji: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  primary_investment_sectors: string[] | null;
  has_dta: boolean;
  dta_year: number | null;
  fta_partner: boolean;
  estimated_annual_fdi_aud_millions: number | null;
  popular_visa_pathways: string[] | null;
  recommended_advisor_types: string[] | null;
};

type WHTRate = {
  rate_type: string;
  rate_value: number | null;
  notes: string | null;
};

type Professional = {
  id: string;
  name: string;
  slug: string;
  firm_name: string | null;
  type: string;
  location_display: string | null;
  fee_description: string | null;
  rating: number | null;
};

async function getCountryProfile(countryCode: string): Promise<CountryProfile | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("country_investment_profiles")
      .select("*")
      .eq("country_code", countryCode)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

async function getWHTRates(countryCode: string): Promise<WHTRate[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("foreign_investment_rates")
      .select("rate_type, rate_value, notes")
      .eq("country_code", countryCode);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getAdvisors(types: string[]): Promise<Professional[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("professionals")
      .select("id, name, slug, firm_name, type, location_display, fee_description, rating")
      .eq("accepts_international", true)
      .eq("status", "active")
      .in("type", types)
      .order("rating", { ascending: false })
      .limit(4);
    return (data ?? []) as unknown as Professional[];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const countryCode = SLUG_TO_CODE[country];
  if (!countryCode) return { title: "Country Guide | Invest.com.au" };

  const profile = await getCountryProfile(countryCode);
  const name = profile?.country_name ?? country;
  const title = `Invest in Australia from ${name} — Complete Guide ${CURRENT_YEAR}`;
  const description =
    profile?.hero_subtitle ??
    `Complete guide for ${name} investors: FIRB rules, withholding tax rates, visa pathways, and specialist advisors for ${name} → Australia investment.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/foreign-investment/${country}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/foreign-investment/${country}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`Invest in Australia from ${name}`)}&sub=${encodeURIComponent(`DTA · FIRB · Visa Pathways · ${CURRENT_YEAR}`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

function formatFdi(millions: number | null): string {
  if (!millions) return "Growing";
  if (millions >= 1000) return `AUD $${(millions / 1000).toFixed(0)}B+`;
  return `AUD $${millions}M+`;
}

export default async function CountryInvestmentPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const countryCode = SLUG_TO_CODE[country];
  if (!countryCode) notFound();

  const [profile, whtRates] = await Promise.all([
    getCountryProfile(countryCode),
    getWHTRates(countryCode),
  ]);

  if (!profile) notFound();

  const advisors = await getAdvisors(profile.recommended_advisor_types ?? []);

  const dividendWHT = whtRates.find((r) => r.rate_type === "withholding_tax_dividends");
  const interestWHT = whtRates.find((r) => r.rate_type === "withholding_tax_interest");

  const isNZ = countryCode === "NZ";

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: profile.country_name },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <ForeignInvestmentNav current="" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-200">Foreign Investment</Link>
            <span>/</span>
            <span className="text-slate-300">{profile.country_name}</span>
          </nav>

          <div className="max-w-2xl">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {profile.flag_emoji && (
                <span className="text-2xl">{profile.flag_emoji}</span>
              )}
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {profile.country_name} Investors · Updated {CURRENT_YEAR}
              </span>
              {profile.has_dta && (
                <span className="px-2.5 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-bold text-green-300">
                  DTA Active {profile.dta_year && `(${profile.dta_year})`}
                </span>
              )}
              {profile.fta_partner && (
                <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-bold text-blue-300">
                  FTA Partner
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              {profile.hero_title ?? `Invest in Australia from ${profile.country_name}`}
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              {profile.hero_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Stats ────────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`bg-white rounded-2xl border p-5 ${profile.has_dta ? "border-green-200" : "border-amber-200"}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${profile.has_dta ? "text-green-800" : "text-amber-800"}`}>DTA Status</p>
              <p className={`text-xl font-black ${profile.has_dta ? "text-green-700" : "text-amber-700"}`}>
                {profile.has_dta ? "DTA Active" : "No DTA"}
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {profile.has_dta
                  ? `Australia–${profile.country_name} DTA in force${profile.dta_year ? ` since ${profile.dta_year}` : ""}`
                  : `Standard 30% WHT on unfranked dividends applies`}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide mb-1 text-slate-500">Dividend WHT</p>
              <p className="text-xl font-black text-slate-800">
                {dividendWHT?.rate_value != null
                  ? `${dividendWHT.rate_value}%`
                  : profile.has_dta ? "DTA Rate" : "30%"}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {dividendWHT?.notes ?? (profile.has_dta ? "Reduced under DTA — confirm with tax advisor" : "Unfranked dividends · 0% on fully franked")}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide mb-1 text-slate-500">Interest WHT</p>
              <p className="text-xl font-black text-slate-800">
                {interestWHT?.rate_value != null ? `${interestWHT.rate_value}%` : "10%"}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {interestWHT?.notes ?? "On Australian bank interest income"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide mb-1 text-slate-500">Annual FDI</p>
              <p className="text-xl font-black text-slate-800">
                {formatFdi(profile.estimated_annual_fdi_aud_millions)}
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {profile.country_name} → Australia investment flow
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── NZ Special Notice ───────────────────────────────────────── */}
      {isNZ && (
        <section className="py-6">
          <div className="container-custom">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <h2 className="text-sm font-extrabold text-green-900 mb-1">🇳🇿 Special Trans-Tasman Arrangements for NZ Citizens</h2>
              <p className="text-xs text-green-800 leading-relaxed">
                New Zealand citizens are automatically granted a Special Category Visa (SCV subclass 444) on arrival in Australia, giving full work and residency rights. NZ citizens are <strong>exempt from FIRB approval for established dwellings</strong> — the foreign buyer ban does not apply. NZ citizens can also access the same Medicare, banking, and investing services as Australian residents. Tax residency is determined separately by the ATO residency tests.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Popular Investment Sectors ───────────────────────────────── */}
      {(profile.primary_investment_sectors ?? []).length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-custom">
            <SectionHeading
              eyebrow="Popular sectors"
              title={`Where ${profile.country_name} investors focus`}
              sub="The most popular investment sectors for investors from this country, based on FDI flows and advisory demand."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(profile.primary_investment_sectors ?? []).map((sector) => {
                const info = SECTOR_LINKS[sector];
                if (!info) return null;
                return (
                  <Link
                    key={sector}
                    href={info.href}
                    className="group bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all p-4 flex items-start gap-3"
                  >
                    <span className="text-xl leading-none shrink-0">{info.icon}</span>
                    <div>
                      <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">{info.name}</p>
                      <p className="text-xs text-amber-600 mt-0.5 font-semibold">Full guide →</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Visa Pathways ───────────────────────────────────────────── */}
      {(profile.popular_visa_pathways ?? []).length > 0 && (
        <section className="py-12 md:py-16 bg-slate-50">
          <div className="container-custom">
            <SectionHeading
              eyebrow="Visa options"
              title={`Visa pathways for ${profile.country_name} investors`}
              sub="Investment and business visa options that can support your move to Australia. Always consult a registered migration agent for current eligibility."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(profile.popular_visa_pathways ?? []).map((visaCode) => {
                const info = VISA_DESCRIPTIONS[visaCode];
                if (!info) return null;
                return (
                  <div key={visaCode} className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="font-bold text-sm text-slate-900 mb-1.5">{info.name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{info.desc}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Visa conditions and requirements change frequently. Verify current requirements on the{" "}
              <Link href="https://immi.homeaffairs.gov.au" target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-slate-600">
                Department of Home Affairs website
              </Link>.
            </p>
          </div>
        </section>
      )}

      {/* ── FIRB Summary ────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <SectionHeading
                eyebrow="FIRB & property"
                title="Foreign Investment Review Board"
                sub={`What ${profile.country_name} investors need to know about FIRB approval in Australia.`}
              />
              <div className="space-y-4">
                {isNZ ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-green-900 mb-1">NZ Citizens: FIRB Exempt for Established Dwellings</p>
                    <p className="text-xs text-green-800 leading-relaxed">
                      New Zealand citizens are exempt from the foreign buyer ban on established dwellings. You still need FIRB approval for vacant land, certain commercial properties, and agricultural land over $15M.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-amber-900 mb-1">Foreign Buyer Ban (2025–2027)</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        From 1 April 2025 to 31 March 2027, foreign persons cannot purchase established (existing) dwellings in Australia. New dwellings, off-the-plan, and vacant land remain available with FIRB approval.
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-slate-900 mb-1">Key FIRB Thresholds</p>
                      <ul className="text-xs text-slate-600 space-y-1 leading-relaxed">
                        <li>• Residential (new): FIRB approval required regardless of value</li>
                        <li>• Commercial property: $268M general threshold{profile.fta_partner ? " (higher for FTA partners)" : ""}</li>
                        <li>• Agricultural land: $15M threshold</li>
                        <li>• Business acquisitions: $268M general threshold</li>
                      </ul>
                    </div>
                  </>
                )}
                <Link
                  href="/property/foreign-investment"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700"
                >
                  Full FIRB guide for property →
                </Link>
              </div>
            </div>

            <div>
              <SectionHeading
                eyebrow="Stamp duty"
                title="Foreign buyer stamp duty surcharges"
                sub="Additional stamp duty applies to foreign buyers of Australian property, on top of standard rates."
              />
              <div className="space-y-2">
                {[
                  { state: "NSW", surcharge: "8%" },
                  { state: "VIC", surcharge: "8%" },
                  { state: "QLD", surcharge: "7%" },
                  { state: "WA", surcharge: "7%" },
                  { state: "SA", surcharge: "7%" },
                  { state: "TAS", surcharge: "8%" },
                  { state: "ACT", surcharge: "0%" },
                  { state: "NT", surcharge: "0%" },
                ].map((row) => (
                  <div key={row.state} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm font-semibold text-slate-700">{row.state}</span>
                    <span className={`text-sm font-bold ${row.surcharge === "0%" ? "text-green-600" : "text-amber-700"}`}>
                      +{row.surcharge} surcharge
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">Surcharges on top of standard stamp duty. Rates may change — verify before purchase.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Find an Advisor ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Expert guidance"
            title={`Find an advisor for ${profile.country_name} → Australia investment`}
            sub="Connect with verified Australian advisors who specialise in cross-border investment from your country."
          />
          {advisors.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {advisors.map((a) => (
                <Link
                  key={a.id}
                  href={`/advisor/${a.slug}`}
                  className="group bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all p-4"
                >
                  <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 mb-0.5 transition-colors">{a.name}</p>
                  {a.firm_name && <p className="text-xs text-slate-500 mb-1">{a.firm_name}</p>}
                  <p className="text-[0.65rem] text-amber-700 font-semibold capitalize">{a.type.replace(/_/g, " ")}</p>
                  {a.location_display && <p className="text-[0.65rem] text-slate-400 mt-0.5">{a.location_display}</p>}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-6">Browse advisors who accept international clients.</p>
          )}
          <Link
            href="/find-advisor"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            Get matched with a specialist advisor →
          </Link>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mb-2">
                Ready to invest in Australia from {profile.country_name}?
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Connect with advisors who specialise in {profile.country_name} → Australia cross-border investment. Get matched free — no obligation.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/quiz"
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm text-center transition-colors shadow-lg"
              >
                Start Free Advisor Match
              </Link>
              <Link
                href="/foreign-investment"
                className="px-6 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm text-center transition-colors"
              >
                All Investment Guides
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
