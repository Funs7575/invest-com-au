import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Article } from "@/lib/types";
import HomepageSearchBar from "@/components/HomepageSearchBar";
import HomepageComparisonTable from "@/components/HomepageComparisonTable";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LeadMagnet from "@/components/LeadMagnet";
import DealCard from "@/components/DealCard";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import Icon from "@/components/Icon";
// UserOnboarding modal removed — was blocking first-time visitors (P0 conversion issue)

export const metadata = {
  title: "Compare Australian Brokers",
  description:
    "Compare 40+ Australian share trading platforms side-by-side. Real fees, real data, updated daily. Find the broker that fits your situation.",
  openGraph: {
    title: "Compare Australian Brokers — Invest.com.au",
    description: "Compare 40+ Australian share trading platforms side-by-side. Real fees, real data, updated daily.",
    url: "/",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Compare Australian Brokers — Invest.com.au",
    description: "Compare 40+ Australian share trading platforms side-by-side. Real fees, real data, updated daily.",
  },
  alternates: { canonical: "/" },
};

const bestForCards = [
  { icon: "sprout", title: "Best for Beginners", description: "Low fees, simple platforms, educational resources", href: "/best/beginners", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "globe", title: "Best for US Shares", description: "Low FX fees and $0 US brokerage compared", href: "/best/us-shares", color: "bg-slate-50 border-slate-200 text-slate-800" },
  { icon: "coins", title: "Cheapest Brokers", description: "$0 brokerage and verified low-cost options", href: "/best/low-fees", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "shield-check", title: "CHESS-Sponsored", description: "Your shares held in your name on the ASX register", href: "/best/chess-sponsored", color: "bg-slate-50 border-slate-200 text-slate-800" },
  { icon: "building", title: "Best for SMSF", description: "Compliant custody and SMSF account support", href: "/best/smsf", color: "bg-slate-50 border-slate-200 text-slate-800" },
  { icon: "arrow-left-right", title: "Lowest FX Fees", description: "Save on currency conversion for international trades", href: "/best/low-fx-fees", color: "bg-amber-50 border-amber-200 text-amber-800" },
];

export const revalidate = 3600; // ISR: revalidate every hour

