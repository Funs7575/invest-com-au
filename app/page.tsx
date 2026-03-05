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
import LiveActivityTicker from "@/components/LiveActivityTicker";

import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import { AFFILIATE_REL } from "@/lib/tracking";
import { ORGANIZATION_JSONLD, SITE_URL } from "@/lib/seo";
// UserOnboarding modal removed — was blocking first-time visitors (P0 conversion issue)

export const metadata = {
  title: "Compare Investing Platforms & Find Advisors — Invest.com.au",
  description:
    "Compare Australian share trading platforms, crypto exchanges, super funds, and robo-advisors side-by-side. Find verified financial advisors. Real fees, real data, updated daily.",
  openGraph: {
    title: "Compare Platforms & Find Advisors — Invest.com.au",
    description: "Compare Australian investing platforms and find verified financial advisors. Real fees, real data, updated daily.",
    url: "/",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Compare Platforms & Find Advisors — Invest.com.au",
    description: "Compare Australian investing platforms and find verified financial advisors. Real fees, real data, updated daily.",
  },
  alternates: { canonical: "/" },
};

const bestForCards = [
  { icon: "sprout", title: "Best for Beginners", description: "Low fees, simple platforms, educational resources", href: "/best/beginners", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "globe", title: "Best for US Shares", description: "Low FX fees and $0 US brokerage compared", href: "/best/us-shares", color: "bg-slate-50 border-slate-200 text-slate-800" },
  { icon: "cpu", title: "Best Robo-Advisors", description: "Automated investing with Stockspot, Raiz & more", href: "/best/robo-advisors", color: "bg-violet-50 border-violet-200 text-violet-800" },
  { icon: "building", title: "Best Super Funds", description: "Compare fees, performance & insurance across funds", href: "/best/super-funds", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  { icon: "coins", title: "Lowest Fees", description: "$0 brokerage and verified low-cost options", href: "/best/low-fees", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { icon: "briefcase", title: "Find an Advisor", description: "SMSF accountants, financial planners & tax agents", href: "/find-advisor", color: "bg-violet-50 border-violet-200 text-violet-800" },
  { icon: "bitcoin", title: "Best Crypto Exchanges", description: "AUSTRAC-registered exchanges with AUD deposits", href: "/best/crypto", color: "bg-orange-50 border-orange-200 text-orange-800" },
  { icon: "arrow-left-right", title: "CFD & Forex", description: "ASIC-regulated CFD and forex brokers compared", href: "/best/cfd-forex", color: "bg-rose-50 border-rose-200 text-rose-800" },
];

const categoryStrip = [
  { label: "Shares", href: "/compare?category=shares" },
  { label: "Crypto", href: "/compare?category=crypto" },
  { label: "ETFs", href: "/article/best-etfs-australia" },
  { label: "Super", href: "/best/super-funds" },
  { label: "Robo-Advisors", href: "/best/robo-advisors" },
  { label: "Property", href: "/best/property-investing" },
  { label: "Advisors", href: "/find-advisor" },
  { label: "CFDs", href: "/best/cfd-forex" },
];

export const revalidate = 3600; // ISR: revalidate every hour

export default async function HomePage() {
  const supabase = await createClient();

  const BROKER_LISTING_COLUMNS = "id, name, slug, color, icon, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, status";

  const [{ data: brokers }, { data: articles }, { data: recentFeeChanges }, { data: versusEvents }, { count: advisorCount }] = await Promise.all([
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
    // Recent fee changes for LiveActivityTicker
    supabase
      .from("broker_data_changes")
      .select("broker_slug, field_name, old_value, new_value, changed_at")
      .in("field_name", ["asx_fee", "asx_fee_value", "us_fee", "us_fee_value", "fx_rate", "inactivity_fee"])
      .order("changed_at", { ascending: false })
      .limit(10),
    // Popular versus page views (last 7 days)
    supabase
      .from("analytics_events")
      .select("page, created_at")
      .eq("event_type", "page_view")
      .like("page", "/versus/%")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(500),
    // Advisor count
    supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const dealBrokers = ((brokers as Broker[]) || []).filter((b) => b.deal).slice(0, 3);

  const brokerCount = brokers?.length || 0;

  // Build broker name lookup for fee changes
  const brokerNameMap = new Map(((brokers as Broker[]) || []).map(b => [b.slug, b.name]));

  // Process recent fee changes
  const feeChanges = (recentFeeChanges || [])
    .filter((c: { broker_slug: string }) => brokerNameMap.has(c.broker_slug))
    .slice(0, 5)
    .map((c: { broker_slug: string; field_name: string; old_value: string | null; new_value: string | null; changed_at: string }) => ({
      broker_name: brokerNameMap.get(c.broker_slug) || c.broker_slug,
      broker_slug: c.broker_slug,
      field: c.field_name,
      old_value: c.old_value || "N/A",
      new_value: c.new_value || "N/A",
      changed_at: c.changed_at,
    }));

  // Process popular comparisons — count versus page views and rank
  const versusCounts = new Map<string, number>();
  for (const ev of versusEvents || []) {
    const page = (ev as { page: string }).page;
    if (!page) continue;
    // Extract slug pair from /versus/slug1-vs-slug2 or /versus/slug1,slug2
    const match = page.match(/^\/versus\/(.+)/);
    if (!match) continue;
    const key = match[1];
    versusCounts.set(key, (versusCounts.get(key) || 0) + 1);
  }
  const popularComparisons = Array.from(versusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slugs, count]) => {
      // Parse slug pair — could be "stake-vs-cmc-markets" or "stake,cmc-markets"
      const parts = slugs.includes("-vs-") ? slugs.split("-vs-") : slugs.split(",");
      const names = parts.map(s => brokerNameMap.get(s.trim()) || s.trim().replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
      return { slugs, names, count };
    })
    .filter(c => c.names.length >= 2);

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
                name: "What is CHESS sponsorship and why does it matter?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "CHESS (Clearing House Electronic Subregister System) sponsorship means your shares are held in your name on the ASX register, not in a pooled omnibus account. This provides an extra layer of protection if your broker becomes insolvent.",
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

      {/* Hero Section */}
      <section className="relative bg-white border-b border-slate-100 py-2.5 md:py-14 overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {/* Mobile: premium compact hero */}
          <div className="md:hidden">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full text-[0.6rem] font-medium text-slate-500 mb-2 border border-slate-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {brokerCount} platforms + {(advisorCount || 0) > 0 ? `${advisorCount} advisors` : "verified advisors"}
            </div>
            <h1 className="text-[1.35rem] font-extrabold text-slate-900 leading-[1.2] tracking-tight">
              Compare Platforms.<br />Find Advisors.
            </h1>
            <p className="mt-1 text-[0.7rem] text-slate-500 leading-relaxed">
              Shares, crypto, super, robo-advisors & financial professionals — independent and free.
            </p>
            {/* Category quick-access pills */}
            <div className="flex flex-wrap justify-center gap-1.5 mt-2.5 mb-2.5">
              {categoryStrip.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="px-2.5 py-1 text-[0.6rem] font-semibold rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 active:scale-[0.97] transition-all"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
            {/* CTAs */}
            <div className="flex items-center gap-2">
              <Link
                href="/compare"
                className="flex-1 px-3 py-2.5 bg-slate-900 text-white font-bold rounded-lg text-[0.8rem] text-center active:scale-[0.98] transition-all"
              >
                Compare All
              </Link>
              <Link
                href="/find-advisor"
                className="flex-1 px-3 py-2.5 bg-amber-500 text-white font-bold rounded-lg text-[0.8rem] text-center active:scale-[0.98] transition-all"
              >
                Find Advisor
              </Link>
            </div>
            {/* Secondary CTA */}
            <Link
              href="/quiz"
              className="block text-center mt-2 text-[0.69rem] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Not sure? Take our 60s quiz →
            </Link>
            {/* Trust strip — social proof */}
            <div className="flex items-center justify-center gap-3 mt-3 text-[0.56rem] text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                ASIC-verified fees
              </span>
              <span className="text-slate-300">·</span>
              <span>100% independent</span>
              <span className="text-slate-300">·</span>
              <span>Free forever</span>
            </div>
          </div>
          {/* Desktop: full hero */}
          <div className="hidden md:block">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600 mb-6 hero-fade-up hero-fade-up-1 border border-slate-200">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              {brokerCount} platforms + {(advisorCount || 0) > 0 ? `${advisorCount} advisors` : "verified advisors"} &middot; Updated {updatedDateStr}
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 hero-fade-up hero-fade-up-1 leading-tight">
              Compare Platforms.<br />Find Advisors.
            </h1>
            <p className="mt-5 text-xl text-slate-500 max-w-2xl mx-auto hero-fade-up hero-fade-up-2 leading-relaxed">
              Compare fees, features, and safety across investing platforms — and find verified financial professionals for expert advice. Independent, transparent, and free.
            </p>
            {/* Category strip — desktop only */}
            <div className="flex items-center justify-center flex-wrap gap-2 mt-5 hero-fade-up hero-fade-up-2">
              {categoryStrip.map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    cat.label === "Advisors"
                      ? "border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100"
                      : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
            <div className="hero-fade-up hero-fade-up-3">
              <HomepageSearchBar />
            </div>
            <div className="flex items-center justify-center gap-3 mt-6 mb-2 hero-fade-up hero-fade-up-4">
              <Link
                href="/compare"
                className="px-7 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 hover:scale-105 hover:shadow-lg transition-all duration-200 text-sm"
              >
                Compare Platforms &rarr;
              </Link>
              <Link
                href="/find-advisor"
                className="px-7 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 hover:scale-105 hover:shadow-lg transition-all duration-200 text-sm"
              >
                Find an Advisor &rarr;
              </Link>
              <Link
                href="/quiz"
                className="px-7 py-3.5 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-400 hover:scale-105 transition-all duration-200 text-sm"
              >
                60s Quiz &rarr;
              </Link>
            </div>
            {/* Social proof */}
            <p className="text-sm text-slate-500 mt-4 hero-fade-up hero-fade-up-5 font-medium">
              Trusted by <span className="text-slate-700 font-bold">10,000+</span> Australian investors
            </p>
            {/* Trust signals */}
            <div className="flex items-center justify-center flex-wrap gap-x-8 pt-4 text-xs text-slate-500 hero-fade-up hero-fade-up-5">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                ASIC-regulated
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Independent
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                Verified daily
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-slate-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                Free
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Broker Logo Strip — desktop only */}
      <section className="hidden md:block py-4 bg-white border-b border-slate-100">
        <div className="container-custom">
          <p className="text-[0.69rem] uppercase tracking-widest text-slate-500 text-center mb-3 font-medium">Platforms we compare</p>
          <div className="flex items-center justify-center gap-8 flex-wrap opacity-70">
            {(brokers as Broker[])?.slice(0, 6).map((broker) => (
              <div key={broker.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.69rem] font-bold shrink-0" style={{ backgroundColor: broker.color || '#64748b' }}>
                  {broker.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-slate-500">{broker.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <ScrollFadeIn>
        <section className="py-2.5 sm:py-8 md:py-16 bg-slate-50">
          <div className="container-custom">
            <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-5 md:mb-8">
              <div>
                <h2 className="text-base md:text-3xl font-extrabold text-slate-900">
                  Top Rated Platforms
                </h2>
                <p className="text-[0.62rem] md:text-sm text-slate-400 mt-0.5 md:mt-1 flex items-center gap-1.5">
                  <span className="hidden md:inline">Ranked by fees, features, and user experience<span className="mx-2 text-slate-300">&middot;</span></span>
                  <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="inline" />
                </p>
              </div>
              <Link
                href="/compare"
                className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 inline-flex items-center px-1"
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
                View All {brokerCount}+ Platforms &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Live Activity — fee changes + trending comparisons */}
      {(feeChanges.length > 0 || popularComparisons.length > 0) && (
        <section className="py-2 md:py-6 bg-white">
          <div className="container-custom max-w-xl">
            <LiveActivityTicker
              feeChanges={feeChanges}
              popularComparisons={popularComparisons}
            />
          </div>
        </section>
      )}

      {/* Email Capture */}
      <ScrollFadeIn>
        <section className="py-3 md:py-12 bg-white">
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
              {/* Mobile: compact stacked list — all deals visible, no carousel */}
              <div className="md:hidden space-y-2">
                {(dealBrokers as Broker[]).map((broker) => {
                  const expiryDate = broker.deal_expiry ? new Date(broker.deal_expiry) : null;
                  const daysLeft = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000)) : null;
                  const isUrgent = daysLeft !== null && daysLeft <= 7;
                  const affiliateLink = `/go/${broker.slug}`;
                  return (
                    <div key={broker.id} className="border border-slate-200 rounded-lg p-2.5 bg-white">
                      {/* Row 1: Logo + name + rating + CTA */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <BrokerLogo broker={broker} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-slate-900 truncate">{broker.name}</span>
                            <span className="text-[0.6rem] text-slate-400">{broker.rating}/5</span>
                          </div>
                        </div>
                        <a
                          href={affiliateLink}
                          target="_blank"
                          rel={AFFILIATE_REL}
                          className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-[0.7rem] font-bold rounded-md active:scale-[0.98] transition-all"
                        >
                          Claim →
                        </a>
                      </div>
                      {/* Row 2: Deal text + urgency */}
                      <div className="bg-amber-50/80 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                        <Icon name="flame" size={12} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[0.72rem] text-slate-700 font-medium leading-snug line-clamp-2 flex-1">{broker.deal_text}</p>
                        {isUrgent && daysLeft !== null && (
                          <span className="shrink-0 text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse whitespace-nowrap">
                            {daysLeft}d left
                          </span>
                        )}
                        {!isUrgent && expiryDate && (
                          <span className="shrink-0 text-[0.56rem] text-amber-600 whitespace-nowrap">
                            exp {expiryDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Link href="/deals" className="block text-center text-[0.7rem] font-semibold text-slate-500 hover:text-slate-700 py-1 transition-colors">
                  View all deals →
                </Link>
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
        <section className="py-3 md:py-12 bg-slate-50">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-2 md:mb-8">
              <div>
                <h2 className="text-lg md:text-3xl font-bold">Find the Best Platform for You</h2>
                <p className="text-[0.69rem] md:text-base text-slate-500 mt-0.5 md:mt-2">
                  <span className="hidden md:inline">Our category guides rank platforms for your specific situation.</span>
                  <span className="md:hidden">Category guides for your situation</span>
                </p>
              </div>
              <Link href="/best" className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                View all →
              </Link>
            </div>
            {/* Desktop: grid */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
            {/* Mobile: scrollable cards with descriptions */}
            <div className="sm:hidden -mx-4 px-4">
              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
                {bestForCards.map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className={`border rounded-xl p-3 active:scale-[0.98] transition-all flex-none w-[42vw] snap-start ${card.color}`}
                  >
                    <Icon name={card.icon} size={20} className="opacity-70 mb-1.5" />
                    <h3 className="font-bold text-xs leading-tight mb-0.5">{card.title}</h3>
                    <p className="text-[0.58rem] opacity-60 leading-snug line-clamp-2">{card.description}</p>
                  </Link>
                ))}
              </div>
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
          <section className="py-3 md:py-12 bg-white">
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
                {(articles as Article[]).slice(0, 6).map((article, idx) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200 group flex flex-col"
                  >
                    {article.cover_image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                        <Image src={article.cover_image_url} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" {...(idx < 3 ? { priority: true } : {})} />
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
              {/* Mobile: featured first article + compact list */}
              <div className="md:hidden">
                {/* Featured article with image */}
                {(articles as Article[])[0] && (
                  <Link
                    href={`/article/${(articles as Article[])[0].slug}`}
                    className="block mb-3 rounded-xl overflow-hidden border border-slate-200 group"
                  >
                    {(articles as Article[])[0].cover_image_url && (
                      <div className="aspect-[2/1] overflow-hidden bg-slate-100 relative">
                        <Image
                          src={(articles as Article[])[0].cover_image_url!}
                          alt={(articles as Article[])[0].title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="100vw"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      {(articles as Article[])[0].category && (
                        <span className="text-[0.58rem] font-bold uppercase tracking-wider text-slate-500">
                          {(articles as Article[])[0].category}
                        </span>
                      )}
                      <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 mt-0.5">
                        {(articles as Article[])[0].title}
                      </h3>
                      <p className="text-[0.65rem] text-slate-500 mt-1 line-clamp-2">
                        {(articles as Article[])[0].excerpt}
                      </p>
                    </div>
                  </Link>
                )}
                {/* Remaining articles as compact list */}
                <div className="divide-y divide-slate-100">
                  {(articles as Article[]).slice(1, 5).map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="flex items-start gap-3 py-2.5 group"
                    >
                      <div className="flex-1 min-w-0">
                        {article.category && (
                          <span className="text-[0.58rem] font-bold uppercase tracking-wider text-slate-500">
                            {article.category}
                          </span>
                        )}
                        <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-slate-600 transition-colors">
                          {article.title}
                        </h3>
                      </div>
                      <div className="text-[0.62rem] text-slate-400 shrink-0 mt-1">
                        {article.read_time && <span>{article.read_time} min</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Find an Advisor — cross-sell section */}
      <ScrollFadeIn>
        <section className="py-3 md:py-12 bg-gradient-to-b from-slate-50 to-white">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-2.5 md:mb-6">
              <div>
                <h2 className="text-lg md:text-2xl font-bold">Need Professional Advice?</h2>
                <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5 md:mt-1">
                  <span className="hidden md:inline">Browse verified SMSF accountants, financial planners, and property advisors</span>
                  <span className="md:hidden">Verified financial professionals</span>
                </p>
              </div>
              <Link href="/advisors" className="md:hidden text-[0.69rem] font-semibold text-slate-500 hover:text-slate-900 shrink-0 min-h-[44px] inline-flex items-center px-1">
                Browse all →
              </Link>
            </div>
            {/* Category pills */}
            <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {[
                { label: "SMSF Accountants", href: "/advisors?type=smsf_accountant", icon: "building" },
                { label: "Financial Planners", href: "/advisors?type=financial_planner", icon: "trending-up" },
                { label: "Property Advisors", href: "/advisors?type=property_advisor", icon: "home" },
                { label: "Tax Agents", href: "/advisors?type=tax_agent", icon: "calculator" },
              ].map((cat) => (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 bg-white border border-slate-200 rounded-lg text-[0.65rem] md:text-xs font-semibold text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  <Icon name={cat.icon} size={14} className="text-slate-400" />
                  {cat.label}
                </Link>
              ))}
            </div>
            {/* CTA card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base font-bold text-slate-900 mb-1">Free listings. Pay only per enquiry.</p>
                <p className="text-xs md:text-sm text-slate-500">
                  We connect investors with verified professionals. Request a free consultation — no obligation.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 w-full md:w-auto">
                <Link
                  href="/find-advisor"
                  className="flex-1 md:flex-none text-center px-4 py-2.5 bg-slate-900 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Find My Advisor
                </Link>
                <Link
                  href="/advisors"
                  className="flex-1 md:flex-none text-center px-4 py-2.5 border border-slate-300 text-slate-700 text-xs md:text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Browse All
                </Link>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* General Advice Warning is in footer Legal & Disclaimers section */}
    </div>
  );
}
