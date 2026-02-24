import Link from "next/link";
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
  { icon: "sprout", title: "Best for Beginners", description: "Low fees, simple platforms, educational resources", href: "/best/beginners", color: "bg-teal-50 border-teal-200 text-teal-800" },
  { icon: "globe", title: "Best for US Shares", description: "Low FX fees and $0 US brokerage compared", href: "/best/us-shares", color: "bg-blue-50 border-blue-200 text-blue-800" },
  { icon: "coins", title: "Cheapest Brokers", description: "$0 brokerage and verified low-cost options", href: "/best/low-fees", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "shield-check", title: "CHESS-Sponsored", description: "Your shares held in your name on the ASX register", href: "/best/chess-sponsored", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  { icon: "building", title: "Best for SMSF", description: "Compliant custody and SMSF account support", href: "/best/smsf", color: "bg-violet-50 border-violet-200 text-violet-800" },
  { icon: "arrow-left-right", title: "Lowest FX Fees", description: "Save on currency conversion for international trades", href: "/best/low-fx-fees", color: "bg-sky-50 border-sky-200 text-sky-800" },
];

export const revalidate = 3600; // ISR: revalidate every hour

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: brokers }, { data: dealBrokers }, { data: articles }] = await Promise.all([
    supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .order("rating", { ascending: false }),
    supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .eq("deal", true)
      .order("rating", { ascending: false })
      .limit(3),
    supabase
      .from("articles")
      .select("id, title, slug, excerpt, category, read_time, tags")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

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
      <section className="relative bg-white border-b border-slate-100 py-6 md:py-14 overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600 mb-3 md:mb-6 hero-fade-up hero-fade-up-1 border border-slate-200">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Updated {updatedDateStr} &middot; {brokerCount} brokers verified
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 hero-fade-up hero-fade-up-1 leading-tight">
            Find the Right Broker<br className="hidden sm:block" /> for Your Money
          </h1>
          <p className="mt-3 md:mt-5 text-base md:text-xl text-slate-500 max-w-2xl mx-auto hero-fade-up hero-fade-up-2 leading-relaxed">
            Compare fees, features, and safety across {brokerCount}+ ASIC-regulated Australian investment platforms — independent, transparent, and free.
          </p>
          <div className="hero-fade-up hero-fade-up-3">
            <HomepageSearchBar />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 md:mt-6 mb-1 md:mb-2 hero-fade-up hero-fade-up-4">
            <Link
              href="/quiz"
              className="px-5 md:px-7 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 hover:scale-105 hover:shadow-lg transition-all duration-200 text-sm w-full sm:w-auto text-center"
            >
              Find My Broker — 60sec Quiz &rarr;
            </Link>
            <Link
              href="/compare"
              className="px-5 md:px-7 py-3.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 hover:scale-105 transition-all duration-200 text-sm w-full sm:w-auto text-center"
            >
              Compare All Brokers &rarr;
            </Link>
          </div>
          {/* Trust signals — 2×2 grid on mobile, inline row on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-3 sm:gap-8 pt-3 md:pt-6 text-xs text-slate-400 hero-fade-up hero-fade-up-5">
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              ASIC-regulated only
            </span>
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Independent ratings
            </span>
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
              Fees verified daily
            </span>
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              Always free
            </span>
          </div>
        </div>
      </section>

      {/* Broker Logo Strip — instant credibility */}
      <section className="py-2.5 md:py-4 bg-white border-b border-slate-100">
        <div className="container-custom">
          <p className="text-[0.65rem] uppercase tracking-widest text-slate-400 text-center mb-2 md:mb-3 font-medium">Brokers we compare</p>
          {/* Desktop: centered wrap row */}
          <div className="hidden sm:flex items-center justify-center gap-8 flex-wrap opacity-70">
            {(brokers as Broker[])?.slice(0, 6).map((broker) => (
              <div key={broker.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-bold shrink-0" style={{ backgroundColor: broker.color || '#64748b' }}>
                  {broker.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-500">{broker.name}</span>
              </div>
            ))}
          </div>
          {/* Mobile: horizontal snap-scroll */}
          <div className="sm:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 opacity-70">
            {(brokers as Broker[])?.slice(0, 6).map((broker) => (
              <div key={broker.id} className="flex items-center gap-1.5 shrink-0 snap-start">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[0.6rem] font-bold shrink-0" style={{ backgroundColor: broker.color || '#64748b' }}>
                  {broker.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{broker.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <ScrollFadeIn>
        <section className="py-8 md:py-16 bg-slate-50">
          <div className="container-custom">
            <div className="mb-5 md:mb-8">
              <h2 className="text-xl md:text-3xl font-bold text-slate-900">
                Top Rated Brokers
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Ranked by fees, features, and user experience
                <span className="mx-2 text-slate-300">&middot;</span>
                <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="inline" />
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
            </div>
            <div className="text-center mt-5 md:mt-8">
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

      {/* Active Deals Section */}
      {(dealBrokers as Broker[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-8 md:py-12 bg-gradient-to-b from-amber-50/50 to-white">
            <div className="container-custom">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Current Broker Deals</h2>
                  <p className="text-sm text-slate-500 mt-1">Verified promotions from Australian trading platforms</p>
                </div>
                <Link href="/deals" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors min-h-[44px] flex items-center px-2">
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
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4">
                  {(dealBrokers as Broker[]).map((broker) => (
                    <div key={broker.id} className="w-[85vw] shrink-0 snap-start">
                      <DealCard broker={broker} />
                    </div>
                  ))}
                </div>
                {/* Dot indicators */}
                <div className="flex justify-center gap-1.5 mt-1">
                  {(dealBrokers as Broker[]).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                  ))}
                </div>
                <div className="text-center mt-3">
                  <Link
                    href="/deals"
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    View All Deals &rarr;
                  </Link>
                </div>
              </div>
              <div className="mt-4">
                <CompactDisclaimerLine />
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Best For Hub */}
      <ScrollFadeIn>
        <section className="py-8 md:py-12 bg-slate-50">
          <div className="container-custom">
            <div className="text-center mb-5 md:mb-8">
              <h2 className="text-xl md:text-3xl font-bold">Find the Best Broker for You</h2>
              <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2 max-w-lg mx-auto">
                Our category guides rank brokers for your specific situation.
              </p>
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
            {/* Mobile: horizontal snap-scroll showing all 6 */}
            <div className="sm:hidden">
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-hide -mx-4 px-4">
                {bestForCards.map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className={`border rounded-xl p-4 active:scale-[0.98] transition-all ${card.color} w-[72vw] shrink-0 snap-start`}
                  >
                    <Icon name={card.icon} size={22} className="mb-1.5 opacity-80" />
                    <h3 className="font-bold mb-0.5 text-sm">{card.title}</h3>
                    <p className="text-xs opacity-80 leading-snug">{card.description}</p>
                  </Link>
                ))}
              </div>
              <div className="flex justify-center gap-1.5 mt-1">
                {bestForCards.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-slate-500' : 'bg-slate-300'}`} />
                ))}
              </div>
            </div>
            <div className="text-center mt-4 md:mt-6">
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
          <section className="py-8 md:py-12 bg-white">
            <div className="container-custom">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Investing Guides & Articles</h2>
                  <p className="text-sm text-slate-500 mt-1">Expert guides to help you make smarter decisions</p>
                </div>
                <Link href="/articles" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors min-h-[44px] flex items-center px-2">
                  View All &rarr;
                </Link>
              </div>
              {/* Desktop: grid */}
              <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(articles as Article[]).slice(0, 6).map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
                  >
                    {article.category && (
                      <span className="inline-block text-[0.65rem] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full mb-3">
                        {article.category}
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900 group-hover:text-slate-600 transition-colors mb-2 leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{article.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {article.read_time && <span>{article.read_time} min read</span>}
                      <span className="text-slate-900 font-semibold group-hover:translate-x-0.5 transition-transform">Read Guide &rarr;</span>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Mobile: horizontal snap-scroll showing all 6 */}
              <div className="md:hidden">
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-hide -mx-4 px-4">
                  {(articles as Article[]).slice(0, 6).map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 group w-[78vw] shrink-0 snap-start"
                    >
                      {article.category && (
                        <span className="inline-block text-[0.65rem] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full mb-2">
                          {article.category}
                        </span>
                      )}
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-slate-600 transition-colors mb-1.5 leading-snug line-clamp-2">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {article.read_time && <span>{article.read_time} min read</span>}
                        <span className="text-slate-900 font-semibold">Read Guide &rarr;</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="flex justify-center gap-1.5 mt-1">
                  {(articles as Article[]).slice(0, 6).map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-slate-500' : 'bg-slate-300'}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Email Capture */}
      <ScrollFadeIn>
        <section className="py-8 md:py-12 bg-slate-50">
          <div className="container-custom">
            <div className="max-w-xl mx-auto">
              <LeadMagnet />
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* General Advice Warning is in footer Legal & Disclaimers accordion */}
    </div>
  );
}
