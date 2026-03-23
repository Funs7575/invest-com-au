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
import AdvisorDirectory from "@/components/AdvisorDirectory";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import { ORGANIZATION_JSONLD, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import MobileStickyAdvisorCta from "@/components/MobileStickyAdvisorCta";

export const metadata = {
  title: "Compare Investing Platforms & Find Verified Advisors — Invest.com.au",
  description:
    "Stop overpaying fees. Compare Australian investing platforms side-by-side and find verified mortgage brokers, buyer's agents & financial advisors. Independent, free, no obligation.",
  openGraph: {
    title: "Compare Investing Platforms & Find Verified Advisors — Invest.com.au",
    description: "Stop overpaying fees. Compare Australian investing platforms side-by-side and find verified mortgage brokers, buyer's agents & financial advisors. Independent, free, no obligation.",
    url: "/",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Compare Investing Platforms & Find Verified Advisors — Invest.com.au",
    description: "Stop overpaying fees. Compare Australian investing platforms side-by-side and find verified advisors. Independent, always free.",
  },
  alternates: { canonical: "/" },
};

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

  // Featured platforms for trust strip (top-rated, recognisable logos)
  const featuredPlatforms = ((brokers as Broker[]) || [])
    .filter((b) => b.rating && b.rating >= 4.3 && b.logo_url)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6);

  const mostRecentUpdate = (brokers as Broker[])?.reduce((latest: string, b: Broker) => {
    const ts = b.updated_at || b.fee_last_checked;
    return ts && ts > latest ? ts : latest;
  }, "") || "";

  const updatedMonth = mostRecentUpdate
    ? new Date(mostRecentUpdate).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" });

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
        <div className="container-custom py-5 md:py-8 lg:py-10">
          <div className="max-w-3xl mx-auto text-center">

            {/* Updated badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-white mb-3">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Updated {updatedMonth} &middot; {brokerCount}+ platforms compared
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.1] mb-3 tracking-tight">
              Invest Smarter.{" "}
              <span className="text-amber-500">Pay Less in Fees.</span>
            </h1>

            <p className="text-sm md:text-base text-slate-600 mb-5 leading-relaxed max-w-2xl mx-auto">
              Australia&apos;s free, independent hub to compare {brokerCount}+ investing platforms and find verified financial advisors — no sign-up, no obligation.
            </p>

            {/* Split Router — 4 intent options, all equal weight */}
            <p className="text-[0.7rem] font-bold uppercase tracking-widest text-slate-400 mb-2.5">What are you looking for?</p>
            <div className="grid grid-cols-2 gap-2.5 max-w-xl mx-auto mb-3">
              <Link
                href="/compare"
                className="group flex flex-col items-start gap-1.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all text-left"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-400 rounded-lg flex items-center justify-center shadow-sm shadow-amber-500/20">
                  <Icon name="trending-up" size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Compare Trading Platforms</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">Fees, features &amp; ratings</p>
                </div>
              </Link>
              <Link
                href="/compare?type=savings"
                className="group flex flex-col items-start gap-1.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all text-left"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-sky-400 rounded-lg flex items-center justify-center shadow-sm shadow-sky-500/20">
                  <Icon name="piggy-bank" size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Find a High-Yield Savings Account</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">Best rates right now</p>
                </div>
              </Link>
              <Link
                href="/find-advisor"
                className="group flex flex-col items-start gap-1.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all text-left"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-violet-500 rounded-lg flex items-center justify-center shadow-sm shadow-violet-500/15">
                  <Icon name="users" size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Find a Financial Advisor</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">ASIC-verified, free match</p>
                </div>
              </Link>
              <Link
                href="/property"
                className="group flex flex-col items-start gap-1.5 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all text-left"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-500/15">
                  <Icon name="building" size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-snug">Buy Investment Property</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">Data, agents &amp; loans</p>
                </div>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Icon name="shield-check" size={12} className="text-emerald-500" />
                Independently reviewed — ratings not for sale
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check-circle" size={12} className="text-emerald-500" />
                {brokerCount}+ platforms tested with real accounts
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="check-circle" size={12} className="text-amber-500" />
                Always free — no sign-up required
              </span>
            </div>
          </div>

          {/* Platform logo trust strip */}
          {featuredPlatforms.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-center text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400 mb-2.5">
                Platforms we&apos;ve independently tested &amp; reviewed
              </p>
              <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
                {featuredPlatforms.map((b) => (
                  <Link key={b.slug} href={`/broker/${b.slug}`} className="opacity-60 hover:opacity-100 transition-opacity" title={b.name}>
                    <BrokerLogo broker={b} size="sm" />
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>


      {/* ═══════ 1B. TRUST ANCHOR — E-E-A-T strip ═══════ */}
      <section className="bg-slate-50 border-b border-slate-100 py-3">
        <div className="container-custom">
          <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Icon name="shield-check" size={14} className="text-emerald-500" />
              100% Independent Research
            </span>
            <span className="text-slate-300 hidden sm:block" aria-hidden="true">|</span>
            <span className="flex items-center gap-1.5">
              <Icon name="check-circle" size={14} className="text-emerald-500" />
              ASIC-Verified Professionals
            </span>
            <span className="text-slate-300 hidden sm:block" aria-hidden="true">|</span>
            <span className="flex items-center gap-1.5">
              <Icon name="check-circle" size={14} className="text-emerald-500" />
              Zero Hidden Markups
            </span>
          </div>
        </div>
      </section>

      {/* ═══════ 1C. MONEY ROW — top affiliate promos ═══════ */}
      {dealBrokers.length > 0 && (
        <section className="bg-white border-b border-slate-200 py-3 overflow-x-auto">
          <div className="container-custom">
            <div className="flex items-center gap-2 md:gap-3 flex-nowrap md:flex-wrap md:justify-center">
              <span className="shrink-0 text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400 hidden md:block pr-1">
                Live Deals
              </span>
              {dealBrokers.map((broker) => {
                const affiliateLink = `/go/${broker.slug}`;
                return (
                  <a
                    key={broker.id}
                    href={affiliateLink}
                    target="_blank"
                    rel={AFFILIATE_REL}
                    className="shrink-0 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-amber-400/60 rounded-lg px-3 py-2 transition-all group"
                  >
                    <span className="text-[0.55rem] font-bold uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 rounded-full shrink-0">
                      Verified Promo
                    </span>
                    <BrokerLogo broker={broker} size="xs" />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 whitespace-nowrap max-w-[180px] truncate">
                      {broker.deal_text}
                    </span>
                    <Icon name="arrow-right" size={12} className="text-amber-500 shrink-0" />
                  </a>
                );
              })}
              <a
                href="/deals"
                className="shrink-0 text-[0.7rem] font-semibold text-slate-400 hover:text-amber-500 transition-colors whitespace-nowrap pl-1"
              >
                View all deals &rarr;
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ 2. ALPHA CATCHER — single unified quiz CTA ═══════ */}
      <ScrollFadeIn>
        <section className="py-12 md:py-20 bg-slate-50 border-b border-slate-100">
          <div className="container-custom">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Free assessment — 60 seconds</p>
              <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
                Stop guessing.<br className="hidden sm:block" /> Find the right strategy in 60 seconds.
              </h2>
              <p className="text-slate-500 text-sm md:text-base mb-8 max-w-lg mx-auto leading-relaxed">
                Answer 4 quick questions and we&apos;ll match you with the best platform and advisor for your exact situation — free, no obligation, no sign-up required.
              </p>
              <Link
                href="/start"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-base rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 active:scale-[0.97]"
              >
                Start My Free Assessment
                <Icon name="arrow-right" size={18} />
              </Link>
              <p className="text-slate-400 text-xs mt-4">
                ASIC-verified results &middot; No credit card &middot; Cancel anytime
              </p>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 3. TOP PLATFORMS — SEO data engine ═══════ */}
      <ScrollFadeIn>
        <section className="py-6 md:py-10 bg-white">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-4 md:mb-6">
              <div>
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Icon name="shield-check" size={12} className="text-emerald-500" />
                  Ratings not for sale &middot; independently reviewed
                </p>
                <h2 className="text-xl md:text-3xl font-extrabold text-slate-900">
                  Top Rated Platforms — {updatedMonth}
                </h2>
                <p className="text-xs md:text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                  <span className="hidden md:inline">Ranked by fees, features &amp; user experience &middot;</span>
                  <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="inline" />
                </p>
              </div>
              <Link href="/compare" className="md:hidden text-xs font-semibold text-slate-600 hover:text-slate-900 shrink-0 inline-flex items-center px-1 min-h-[44px]">
                View all &rarr;
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
            </div>
            <div className="hidden sm:block text-center mt-5 md:mt-6">
              <Link
                href="/compare"
                className="inline-block px-6 md:px-8 py-3 md:py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 hover:shadow-md transition-all text-sm"
              >
                View All {brokerCount}+ Platforms &rarr;
              </Link>
              <p className="text-xs text-slate-600 mt-3">
                Not sure which platform suits you?{" "}
                <Link href="/quiz" className="text-amber-600 font-semibold hover:text-amber-700">Take the 60-second quiz</Link>{" "}
                or{" "}
                <Link href="/find-advisor" className="text-amber-600 font-semibold hover:text-amber-700">talk to a financial advisor</Link>{" "}
                — free, no obligation.
              </p>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 4. CURRENT PLATFORM DEALS ═══════ */}
      {(dealBrokers as Broker[])?.length >= 3 && (
        <ScrollFadeIn>
          <section className="py-6 md:py-10 bg-gradient-to-b from-amber-50/60 to-white border-y border-amber-100">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-4 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold text-slate-900">Current Platform Deals</h2>
                  <p className="text-xs md:text-sm text-slate-600 mt-0.5">Verified promotions from Australian trading platforms — {updatedMonth}</p>
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
                          <span className="text-xs text-slate-400">{broker.rating}/5</span>
                        </div>
                        <a href={affiliateLink} target="_blank" rel={AFFILIATE_REL} className="shrink-0 px-3 py-1.5 min-h-[44px] flex items-center bg-amber-500 text-white text-xs font-bold rounded-lg active:scale-[0.98] transition-all">
                          Claim &rarr;
                        </a>
                      </div>
                      <div className="bg-amber-50 rounded-lg px-2.5 py-2 flex items-start gap-1.5">
                        <Icon name="flame" size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 font-medium leading-snug line-clamp-2 flex-1">{broker.deal_text}</p>
                        {isUrgent && daysLeft !== null && (
                          <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse whitespace-nowrap">
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

      {/* ═══════ 5. ADVISOR DIRECTORY ═══════ */}
      <AdvisorDirectory />

      {/* ═══════ 6. ARTICLES & GUIDES ═══════ */}
      {(articles as Article[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-6 md:py-10 bg-white">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-4 md:mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">Learn &amp; Get Expert Help</h2>
                  <p className="text-xs md:text-sm text-slate-600 mt-1">Guides, how-tos, and professional advice for smarter investing</p>
                </div>
                <Link href="/articles" className="text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View all &rarr;
                </Link>
              </div>
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3 flex-1 max-w-[65ch]">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
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
                      <div className="text-xs text-slate-400 shrink-0 mt-1">{article.read_time && <span>{article.read_time} min</span>}</div>
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
        <section className="py-6 md:py-10 bg-slate-50 border-t border-slate-100">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <p className="text-xs text-amber-600 uppercase tracking-widest font-bold mb-1">Free tools</p>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Investing Tools &amp; Calculators</h2>
              </div>
              <Link href="/calculators" className="text-xs md:text-sm font-semibold text-slate-500 hover:text-amber-600 transition-colors shrink-0">
                View All Calculators &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {[
                { href: "/portfolio-calculator", icon: "calculator", color: "from-amber-500 to-amber-400", shadow: "shadow-amber-500/20", title: "Portfolio Calculator", desc: "See exact fees at every platform" },
                { href: "/switching-calculator", icon: "arrow-right-left", color: "from-slate-700 to-slate-600", shadow: "shadow-slate-500/15", title: "Switching Calculator", desc: "How much are you overpaying?" },
                { href: "/savings-calculator", icon: "piggy-bank", color: "from-amber-600 to-amber-500", shadow: "shadow-amber-500/20", title: "Savings Calculator", desc: "Are you earning enough?" },
                { href: "/mortgage-calculator", icon: "home", color: "from-slate-700 to-slate-600", shadow: "shadow-slate-500/15", title: "Borrowing Power", desc: "How much can you borrow?" },
              ].map((tool) => (
                <Link key={tool.href} href={tool.href} className="bg-white border border-slate-200 rounded-xl p-3 md:p-5 hover:shadow-md hover:border-slate-300 transition-all group">
                  <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center mb-2 md:mb-3 shadow-md ${tool.shadow}`}>
                    <Icon name={tool.icon} size={18} className="text-white" />
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-0.5 group-hover:text-slate-700">{tool.title}</h3>
                  <p className="text-xs text-slate-600">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 9. EMAIL CAPTURE ═══════ */}
      <ScrollFadeIn>
        <section className="py-6 md:py-10 bg-white border-t border-slate-100">
          <div className="container-custom">
            <div className="max-w-xl mx-auto">
              <LeadMagnet />
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ MOBILE STICKY CTA (item 68) ═══════ */}
      <MobileStickyAdvisorCta />
    </div>
  );
}
