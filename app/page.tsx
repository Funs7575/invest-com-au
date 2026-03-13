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
import HeroLeadCapture from "@/components/HeroLeadCapture";
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
  { icon: "cpu", title: "Best Robo-Advisors", description: "Automated investing with Stockspot, Raiz & more", href: "/best/robo-advisors", color: "bg-violet-50 border-violet-200 text-violet-800" },
  { icon: "building", title: "Best Super Funds", description: "Compare fees, performance & insurance across funds", href: "/best/super-funds", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  { icon: "coins", title: "Lowest Fees", description: "$0 brokerage and verified low-cost options", href: "/best/low-fees", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "bitcoin", title: "Best Crypto Exchanges", description: "AUSTRAC-registered exchanges with AUD deposits", href: "/best/crypto", color: "bg-orange-50 border-orange-200 text-orange-800" },
];

export const revalidate = 3600; // ISR: revalidate every hour

export default async function HomePage() {
  const supabase = await createClient();

  const BROKER_LISTING_COLUMNS = "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, status";

  const [{ data: brokers }, { data: articles }, { count: advisorCount }, { data: featuredAdvisors }] = await Promise.all([
    supabase
      .from("brokers")
      .select(BROKER_LISTING_COLUMNS)
      .eq("status", "active")
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

      {/* ═══════ 1. HERO — Split Layout ═══════ */}
      <section className="relative bg-white border-b border-slate-100 py-6 md:py-14 overflow-hidden">
        <div className="relative container-custom">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column */}
            <div className="lg:col-span-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600 mb-5 border border-slate-200">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                {brokerCount} platforms + {(advisorCount || 0) > 0 ? `${advisorCount} advisors` : "verified advisors"} &middot; Updated {updatedDateStr}
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-4 md:mb-5">
                Expert advice,{" "}
                <br className="hidden lg:block" />
                <span className="text-amber-500">verified by us.</span>
              </h1>

              <p className="text-base md:text-lg text-slate-500 mb-6 md:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Match instantly with Australia&apos;s verified mortgage brokers, buyer&apos;s agents, and financial planners — or compare investing platforms side-by-side.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6">
                <Link
                  href="/find-advisor"
                  className="px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-sm hover:shadow-md transition-all text-sm"
                >
                  Find Your Best Path &rarr;
                </Link>
                <Link
                  href="/compare"
                  className="px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all text-sm"
                >
                  Compare Platforms
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Icon name="shield-check" size={14} className="text-emerald-500" />
                  ASIC-verified
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="check-circle" size={14} className="text-emerald-500" />
                  Independent
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="check-circle" size={14} className="text-amber-500" />
                  100% free
                </span>
              </div>
            </div>

            {/* Right Column: Lead Capture Widget */}
            <div className="lg:col-span-7">
              <HeroLeadCapture />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 2. ADVISOR DIRECTORY — Tabbed ═══════ */}
      <AdvisorDirectory
        advisors={(featuredAdvisors as { slug: string; name: string; firm_name?: string; type: string; location_display?: string; location_state?: string; rating: number; review_count: number; photo_url?: string; specialties: string[]; verified?: boolean }[]) || []}
      />

      {/* ═══════ 3. HIGH-VALUE VERTICALS ═══════ */}
      <ScrollFadeIn>
        <section className="py-3 md:py-10 bg-white">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <Link href="/advisors/mortgage-brokers" className="group bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-xl p-4 md:p-5 hover:shadow-md hover:border-rose-300 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                    <Icon name="landmark" size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-slate-900">Find a Mortgage Broker</h3>
                    <p className="text-[0.65rem] md:text-xs text-slate-500">Free service — brokers are paid by lenders</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Compare rates from 30+ lenders. Our brokers help with home loans, refinancing, investment loans, and first home buyer grants.</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-rose-600 group-hover:text-rose-700">
                  Browse mortgage brokers <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </span>
              </Link>

              <Link href="/advisors/buyers-agents" className="group bg-gradient-to-br from-teal-50 to-white border border-teal-200 rounded-xl p-4 md:p-5 hover:shadow-md hover:border-teal-300 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    <Icon name="search" size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-slate-900">Find a Buyer&apos;s Agent</h3>
                    <p className="text-[0.65rem] md:text-xs text-slate-500">Expert negotiation &amp; off-market access</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Independent buyer&apos;s advocates who work for you — not the seller. Property search, auction bidding, and due diligence.</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-teal-600 group-hover:text-teal-700">
                  Browse buyer&apos;s agents <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </span>
              </Link>

              <Link href="/advisors/insurance-brokers" className="group bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-xl p-4 md:p-5 hover:shadow-md hover:border-sky-300 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                    <Icon name="shield" size={20} className="text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-slate-900">Find an Insurance Broker</h3>
                    <p className="text-[0.65rem] md:text-xs text-slate-500">Life, income protection &amp; business cover</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">Compare policies from 10+ insurers. Is your super insurance enough? Our brokers find the gaps and fix them — free.</p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-sky-600 group-hover:text-sky-700">
                  Browse insurance brokers <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                </span>
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 4. EOFY SEASONAL BLOCK (March–July) ═══════ */}
      {(() => {
        const month = new Date().getMonth();
        const isEofySeason = month >= 2 && month <= 6;
        if (!isEofySeason) return null;
        return (
          <ScrollFadeIn>
            <section className="py-4 md:py-10 bg-gradient-to-r from-amber-50 to-orange-50 border-y border-amber-200/50">
              <div className="container-custom">
                <div className="flex items-center gap-3 mb-3 md:mb-6">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                    <Icon name="calendar" size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-slate-900">EOFY Tax Planning</h2>
                    <p className="text-[0.69rem] md:text-sm text-amber-700 font-medium">End-of-financial-year deadline approaching</p>
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

      {/* ═══════ 5. COMPARISON TABLE ═══════ */}
      <ScrollFadeIn>
        <section className="py-2.5 sm:py-8 md:py-16 bg-slate-50">
          <div className="container-custom">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-5 md:mb-8">
              <div>
                <h2 className="text-base md:text-3xl font-extrabold text-slate-900">Top Rated Platforms</h2>
                <p className="text-[0.62rem] md:text-sm text-slate-400 mt-0.5 md:mt-1 flex items-center gap-1.5">
                  <span className="hidden md:inline">Ranked by fees, features, and user experience<span className="mx-2 text-slate-300">&middot;</span></span>
                  <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="inline" />
                </p>
              </div>
              <Link href="/compare" className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 inline-flex items-center px-1">
                View all &rarr;
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
            </div>
            <div className="hidden sm:block text-center mt-5 md:mt-8">
              <Link
                href="/compare"
                className="inline-block px-5 md:px-7 py-3 md:py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 hover:shadow-lg transition-all text-sm"
              >
                View All {brokerCount}+ Platforms &rarr;
              </Link>
              <p className="text-xs text-slate-400 mt-3">
                Not sure which platform is right for you?{" "}
                <Link href="/find-advisor" className="text-violet-600 font-semibold hover:text-violet-700">Talk to a financial advisor</Link> or{" "}
                <Link href="/advisors/mortgage-brokers" className="text-rose-600 font-semibold hover:text-rose-700">find a mortgage broker</Link> — free, no obligation.
              </p>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 6. ACTIVE DEALS ═══════ */}
      {(dealBrokers as Broker[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-3 md:py-12 bg-gradient-to-b from-amber-50/50 to-white">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold">Current Platform Deals</h2>
                  <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5 md:mt-1">
                    <span className="hidden md:inline">Verified promotions from Australian trading platforms</span>
                    <span className="md:hidden">Verified promotions</span>
                  </p>
                </div>
                <Link href="/deals" className="text-[0.69rem] md:text-sm font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View All Deals &rarr;
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
                    <div key={broker.id} className="border border-slate-200 rounded-lg p-2.5 bg-white">
                      <div className="flex items-center gap-2 mb-1.5">
                        <BrokerLogo broker={broker} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-slate-900 truncate">{broker.name}</span>
                            <span className="text-[0.6rem] text-slate-400">{broker.rating}/5</span>
                          </div>
                        </div>
                        <a href={affiliateLink} target="_blank" rel={AFFILIATE_REL} className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-[0.7rem] font-bold rounded-md active:scale-[0.98] transition-all">
                          Claim &rarr;
                        </a>
                      </div>
                      <div className="bg-amber-50/80 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                        <Icon name="flame" size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[0.72rem] text-slate-700 font-medium leading-snug line-clamp-2 flex-1">{broker.deal_text}</p>
                        {isUrgent && daysLeft !== null && (
                          <span className="shrink-0 text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse whitespace-nowrap">
                            {daysLeft}d left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 md:mt-4">
                <CompactDisclaimerLine />
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ═══════ 7. BEST PLATFORMS BY CATEGORY ═══════ */}
      <ScrollFadeIn>
        <section className="py-2 md:py-8 bg-slate-50">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-2 md:mb-8">
              <div>
                <h2 className="text-lg md:text-3xl font-bold">Best Platforms by Category</h2>
                <p className="text-[0.69rem] md:text-base text-slate-500 mt-0.5 md:mt-2">
                  <span className="hidden md:inline">Curated picks ranked by fees, features, and user experience</span>
                  <span className="md:hidden">Top picks by category</span>
                </p>
              </div>
              <Link href="/best" className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                View all &rarr;
              </Link>
            </div>
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {bestForCards.map((card) => (
                <Link key={card.title} href={card.href} className={`border rounded-xl p-4 md:p-5 hover:shadow-md transition-all ${card.color}`}>
                  <Icon name={card.icon} size={24} className="mb-2 opacity-80" />
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
              <Link href="/best" className="inline-flex items-center min-h-[44px] px-4 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                Browse All Categories &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 8. TOP REVIEWED PLATFORMS ═══════ */}
      <ScrollFadeIn>
        <section className="py-3 md:py-10 bg-white">
          <div className="container-custom">
            <h2 className="text-lg md:text-2xl font-bold mb-2 md:mb-4">Top Reviewed Platforms</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {(brokers as Broker[])?.filter(b => b.rating && b.rating >= 4.0).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8).map(b => (
                <Link key={b.slug} href={`/broker/${b.slug}`} className="flex items-center gap-2 p-2.5 md:p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all group">
                  <BrokerLogo broker={b} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-bold text-slate-900 group-hover:text-blue-600 truncate">{b.name}</p>
                    <p className="text-[0.62rem] text-slate-400">{b.rating}/5 &middot; Read Review</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 9. ARTICLES & GUIDES ═══════ */}
      {(articles as Article[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-3 md:py-12 bg-white">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold">Learn &amp; Get Expert Help</h2>
                  <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5 md:mt-1">Guides, how-tos, and professional advice for smarter investing</p>
                </div>
                <Link href="/articles" className="text-[0.69rem] md:text-sm font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View all &rarr;
                </Link>
              </div>
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(articles as Article[]).slice(0, 6).map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group flex flex-col"
                  >
                    {article.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                        <Image src={article.cover_image_url} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" loading="lazy" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {article.category && (
                        <span className="inline-block self-start text-[0.69rem] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full mb-3">
                          {article.category}
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 group-hover:text-slate-600 transition-colors mb-2 leading-snug">{article.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3 flex-1">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {article.read_time && <span>{article.read_time} min read</span>}
                        <span className="text-slate-900 font-semibold group-hover:translate-x-0.5 transition-transform">Read Guide &rarr;</span>
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
                    <div className="p-3">
                      {(articles as Article[])[0].category && (
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">{(articles as Article[])[0].category}</span>
                      )}
                      <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 mt-0.5">{(articles as Article[])[0].title}</h3>
                    </div>
                  </Link>
                )}
                <div className="divide-y divide-slate-100">
                  {(articles as Article[]).slice(1, 5).map((article) => (
                    <Link key={article.id} href={`/article/${article.slug}`} className="flex items-start gap-3 py-2.5 group">
                      <div className="flex-1 min-w-0">
                        {article.category && <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">{article.category}</span>}
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

      {/* ═══════ 10. CROSS-SELLING JOURNEY ═══════ */}
      <ScrollFadeIn>
        <section className="py-3 md:py-10 bg-slate-50">
          <div className="container-custom">
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
              <h2 className="text-base md:text-xl font-bold text-slate-900 mb-1">Your financial journey doesn&apos;t stop at one step</h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">Most property buyers need multiple professionals. Here&apos;s the typical path:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {[
                  { step: "1", label: "Mortgage Broker", desc: "Secure your home loan", href: "/advisors/mortgage-brokers", color: "bg-rose-50 border-rose-200 text-rose-700" },
                  { step: "2", label: "Buyer's Agent", desc: "Find the right property", href: "/advisors/buyers-agents", color: "bg-teal-50 border-teal-200 text-teal-700" },
                  { step: "3", label: "Insurance Broker", desc: "Protect your investment", href: "/advisors/insurance-brokers", color: "bg-sky-50 border-sky-200 text-sky-700" },
                  { step: "4", label: "Tax Agent", desc: "Structure for efficiency", href: "/advisors/tax-agents", color: "bg-amber-50 border-amber-200 text-amber-700" },
                ].map((item) => (
                  <Link key={item.step} href={item.href} className={`relative border rounded-xl p-3 md:p-4 ${item.color} hover:shadow-md transition-all group`}>
                    <span className="absolute -top-2 -left-2 w-6 h-6 bg-slate-900 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center shadow-sm">{item.step}</span>
                    <p className="font-bold text-xs md:text-sm mt-1">{item.label}</p>
                    <p className="text-[0.65rem] md:text-xs opacity-80 mt-0.5">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 11. TOOLS & CALCULATORS ═══════ */}
      <ScrollFadeIn>
        <section className="py-4 md:py-14 bg-slate-50">
          <div className="container-custom">
            <p className="text-[0.62rem] md:text-xs text-slate-400 text-center uppercase tracking-widest font-semibold mb-1 md:mb-2">Free tools</p>
            <h2 className="text-lg md:text-2xl font-bold text-center mb-3 md:mb-8">Investing Tools &amp; Calculators</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              {[
                { href: "/portfolio-calculator", icon: "calculator", color: "from-violet-600 to-violet-500", shadow: "shadow-violet-500/15", title: "Portfolio Calculator", desc: "See exact fees at every platform" },
                { href: "/switching-calculator", icon: "arrow-right-left", color: "from-emerald-600 to-emerald-500", shadow: "shadow-emerald-500/15", title: "Switching Calculator", desc: "How much are you overpaying?" },
                { href: "/savings-calculator", icon: "piggy-bank", color: "from-blue-600 to-blue-500", shadow: "shadow-blue-500/15", title: "Savings Calculator", desc: "Are you earning enough?" },
                { href: "/compare", icon: "bar-chart", color: "from-amber-500 to-amber-400", shadow: "shadow-amber-500/15", title: "Compare Platforms", desc: "Side-by-side comparison" },
                { href: "/calculators", icon: "bar-chart", color: "from-blue-600 to-blue-500", shadow: "shadow-blue-500/15", title: "All Calculators", desc: "CGT, FX, dividends & more" },
                { href: "/best", icon: "shield-check", color: "from-indigo-600 to-indigo-500", shadow: "shadow-indigo-500/15", title: "Best Platforms", desc: "Top picks by category" },
                { href: "/quiz", icon: "target", color: "from-slate-700 to-slate-600", shadow: "shadow-slate-500/15", title: "Platform Quiz", desc: "Best match in 60 seconds" },
                { href: "/find-advisor", icon: "users", color: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/15", title: "Find Advisor", desc: "Matched to your needs" },
              ].map((tool) => (
                <Link key={tool.href} href={tool.href} className="bg-white border border-slate-200 rounded-xl p-3 md:p-5 hover:shadow-md transition-all group">
                  <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${tool.color} rounded-lg flex items-center justify-center mb-2 md:mb-3 shadow-lg ${tool.shadow}`}>
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

      {/* ═══════ 12. EMAIL CAPTURE ═══════ */}
      <ScrollFadeIn>
        <section className="py-3 md:py-12 bg-white">
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
