import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Article } from "@/lib/types";
import HomepageComparisonTable from "@/components/HomepageComparisonTable";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LeadMagnet from "@/components/LeadMagnet";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import { AFFILIATE_REL } from "@/lib/tracking";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import { ORGANIZATION_JSONLD, SITE_URL } from "@/lib/seo";
import MobileStickyAdvisorCta from "@/components/MobileStickyAdvisorCta";
import { PRIMARY_CTA_HREF, SHOW_EDITORIAL_BADGES, PLATFORM_COMPARE_HEADING, PLATFORM_COMPARE_SUBTEXT, FACTUAL_COMPARISON_DISCLAIMER } from "@/lib/compliance-config";
import ComplianceFooter from "@/components/ComplianceFooter";

export const metadata = {
  title: { absolute: "Compare Platforms, Browse Advisors & Explore Investments — Invest.com.au" },
  description:
    "Australia's independent investing hub. Compare 100+ trading platforms, browse licensed professionals, and explore investment opportunities — businesses for sale, mining, farmland, commercial property & more. Always free.",
  openGraph: {
    title: "Compare Platforms, Browse Advisors & Explore Investments — Invest.com.au",
    description: "Australia's independent investing hub. Compare trading platforms, browse licensed professionals, and explore investment listings. Always free.",
    url: "/",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Compare Platforms, Browse Advisors & Explore Investments — Invest.com.au",
    description: "Australia's independent investing hub. Compare platforms, browse directories, and explore investment listings. Always free.",
  },
  alternates: { canonical: "/" },
};

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createClient();

  const BROKER_LISTING_COLUMNS = "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, status, cpa_value, promoted_placement, affiliate_priority";

  const [{ data: brokers }, { data: articles }, , , { count: listingCount }] = await Promise.all([
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
    supabase
      .from("investment_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
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
                  text: "Look for an ASIC-registered mortgage broker who offers access to multiple lenders, transparent fee disclosure, and specialises in your situation (first home buyer, investor, self-employed). Browse our professional directory at invest.com.au/advisors.",
                },
              },
              {
                "@type": "Question",
                name: "How do I choose between Australian investing platforms?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Compare platforms based on fees, FX rates, available markets, CHESS sponsorship, and features. Use our free 60-second filter tool at ${SITE_URL}/compare to narrow down platforms by your own criteria.`,
                },
              },
            ],
          }),
        }}
      />

      {/* ═══════ 1. HERO ═══════ */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden">
        <div className="container-custom py-8 md:py-14 lg:py-16">
          <div className="max-w-3xl mx-auto text-center">

            {/* Updated badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-white mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              Updated {updatedMonth} &middot; {brokerCount}+ platforms &middot; {listingCount || 55}+ investment listings
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-4 tracking-tight">
              Compare platforms, professionals{" "}
              <span className="text-amber-500">&amp; ways to invest</span>
            </h1>

            <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              Compare fees, browse directories, and explore investment options — built for Australians.
            </p>

            {/* 3-pathway cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-6">
              <Link
                href="/compare"
                className="group flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <Icon name="bar-chart-2" size={20} className="text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Compare Platforms</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">{brokerCount}+ platforms &middot; fees &middot; features</p>
                </div>
              </Link>
              <Link
                href="/advisors"
                className="group flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                  <Icon name="users" size={20} className="text-slate-600 group-hover:text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Browse Professionals</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">Planners &middot; brokers &middot; accountants</p>
                </div>
              </Link>
              <Link
                href="/invest"
                className="group flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                  <Icon name="layers" size={20} className="text-slate-600 group-hover:text-amber-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Explore Investments</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">27 categories &middot; marketplace &middot; guides</p>
                </div>
              </Link>
            </div>

            {/* Trust bar */}
            <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <Icon name="check-circle" size={15} className="text-amber-500" />
                {brokerCount}+ platforms compared
              </span>
              <span className="text-slate-300 hidden sm:block" aria-hidden="true">|</span>
              <span className="flex items-center gap-1.5">
                <Icon name="shield-check" size={15} className="text-amber-500" />
                Licensed professionals directory
              </span>
              <span className="text-slate-300 hidden sm:block" aria-hidden="true">|</span>
              <span className="flex items-center gap-1.5">
                <Icon name="layers" size={15} className="text-amber-500" />
                {listingCount || 55}+ investment listings
              </span>
              <span className="text-slate-300 hidden sm:block" aria-hidden="true">|</span>
              <span className="flex items-center gap-1.5">
                <Icon name="check-circle" size={15} className="text-amber-500" />
                Independent publisher
              </span>
            </div>
          </div>

          {/* Platform logo trust strip */}
          {featuredPlatforms.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="text-center text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Platforms we&apos;ve independently compared
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


      {/* ═══════ TRUST STRIP ═══════ */}
      <section className="bg-slate-50 border-b border-slate-100 py-3">
        <div className="container-custom">
          <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <Icon name="bar-chart-2" size={14} className="text-amber-500" />
              Compare factual platform data
            </span>
            <span className="text-slate-300 hidden sm:block" aria-hidden="true">|</span>
            <span className="flex items-center gap-1.5">
              <Icon name="users" size={14} className="text-amber-500" />
              Browse professional directories
            </span>
            <span className="text-slate-300 hidden sm:block" aria-hidden="true">|</span>
            <span className="flex items-center gap-1.5">
              <Icon name="book-open" size={14} className="text-amber-500" />
              Educational tools for Australian investors
            </span>
          </div>
        </div>
      </section>

      {/* ═══════ 1E. MONEY ROW — top affiliate promos ═══════ */}
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
                      Promotion
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

      {/* ═══════ 3. TOP PLATFORMS — SEO data engine ═══════ */}
      <ScrollFadeIn>
        <section className="py-6 md:py-10 bg-white">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-4 md:mb-6">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Icon name="shield-check" size={12} className="text-amber-500" />
                  Independently published
                </p>
                <h2 className="text-xl md:text-3xl font-extrabold text-slate-900">
                  {PLATFORM_COMPARE_HEADING} — {updatedMonth}
                </h2>
                <p className="text-xs md:text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                  <span className="hidden md:inline">{PLATFORM_COMPARE_SUBTEXT} &middot;</span>
                  <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="inline" />
                </p>
                {!SHOW_EDITORIAL_BADGES && <p className="text-xs text-slate-400 mt-2">{FACTUAL_COMPARISON_DISCLAIMER}</p>}
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
                <Link href={PRIMARY_CTA_HREF} className="text-amber-600 font-semibold hover:text-amber-700">Use the filter tool</Link>{" "}
                or{" "}
                <Link href="/advisors" className="text-amber-600 font-semibold hover:text-amber-700">browse professional directories</Link>,{" "}
                or <Link href="/invest/listings" className="text-amber-600 font-semibold hover:text-amber-700">explore investment listings</Link>{" "}
                — free, no obligation.
              </p>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 6. INVESTMENT MARKETPLACE ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-14 bg-slate-50 border-b border-slate-100">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Investment Marketplace</p>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Explore Investment Categories</h2>
                <p className="text-sm text-slate-600 mt-1">Enquire about real assets across these categories.</p>
              </div>
              <Link href="/invest/listings" className="text-sm font-semibold text-amber-600 hover:text-amber-700 shrink-0">
                View all categories →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { title: "Businesses for Sale", icon: "briefcase", href: "/invest/buy-business/listings", color: "bg-slate-800" },
                { title: "Mining & Resources", icon: "layers", href: "/invest/mining/listings", color: "bg-amber-600" },
                { title: "Farmland & Agriculture", icon: "leaf", href: "/invest/farmland/listings", color: "bg-green-600" },
                { title: "Commercial Property", icon: "building", href: "/invest/commercial-property/listings", color: "bg-blue-600" },
                { title: "Franchise", icon: "star", href: "/invest/franchise/listings", color: "bg-purple-600" },
                { title: "Renewable Energy", icon: "zap", href: "/invest/renewable-energy/listings", color: "bg-teal-600" },
                { title: "Private Credit", icon: "credit-card", href: "/invest/private-credit/listings", color: "bg-indigo-600" },
                { title: "Alternatives", icon: "gem", href: "/invest/alternatives/listings", color: "bg-rose-600" },
              ].map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all text-center"
                >
                  <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm`}>
                    <Icon name={cat.icon} size={18} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{cat.title}</p>
                  <p className="text-xs text-amber-600 font-semibold mt-1">Browse &rarr;</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link
                href="/invest/listings"
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all"
              >
                <Icon name="layers" size={15} />
                View All {listingCount || 55}+ Investment Listings &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 7. PROFESSIONALS SHOWCASE ═══════ */}
      <ScrollFadeIn>
        <section className="py-10 md:py-14 bg-white border-t border-slate-100">
          <div className="container-custom">
            <div className="flex items-start justify-between gap-2 mb-6">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Professional Directories</p>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Browse Licensed Professionals</h2>
                <p className="text-sm text-slate-500 mt-1">Find the right type of professional. Public register details shown where applicable.</p>
              </div>
              <Link href="/advisors" className="text-sm font-semibold text-amber-600 hover:text-amber-700 shrink-0 hidden sm:block">
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { title: "Financial Planners", desc: "Wealth strategy, retirement, investment advice", icon: "briefcase", href: "/advisors/financial-planners", color: "bg-amber-50 text-amber-600 border-amber-100" },
                { title: "Mortgage Brokers", desc: "Compare 30+ lenders, investment loans, refinancing", icon: "home", href: "/advisors/mortgage-brokers", color: "bg-blue-50 text-blue-600 border-blue-100" },
                { title: "SMSF Accountants", desc: "Self-managed super setup, compliance, audit", icon: "calculator", href: "/advisors/smsf-accountants", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                { title: "Tax Agents", desc: "Tax planning, CGT, investment deductions", icon: "file-text", href: "/advisors/tax-agents", color: "bg-violet-50 text-violet-600 border-violet-100" },
                { title: "Buyer's Agents", desc: "Property negotiation, off-market access", icon: "map-pin", href: "/advisors/buyers-agents", color: "bg-rose-50 text-rose-600 border-rose-100" },
                { title: "Insurance Brokers", desc: "Life, income protection, business insurance", icon: "shield", href: "/advisors/insurance-brokers", color: "bg-sky-50 text-sky-600 border-sky-100" },
                { title: "Estate Planners", desc: "Wills, trusts, succession planning", icon: "scroll", href: "/advisors/estate-planners", color: "bg-slate-50 text-slate-600 border-slate-200" },
                { title: "Wealth Managers", desc: "Portfolio management, HNW advisory", icon: "trending-up", href: "/advisors/wealth-managers", color: "bg-amber-50 text-amber-600 border-amber-100" },
              ].map((prof) => (
                <Link
                  key={prof.href}
                  href={prof.href}
                  className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl border ${prof.color} flex items-center justify-center mb-3`}>
                    <Icon name={prof.icon} size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{prof.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{prof.desc}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6 sm:hidden">
              <Link href="/advisors" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                View all professionals &rarr;
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 8. TOOLS & CALCULATORS ═══════ */}
      <ScrollFadeIn>
        <section className="py-6 md:py-10 bg-white border-t border-slate-100">
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

      {/* ═══════ 7. ARTICLES & GUIDES ═══════ */}
      {(articles as Article[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="py-6 md:py-10 bg-slate-50 border-t border-slate-200">
            <div className="container-custom">
              <div className="flex items-start justify-between gap-2 mb-4 md:mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">Latest Investor Guides</h2>
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
              {/* Mobile articles (aria-hidden to prevent duplicate screen reader content) */}
              <div className="md:hidden" aria-hidden="true">
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

      {/* Advisor directory removed — replaced by professionals showcase above tools */}

      {/* ═══════ 10. EMAIL CAPTURE ═══════ */}
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

      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </div>
  );
}
