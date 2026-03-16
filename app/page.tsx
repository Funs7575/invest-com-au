import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Article } from "@/lib/types";
import HomepageComparisonTable from "@/components/HomepageComparisonTable";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LeadMagnet from "@/components/LeadMagnet";
import DealCard from "@/components/DealCard";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import { AFFILIATE_REL } from "@/lib/tracking";
import HomepageServiceSelector from "@/components/HomepageServiceSelector";
import AdvisorDirectory from "@/components/AdvisorDirectory";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import { ORGANIZATION_JSONLD, SITE_URL } from "@/lib/seo";

export const metadata = {
  title: "Find Mortgage Brokers, Buyer's Agents & Financial Advisors — Invest.com.au",
  description:
    "Find verified mortgage brokers, buyer's agents, and financial advisors — or compare Australian investing platforms. Independent directory with ASIC-verified professionals. Free, no obligation.",
  openGraph: {
    title: "Find Verified Advisors & Compare Platforms — Invest.com.au",
    description: "Find verified mortgage brokers, buyer's agents, and financial advisors — or compare Australian investing platforms. ASIC-verified, independent, free.",
    url: "/",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Find Verified Advisors & Compare Platforms — Invest.com.au",
    description: "Find verified mortgage brokers, buyer's agents, and financial advisors — or compare Australian investing platforms. ASIC-verified, independent, free.",
  },
  alternates: { canonical: "/" },
};