export default async function HomePage() {
  const supabase = await createClient();

  const BROKER_LISTING_COLUMNS = "id, name, slug, color, icon, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, status";

  const [{ data: brokers }, { data: articles }] = await Promise.all([
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
  ]);

  const dealBrokers = ((brokers as Broker[]) || []).filter((b) => b.deal).slice(0, 3);

  const brokerCount = brokers?.length || 0;

  // Find the most recent data update across all brokers (for the "Updated" badge)
  const mostRecentUpdate = (brokers as Broker[])?.reduce((latest: string, b: Broker) => {
    const ts = b.updated_at || b.fee_last_checked;
    return ts && ts > latest ? ts : latest;
  }, "") || "";
  const updatedDateStr = mostRecentUpdate
    ? new Date(mostRecentUpdate).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {/* UserOnboarding modal removed — blocked first-time visitors behind a 3-step modal */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Invest.com.au",
            url: "https://invest.com.au",
            description: "Australia's independent broker comparison platform. Compare fees, features, and safety across every major Australian investment platform.",
            sameAs: [],
          }),
        }}
      />

      {/* Hero Section */}
      <section className="relative bg-white border-b border-slate-100 py-5 md:py-14 overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-slate-100 rounded-full text-[0.69rem] md:text-xs font-medium text-slate-600 mb-2.5 md:mb-6 hero-fade-up hero-fade-up-1 border border-slate-200">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-pulse" />
            Updated {updatedDateStr} &middot; {brokerCount} brokers
          </div>
          <h1 className="text-2xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 hero-fade-up hero-fade-up-1 leading-tight">
            Find the Right Broker<br className="hidden sm:block" /> for Your Money
          </h1>
          <p className="mt-2 md:mt-5 text-sm md:text-xl text-slate-500 max-w-2xl mx-auto hero-fade-up hero-fade-up-2 leading-relaxed">
            <span className="md:hidden">Compare {brokerCount}+ ASIC-regulated Australian brokers — free &amp; independent.</span>
            <span className="hidden md:inline">Compare fees, features, and safety across {brokerCount}+ ASIC-regulated Australian investment platforms — independent, transparent, and free.</span>
          </p>
          <div className="hero-fade-up hero-fade-up-3">
            <HomepageSearchBar />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 mt-3 md:mt-6 mb-1 md:mb-2 hero-fade-up hero-fade-up-4">
            <Link
              href="/quiz"
              className="px-5 md:px-7 py-3 md:py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 hover:scale-105 hover:shadow-lg transition-all duration-200 text-sm w-full sm:w-auto text-center"
            >
              Find My Broker — 60sec Quiz &rarr;
            </Link>
            <Link
              href="/compare"
              className="px-5 md:px-7 py-3 md:py-3.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 hover:scale-105 transition-all duration-200 text-sm w-full sm:w-auto text-center"
            >
              Compare All Brokers &rarr;
            </Link>
          </div>
          {/* Social proof */}
          <p className="text-[0.69rem] md:text-sm text-slate-500 mt-2 md:mt-4 hero-fade-up hero-fade-up-5 font-medium">
            Trusted by <span className="text-slate-700 font-bold">10,000+</span> Australian investors
          </p>
          {/* Trust signals — inline row on mobile (smaller), inline row on desktop */}
          <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 sm:gap-x-8 pt-1.5 md:pt-4 text-[0.62rem] md:text-xs text-slate-500 hero-fade-up hero-fade-up-5">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              ASIC-regulated
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Independent
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
              Verified daily
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              Free
            </span>
          </div>
        </div>
      </section>

      {/* Broker Logo Strip — instant credibility */}
      <section className="py-2 md:py-4 bg-white border-b border-slate-100">
        <div className="container-custom">
          <p className="text-[0.62rem] md:text-[0.69rem] uppercase tracking-widest text-slate-500 text-center mb-1.5 md:mb-3 font-medium">Brokers we compare</p>
          {/* Desktop: centered wrap row */}
          <div className="hidden sm:flex items-center justify-center gap-8 flex-wrap opacity-70">
            {(brokers as Broker[])?.slice(0, 6).map((broker) => (
              <div key={broker.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.69rem] font-bold shrink-0" style={{ backgroundColor: broker.color || '#64748b' }}>
                  {broker.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-500">{broker.name}</span>
              </div>
            ))}
          </div>
          {/* Mobile: scrollable row, smaller icons — limited to 5 to prevent overflow */}
          <div className="sm:hidden flex items-center justify-center gap-2 opacity-70 overflow-x-auto scrollbar-hide px-2">
            {(brokers as Broker[])?.slice(0, 5).map((broker) => (
              <div key={broker.id} className="flex items-center gap-1 shrink-0">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[0.62rem] font-bold shrink-0" style={{ backgroundColor: broker.color || '#64748b' }}>
                  {broker.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[0.62rem] font-semibold text-slate-500 whitespace-nowrap">{broker.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <ScrollFadeIn>
        <section className="py-4 sm:py-8 md:py-16 bg-slate-50">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-2 sm:mb-5 md:mb-8">
              <div>
                <h2 className="text-lg md:text-3xl font-bold text-slate-900">
                  Top Rated Brokers
                </h2>
                <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5 md:mt-1">
                  <span className="hidden md:inline">Ranked by fees, features, and user experience<span className="mx-2 text-slate-300">&middot;</span></span>
                  <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="inline" />
                </p>
              </div>
              <Link
                href="/compare"
                className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1"
              >
                View all →
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
            </div>
            <div className="hidden sm:block text-center mt-5 md:mt-8">
              <Link
                href="/compare"
                className="inline-block px-5 md:px-7 py-3 md:py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 hover:scale-105 hover:shadow-lg transition-all duration-200 text-sm"
              >
                View All {brokerCount}+ Brokers &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Email Capture — positioned mid-page for maximum visibility */}
      <ScrollFadeIn>
        <section className="py-4 md:py-12 bg-white">
          <div className="container-custom">
            <div className="max-w-xl mx-auto">
              <LeadMagnet />
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Active Deals Section */}
      {(dealBrokers as Broker[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-4 md:py-12 bg-gradient-to-b from-amber-50/50 to-white">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold">Current Broker Deals</h2>
                  <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5 md:mt-1">
                    <span className="hidden md:inline">Verified promotions from Australian trading platforms</span>
                    <span className="md:hidden">Verified promotions</span>
                  </p>
                </div>
                <Link href="/deals" className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View all →
                </Link>
                <Link href="/deals" className="hidden md:flex text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors min-h-[44px] items-center px-2">
                  View All Deals &rarr;
                </Link>
              </div>
              {/* Desktop: grid of all deals */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dealBrokers as Broker[]).map((broker) => (
                  <DealCard key={broker.id} broker={broker} />
                ))}
              </div>
              {/* Mobile: horizontal snap-scroll carousel */}
              <div className="md:hidden">
                <div className="relative">
                  <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-hide -mx-4 px-4">
                    {(dealBrokers as Broker[]).map((broker) => (
                      <div key={broker.id} className="w-[75vw] shrink-0 snap-start">
                        <DealCard broker={broker} />
                      </div>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-amber-50/80 to-transparent" />
                </div>
              </div>
              <div className="mt-2 md:mt-4">
                <CompactDisclaimerLine />
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Best For Hub */}
      <ScrollFadeIn>
        <section className="py-4 md:py-12 bg-slate-50">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-8">
              <div>
                <h2 className="text-lg md:text-3xl font-bold">Find the Best Broker for You</h2>
                <p className="text-[0.69rem] md:text-base text-slate-500 mt-0.5 md:mt-2">
                  <span className="hidden md:inline">Our category guides rank brokers for your specific situation.</span>
                  <span className="md:hidden">Category guides for your situation</span>
                </p>
              </div>
              <Link href="/best" className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                View all →
              </Link>
            </div>
            {/* Desktop: grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {bestForCards.map((card, i) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`border rounded-xl p-4 md:p-5 active:scale-[0.98] transition-all ${card.color} stagger-item`}
                  style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                >
                  <Icon name={card.icon} size={24} className="mb-2 opacity-80" />
                  <h3 className="font-bold mb-1">{card.title}</h3>
                  <p className="text-sm opacity-80">{card.description}</p>
                </Link>
              ))}
            </div>
            {/* Mobile: 2-col grid, compact */}
            <div className="sm:hidden grid grid-cols-2 gap-2">
              {bestForCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`border rounded-lg p-2.5 active:scale-[0.98] transition-all ${card.color}`}
                >
                  <Icon name={card.icon} size={18} className="mb-1 opacity-80" />
                  <h3 className="font-bold text-xs leading-tight">{card.title}</h3>
                  <p className="text-[0.62rem] opacity-70 leading-snug mt-0.5 line-clamp-2">{card.description}</p>
                </Link>
              ))}
            </div>
            <div className="hidden md:block text-center mt-6">
              <Link
                href="/best"
                className="inline-flex items-center min-h-[44px] px-4 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                Browse All Categories &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Featured Articles */}
      {(articles as Article[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-4 md:py-12 bg-white">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-6">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold">Investing Guides & Articles</h2>
                  <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5 md:mt-1">Expert guides for smarter decisions</p>
                </div>
                <Link href="/articles" className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                  View all →
                </Link>
                <Link href="/articles" className="hidden md:flex text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors min-h-[44px] items-center px-2">
                  View All &rarr;
                </Link>
              </div>
              {/* Desktop: grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(articles as Article[]).slice(0, 6).map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200 group flex flex-col"
                  >
                    {article.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                        <Image src={article.cover_image_url} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {article.category && (
                        <span className="inline-block self-start text-[0.69rem] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full mb-3">
                          {article.category}
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 group-hover:text-slate-600 transition-colors mb-2 leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3 flex-1">{article.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {article.read_time && <span>{article.read_time} min read</span>}
                        <span className="text-slate-900 font-semibold group-hover:translate-x-0.5 transition-transform">Read Guide &rarr;</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Mobile: 2-col compact grid */}
              <div className="md:hidden grid grid-cols-2 gap-2.5">
                {(articles as Article[]).slice(0, 4).map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 group flex flex-col"
                  >
                    {article.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                        <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" sizes="50vw" />
                      </div>
                    )}
                    <div className="p-2.5 flex flex-col flex-1">
                      {article.category && (
                        <span className="inline-block self-start text-[0.62rem] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-px rounded-full mb-1.5">
                          {article.category}
                        </span>
                      )}
                      <h3 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2 mb-1">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[0.62rem] text-slate-500 mt-auto">
                        {article.read_time && <span>{article.read_time} min</span>}
                        <span className="text-slate-900 font-semibold">Read →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* General Advice Warning is in footer Legal & Disclaimers section */}
    </div>
  );
}