const bestForCards = [
  { icon: "sprout", title: "Best for Beginners", description: "Low fees, simple platforms, educational resources", href: "/best/beginners", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "globe", title: "Best for US Shares", description: "Low FX fees and $0 US brokerage compared", href: "/best/us-shares", color: "bg-slate-50 border-slate-200 text-slate-800" },
  { icon: "cpu", title: "Best Robo-Advisors", description: "Automated investing with Stockspot, Raiz & more", href: "/best/robo-advisors", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "building", title: "Compare Super Funds", description: "Compare fees, performance & insurance across funds", href: "/compare/super", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  { icon: "coins", title: "Lowest Fees", description: "$0 brokerage and verified low-cost options", href: "/best/low-fees", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "bitcoin", title: "Best Crypto Exchanges", description: "AUSTRAC-registered exchanges with AUD deposits", href: "/best/crypto", color: "bg-orange-50 border-orange-200 text-orange-800" },
];

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createClient();

  const BROKER_LISTING_COLUMNS = "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, status, cpa_value, promoted_placement, affiliate_priority";

  const [{ data: brokers }, { data: articles }, { count: advisorCount }, { data: featuredAdvisors }] = await Promise.all([
    supabase
      .from("brokers")
      .select(BROKER_LISTING_COLUMNS)
      .eq("status", "active")
      .order("promoted_placement", { ascending: false })
      .order("rating", { ascending: false }),
    supabase
      .from("articles")
      .select("id, title, slug, excerpt, category, read_time, tags, cover_image_url")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("professionals")
      .select("slug, name, firm_name, type, location_display, location_state, rating, review_count, photo_url, fee_description, specialties, verified")
      .eq("status", "active")
      .eq("verified", true)
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(18),
  ]);

  const dealBrokers = ((brokers as Broker[]) || []).filter((b) => b.deal).slice(0, 3);
  const brokerCount = brokers?.length || 0;

  const mostRecentUpdate = (brokers as Broker[])?.reduce((latest: string, b: Broker) => {
    const ts = b.updated_at || b.fee_last_checked;
    return ts && ts > latest ? ts : latest;
  }, "") || "";
  const updatedDateStr = mostRecentUpdate
    ? new Date(mostRecentUpdate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {/* JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            ...ORGANIZATION_JSONLD,
            description: "Australia's independent investing hub. Compare platforms and find verified financial advisors — shares, crypto, super, robo-advisors, property & more.",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "What is the best investing platform for beginners in Australia?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "The best beginner platform depends on your goals, but platforms with low fees, simple interfaces, and educational resources — such as Stake, CommSec, and Superhero — consistently rank highest for new investors.",
                },
              },
              {
                "@type": "Question",
                name: "Which Australian investing platform has the lowest fees?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Several brokers now offer $0 brokerage on ASX trades, including Stake and Superhero. For US shares, Stake and Moomoo offer $0 USD brokerage. Compare all fee structures at invest.com.au/compare.",
                },
              },
              {
                "@type": "Question",
                name: "How do I choose a mortgage broker in Australia?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Look for an ASIC-registered mortgage broker who offers access to multiple lenders, transparent fee disclosure, and specialises in your situation (first home buyer, investor, self-employed). Use our free matching service at invest.com.au/find-advisor.",
                },
              },
              {
                "@type": "Question",
                name: "How do I choose between Australian investing platforms?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Compare platforms based on fees, FX rates, available markets, CHESS sponsorship, and features. Use our free 60-second quiz at ${SITE_URL}/quiz to get a personalised recommendation.`,
                },
              },
            ],
          }),
        }}
      />

      {/* ═══════ 1. HERO ═══════ */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden">
        <div className="container-custom py-12 md:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto text-center">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-800 mb-6 md:mb-8">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              {brokerCount}+ platforms &middot; {(advisorCount || 0) > 0 ? `${advisorCount}` : "Verified"} advisors &middot; Updated {updatedDateStr}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-5 md:mb-6 tracking-tight">
              Australia&apos;s financial hub,{" "}
              <span className="text-amber-500">all in one place.</span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-slate-500 mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto">
              Match with verified mortgage brokers, buyer&apos;s agents, and financial advisors — or compare investing platforms side-by-side. Independent, free, no obligation.
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 md:mb-10">
              <Link
                href="/find-advisor"
                className="w-full sm:w-auto px-7 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all text-sm"
              >
                Find My Advisor — Free &rarr;
              </Link>
              <Link
                href="/compare"
                className="w-full sm:w-auto px-7 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
              >
                Compare Platforms
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex items-center justify-center flex-wrap gap-x-7 gap-y-2.5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Icon name="shield-check" size={14} className="text-emerald-500" />
                ASIC-verified professionals
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check-circle" size={14} className="text-emerald-500" />
                100% independent
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check-circle" size={14} className="text-amber-500" />
                No cost, no commitment
              </span>
            </div>
          </div>

          {/* Social proof strip */}
          <div className="mt-12 md:mt-16 border-t border-slate-100 pt-8 md:pt-10">
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-center">
              <div>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{brokerCount}+</p>
                <p className="text-xs text-slate-500 mt-1">Platforms rated</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{(advisorCount || 0) > 0 ? `${advisorCount}+` : "100+"}</p>
                <p className="text-xs text-slate-500 mt-1">Verified advisors</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900">Free</p>
                <p className="text-xs text-slate-500 mt-1">Always free to use</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 2. WHAT DO YOU NEED HELP WITH? ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-16 bg-slate-50 border-b border-slate-100">
          <div className="container-custom">
            <HomepageServiceSelector />
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 3. TOP PLATFORMS ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-16 bg-white">
          <div className="container-custom">
            <div className="flex items-center justify-between gap-2 mb-6 md:mb-10">
              <div>
                <h2 className="text-xl md:text-3xl font-extrabold text-slate-900">Top Rated Platforms</h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="hidden md:inline">Ranked by fees, features, and user experience &middot;</span>
                  <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="inline" />
                </p>
              </div>
              <Link href="/compare" className="md:hidden text-xs font-semibold text-slate-500 hover:text-slate-900 shrink-0 inline-flex items-center px-1">
                View all &rarr;
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
            </div>
            <div className="hidden sm:block text-center mt-8 md:mt-10">
              <Link
                href="/compare"
                className="inline-block px-6 md:px-8 py-3 md:py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 hover:shadow-md transition-all text-sm"
              >
                View All {brokerCount}+ Platforms &rarr;
              </Link>
              <p className="text-xs text-slate-400 mt-3">
                Not sure which platform suits you?{" "}
                <Link href="/quiz" className="text-amber-600 font-semibold hover:text-amber-700">Take the 60-second quiz</Link> or{" "}
                <Link href="/find-advisor" className="text-amber-600 font-semibold hover:text-amber-700">talk to a financial advisor</Link> — free.
              </p>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 4. ADVISOR DIRECTORY ═══════ */}
      <AdvisorDirectory
        advisors={(featuredAdvisors as { slug: string; name: string; firm_name?: string; type: string; location_display?: string; location_state?: string; rating: number; review_count: number; photo_url?: string; specialties: string[]; verified?: boolean }[]) || []}
      />

      {/* ═══════ 5. ACTIVE DEALS ═══════ */}
      {(dealBrokers as Broker[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-10 md:py-16 bg-gradient-to-b from-amber-50/60 to-white border-y border-amber-100">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-6 md:mb-8">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold">Current Platform Deals</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">Verified promotions from Australian trading platforms</p>
                </div>
                <Link href="/deals" className="text-xs md:text-sm font-semibold text-amber-600 hover:text-amber-700 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View All &rarr;
                </Link>
              </div>
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dealBrokers as Broker[]).map((broker) => (
                  <DealCard key={broker.id} broker={broker} />
                ))}
              </div>
              <div className="md:hidden space-y-2">
                {(dealBrokers as Broker[]).map((broker) => {
                  const expiryDate = broker.deal_expiry ? new Date(broker.deal_expiry) : null;
                  const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000)) : null;
                  const isUrgent = daysLeft !== null && daysLeft <= 7;
                  const affiliateLink = `/go/${broker.slug}`;
                  return (
                    <div key={broker.id} className="border border-slate-200 rounded-xl p-3 bg-white">
                      <div className="flex items-center gap-2 mb-2">
                        <BrokerLogo broker={broker} size="sm" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-sm text-slate-900 truncate block">{broker.name}</span>
                          <span className="text-[0.6rem] text-slate-400">{broker.rating}/5</span>
                        </div>
                        <a href={affiliateLink} target="_blank" rel={AFFILIATE_REL} className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg active:scale-[0.98] transition-all">
                          Claim &rarr;
                        </a>
                      </div>
                      <div className="bg-amber-50 rounded-lg px-2.5 py-2 flex items-start gap-1.5">
                        <Icon name="flame" size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 font-medium leading-snug line-clamp-2 flex-1">{broker.deal_text}</p>
                        {isUrgent && daysLeft !== null && (
                          <span className="shrink-0 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse whitespace-nowrap">
                            {daysLeft}d left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 md:mt-4">
                <CompactDisclaimerLine />
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ═══════ 6. EOFY SEASONAL (March–July) ═══════ */}
      {(() => {
        const month = new Date().getMonth();
        if (month < 2 || month > 6) return null;
        return (
          <ScrollFadeIn>
            <section className="py-10 md:py-16 bg-gradient-to-r from-amber-50 to-orange-50 border-y border-amber-200/50">
              <div className="container-custom">
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                  <div className="w-10 h-10 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center shrink-0">
                    <Icon name="calendar" size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-slate-900">EOFY Tax Planning</h2>
                    <p className="text-xs md:text-sm text-amber-700 font-medium">End-of-financial-year deadline approaching</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3 md:gap-4">
                  {[
                    { href: "/advisors/tax-agents", icon: "calculator", title: "Find a Tax Agent", desc: "Expert tax planning, deductions, and lodgement." },
                    { href: "/advisors/smsf-accountants", icon: "briefcase", title: "SMSF End-of-Year", desc: "SMSF audit, compliance, and year-end reporting." },
                    { href: "/advisors/financial-planners", icon: "trending-up", title: "Pre-EOFY Strategy", desc: "Salary sacrifice, contribution caps, and structuring." },
                  ].map((card) => (
                    <Link key={card.href} href={card.href} className="group bg-white border border-amber-200 rounded-xl p-4 md:p-5 hover:shadow-md hover:border-amber-300 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name={card.icon} size={18} className="text-amber-600" />
                        <h3 className="font-bold text-sm md:text-base text-slate-900">{card.title}</h3>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-600 group-hover:text-amber-700">
                        Browse experts <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </ScrollFadeIn>
        );
      })()}

      {/* ═══════ 7. ARTICLES & GUIDES ═══════ */}
      {(articles as Article[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-10 md:py-16 bg-slate-50">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-6 md:mb-10">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">Learn &amp; Get Expert Help</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">Guides, how-tos, and professional advice for smarter investing</p>
                </div>
                <Link href="/articles" className="text-xs md:text-sm font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View all &rarr;
                </Link>
              </div>
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(articles as Article[]).slice(0, 6).map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="border border-slate-200 bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group flex flex-col"
                  >
                    {article.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                        <Image src={article.cover_image_url} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" loading="lazy" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {article.category && (
                        <span className="inline-block self-start text-[0.65rem] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full mb-3">
                          {article.category}
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 group-hover:text-slate-600 transition-colors mb-2 leading-snug">{article.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3 flex-1">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {article.read_time && <span>{article.read_time} min read</span>}
                        <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform">Read Guide &rarr;</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Mobile articles */}
              <div className="md:hidden">
                {(articles as Article[])[0] && (
                  <Link href={`/article/${(articles as Article[])[0].slug}`} className="block mb-3 rounded-xl overflow-hidden border border-slate-200 group">
                    {(articles as Article[])[0].cover_image_url && (
                      <div className="aspect-[2/1] overflow-hidden bg-slate-100 relative">
                        <Image src={(articles as Article[])[0].cover_image_url!} alt={(articles as Article[])[0].title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="100vw" loading="lazy" />
                      </div>
                    )}
                    <div className="p-3 bg-white">
                      {(articles as Article[])[0].category && (
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">{(articles as Article[])[0].category}</span>
                      )}
                      <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 mt-0.5">{(articles as Article[])[0].title}</h3>
                    </div>
                  </Link>
                )}
                <div className="divide-y divide-slate-100">
                  {(articles as Article[]).slice(1, 5).map((article) => (
                    <Link key={article.id} href={`/article/${article.slug}`} className="flex items-start gap-3 py-3 group">
                      <div className="flex-1 min-w-0">
                        {article.category && <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">{article.category}</span>}
                        <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-slate-600 transition-colors">{article.title}</h3>
                      </div>
                      <div className="text-[0.62rem] text-slate-400 shrink-0 mt-1">{article.read_time && <span>{article.read_time} min</span>}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ═══════ 8. TOOLS & CALCULATORS ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-16 bg-white">
          <div className="container-custom">
            <p className="text-[0.65rem] md:text-xs text-amber-600 text-center uppercase tracking-widest font-bold mb-2">Free tools</p>
            <h2 className="text-xl md:text-2xl font-bold text-center text-slate-900 mb-6 md:mb-10">Investing Tools &amp; Calculators</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {[
                { href: "/portfolio-calculator", icon: "calculator", color: "from-amber-500 to-amber-400", shadow: "shadow-amber-500/20", title: "Portfolio Calculator", desc: "See exact fees at every platform" },
                { href: "/switching-calculator", icon: "arrow-right-left", color: "from-emerald-600 to-emerald-500", shadow: "shadow-emerald-500/15", title: "Switching Calculator", desc: "How much are you overpaying?" },
                { href: "/savings-calculator", icon: "piggy-bank", color: "from-slate-700 to-slate-600", shadow: "shadow-slate-500/15", title: "Savings Calculator", desc: "Are you earning enough?" },
                { href: "/compare", icon: "bar-chart", color: "from-amber-600 to-amber-500", shadow: "shadow-amber-500/20", title: "Compare Platforms", desc: "Side-by-side comparison" },
                { href: "/calculators", icon: "bar-chart", color: "from-slate-700 to-slate-600", shadow: "shadow-slate-500/15", title: "All Calculators", desc: "CGT, FX, dividends & more" },
                { href: "/best", icon: "shield-check", color: "from-emerald-600 to-emerald-500", shadow: "shadow-emerald-500/15", title: "Best Platforms", desc: "Top picks by category" },
                { href: "/quiz", icon: "target", color: "from-amber-500 to-amber-400", shadow: "shadow-amber-500/20", title: "Platform Quiz", desc: "Best match in 60 seconds" },
                { href: "/find-advisor", icon: "users", color: "from-slate-800 to-slate-700", shadow: "shadow-slate-500/15", title: "Find Advisor", desc: "Matched to your needs" },
              ].map((tool) => (
                <Link key={tool.href} href={tool.href} className="bg-white border border-slate-200 rounded-xl p-3 md:p-5 hover:shadow-md hover:border-slate-300 transition-all group">
                  <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center mb-2 md:mb-3 shadow-md ${tool.shadow}`}>
                    <Icon name={tool.icon} size={18} className="text-white" />
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-0.5 group-hover:text-slate-700">{tool.title}</h3>
                  <p className="text-[0.65rem] md:text-xs text-slate-500">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 9. BEST PLATFORMS BY CATEGORY ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-16 bg-slate-50 border-y border-slate-100">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-6 md:mb-10">
              <div>
                <h2 className="text-xl md:text-3xl font-bold text-slate-900">Best Platforms by Category</h2>
                <p className="text-xs md:text-base text-slate-500 mt-1">Curated picks ranked by fees, features, and user experience</p>
              </div>
              <Link href="/best" className="md:hidden text-xs font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                View all &rarr;
              </Link>
            </div>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {bestForCards.map((card) => (
                <Link key={card.title} href={card.href} className={`border rounded-2xl p-4 md:p-5 hover:shadow-md transition-all ${card.color}`}>
                  <Icon name={card.icon} size={24} className="mb-2.5 opacity-80" />
                  <h3 className="font-bold mb-1">{card.title}</h3>
                  <p className="text-sm opacity-80">{card.description}</p>
                </Link>
              ))}
            </div>
            <div className="sm:hidden -mx-4 px-4">
              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                {bestForCards.map((card) => (
                  <Link key={card.title} href={card.href} className={`border rounded-xl p-3 flex-none w-[42vw] snap-start ${card.color}`}>
                    <Icon name={card.icon} size={20} className="opacity-70 mb-1.5" />
                    <h3 className="font-bold text-xs leading-tight mb-0.5">{card.title}</h3>
                    <p className="text-[0.65rem] opacity-60 leading-snug line-clamp-2">{card.description}</p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="hidden md:block text-center mt-6">
              <Link href="/best" className="inline-flex items-center gap-1 min-h-[44px] px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-all">
                Browse All Categories &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 10. TOP REVIEWED PLATFORMS ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-16 bg-white">
          <div className="container-custom">
            <h2 className="text-lg md:text-2xl font-bold text-slate-900 mb-5 md:mb-8">Top Reviewed Platforms</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {(brokers as Broker[])?.filter(b => b.rating && b.rating >= 4.0).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8).map(b => (
                <Link key={b.slug} href={`/broker/${b.slug}`} className="flex items-center gap-2.5 p-2.5 md:p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-sm transition-all group">
                  <BrokerLogo broker={b} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-bold text-slate-900 group-hover:text-amber-700 truncate">{b.name}</p>
                    <p className="text-[0.62rem] text-slate-400">{b.rating}/5 &middot; Read Review</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 11. EMAIL CAPTURE ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-16 bg-slate-50 border-t border-slate-100">
          <div className="container-custom">
            <div className="max-w-xl mx-auto">
              <LeadMagnet />
            </div>
          </div>
        </section>
      </ScrollFadeIn>
    </div>
  );
}
