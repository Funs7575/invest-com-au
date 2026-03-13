import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Article } from "@/lib/types";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LeadMagnet from "@/components/LeadMagnet";
import Icon from "@/components/Icon";
import HeroLeadCapture from "@/components/HeroLeadCapture";
import AdvisorDirectory from "@/components/AdvisorDirectory";
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
    // Advisor count
    supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    // Featured advisors — expanded for tabbed directory
    supabase
      .from("professionals")
      .select("slug, name, firm_name, type, location_display, location_state, rating, review_count, photo_url, fee_description, specialties, verified")
      .eq("status", "active")
      .eq("verified", true)
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(18),
  ]);

  const brokerCount = brokers?.length || 0;

  // Top 4 platforms for minimal comparison section
  const topPlatforms = ((brokers as Broker[]) || []).slice(0, 4).map(b => ({
    name: b.name,
    slug: b.slug,
    fee: b.asx_fee || "See details",
    type: b.platform_type || "Share Trading",
    feature: b.chess_sponsored ? "CHESS Sponsored" : "ASIC Regulated",
  }));

  // Map article categories to advisor lead targets
  const articleLeadTargets: Record<string, { label: string; href: string }> = {
    "Property": { label: "Buyer's Agent", href: "/advisors/buyers-agents" },
    "Property Strategy": { label: "Buyer's Agent", href: "/advisors/buyers-agents" },
    "Insurance": { label: "Insurance Broker", href: "/advisors/insurance-brokers" },
    "Wealth Protection": { label: "Insurance Broker", href: "/advisors/insurance-brokers" },
    "Super": { label: "SMSF Accountant", href: "/advisors/smsf-accountants" },
    "SMSF": { label: "SMSF Accountant", href: "/advisors/smsf-accountants" },
    "Tax": { label: "Tax Agent", href: "/advisors/tax-agents" },
    "Advanced Investing": { label: "Financial Planner", href: "/advisors/financial-planners" },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
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

      {/* ═══════ 1. HERO — Split Layout with Lead Capture ═══════ */}
      <section className="bg-white relative overflow-hidden">
        {/* Premium depth backgrounds */}
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-50 via-transparent to-transparent opacity-80 pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-50 via-transparent to-transparent opacity-80 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 lg:py-24 relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-10 items-center">
            {/* Left Column: Authority text */}
            <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 text-sm font-bold mb-6 md:mb-8 w-max mx-auto lg:mx-0">
                <Icon name="award" size={16} className="text-amber-500" />
                <span>Australia&apos;s Independent Financial Hub</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[4rem] font-extrabold text-slate-900 tracking-tight mb-5 md:mb-6 leading-[1.05]">
                Expert advice,{" "}
                <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-700">
                  verified by us.
                </span>
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-slate-600 mb-8 md:mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                Skip the generic algorithms. Match instantly with Australia&apos;s elite mortgage brokers, buyer&apos;s agents, and specialist financial planners.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 md:gap-8 text-sm font-extrabold text-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                    <Icon name="check-circle" size={20} className="text-emerald-600" />
                  </div>
                  <span className="leading-tight text-left">ASIC Registers<br />Checked</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                    <Icon name="shield-check" size={20} className="text-emerald-600" />
                  </div>
                  <span className="leading-tight text-left">100% Free<br />Matching Service</span>
                </div>
              </div>
            </div>

            {/* Right Column: Lead Capture Widget */}
            <div className="lg:col-span-7 lg:pl-8">
              <HeroLeadCapture />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 2. ADVISOR DIRECTORY — Tabbed with Location Filters ═══════ */}
      <AdvisorDirectory
        advisors={(featuredAdvisors as { slug: string; name: string; firm_name?: string; type: string; location_display?: string; location_state?: string; rating: number; review_count: number; photo_url?: string; specialties: string[]; verified?: boolean }[]) || []}
      />

      {/* ═══════ 3. EOFY SEASONAL BLOCK (March–July) ═══════ */}
      {(() => {
        const month = new Date().getMonth();
        const isEofySeason = month >= 2 && month <= 6;
        if (!isEofySeason) return null;
        return (
          <ScrollFadeIn>
            <section className="py-16 md:py-20 bg-gradient-to-r from-amber-50 to-orange-50 border-y border-amber-200/50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-8 md:mb-12">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <Icon name="calendar" size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">EOFY Tax Planning</h2>
                    <p className="text-sm md:text-base text-amber-700 font-medium mt-1">End-of-financial-year deadline approaching — get your tax strategy sorted</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                  {[
                    { href: "/advisors/tax-agents", icon: "calculator", title: "Find a Tax Agent", desc: "Expert tax planning, deductions, and lodgement. Don't leave money on the table this EOFY." },
                    { href: "/advisors/smsf-accountants", icon: "briefcase", title: "SMSF End-of-Year", desc: "SMSF audit, compliance, and year-end reporting. Ensure your self-managed super is compliant before June 30." },
                    { href: "/advisors/financial-planners", icon: "trending-up", title: "Pre-EOFY Strategy", desc: "Salary sacrifice, contribution caps, and tax-effective investment structuring — before the deadline." },
                  ].map((card) => (
                    <Link key={card.href} href={card.href} className="group bg-white border border-amber-200 rounded-2xl p-6 md:p-8 hover:shadow-lg hover:border-amber-300 transition-all hover:-translate-y-0.5">
                      <div className="flex items-center gap-3 mb-3">
                        <Icon name={card.icon} size={20} className="text-amber-600" />
                        <h3 className="font-extrabold text-base md:text-lg text-slate-900">{card.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{card.desc}</p>
                      <span className="inline-flex items-center gap-1 mt-4 text-sm font-extrabold text-amber-600 group-hover:text-amber-700">
                        Browse experts <Icon name="arrow-right" size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </ScrollFadeIn>
        );
      })()}

      {/* ═══════ 4. CONTENT NEXUS — Dark Section ═══════ */}
      {(articles as Article[])?.length > 0 && (
        <ScrollFadeIn>
          <section className="bg-slate-900 py-16 md:py-24 text-white relative overflow-hidden">
            {/* Radial depth */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500 via-slate-900 to-slate-900 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-12 gap-6 border-b border-slate-800 pb-6 md:pb-8">
                <div className="max-w-2xl">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-3 md:mb-4 tracking-tight">Advanced Strategy &amp; Guides</h2>
                  <p className="text-slate-400 text-base md:text-lg font-medium">Independent insights to help you build wealth efficiently before speaking to a professional.</p>
                </div>
                <Link href="/articles" className="text-amber-500 font-bold hover:text-amber-400 transition-colors flex items-center gap-2 whitespace-nowrap bg-slate-800 px-5 py-2.5 rounded-lg border border-slate-700 text-sm">
                  View Strategy Library <Icon name="arrow-right" size={16} />
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {(articles as Article[]).slice(0, 3).map((article, idx) => {
                  const isFeatured = idx === 0;
                  const target = articleLeadTargets[article.category || ""] || { label: "Financial Planner", href: "/advisors/financial-planners" };
                  return (
                    <div
                      key={article.id}
                      className={`group cursor-pointer flex flex-col h-full bg-slate-800/50 rounded-[1.5rem] border transition-all overflow-hidden shadow-lg ${
                        isFeatured ? "border-amber-500 shadow-[0_10px_40px_rgba(245,158,11,0.15)]" : "border-slate-700 hover:border-amber-400"
                      }`}
                    >
                      {article.cover_image_url && (
                        <div className="relative h-48 md:h-56 overflow-hidden">
                          <Image
                            src={article.cover_image_url}
                            alt={article.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80" />
                          {article.category && (
                            <div className={`absolute top-5 left-5 text-xs font-extrabold px-4 py-1.5 rounded-full shadow-md flex items-center gap-2 ${
                              isFeatured ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-white border border-slate-600"
                            }`}>
                              {isFeatured && <Icon name="star" size={12} />}
                              {article.category}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-6 md:p-8 flex flex-col flex-grow relative -mt-4">
                        <Link href={`/article/${article.slug}`}>
                          <h3 className={`text-lg md:text-xl font-extrabold mb-4 leading-snug transition-colors ${
                            isFeatured ? "text-white" : "group-hover:text-amber-400 text-slate-100"
                          }`}>
                            {article.title}
                          </h3>
                        </Link>
                        <div className="mt-auto">
                          <div className="flex items-center gap-4 text-sm font-semibold text-slate-400 mb-5 md:mb-6 border-t border-slate-700 pt-4 md:pt-5">
                            {article.read_time && (
                              <span className="flex items-center gap-1.5">
                                <Icon name="clock" size={16} /> {article.read_time} min
                              </span>
                            )}
                            <span className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <Icon name="shield-check" size={16} /> Verified
                            </span>
                          </div>
                          <Link
                            href={target.href}
                            className={`text-sm font-extrabold px-5 py-3 md:py-3.5 rounded-xl transition-all w-full text-center shadow-sm block ${
                              isFeatured ? "bg-amber-500 hover:bg-amber-400 text-slate-900" : "bg-white hover:bg-slate-100 text-slate-900"
                            }`}
                          >
                            Find a {target.label}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* ═══════ 5. PLATFORM COMPARISON — Minimal "Prefer to DIY?" ═══════ */}
      <ScrollFadeIn>
        <section className="bg-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-12">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 md:mb-3 tracking-tight">Prefer to DIY? Compare Platforms</h2>
                <p className="text-base md:text-lg text-slate-600 font-medium">Compare fees, features, and ratings for {brokerCount}+ Australian investing platforms.</p>
              </div>
              <Link
                href="/compare"
                className="mt-4 md:mt-0 px-6 py-3 border-2 border-slate-200 text-slate-700 font-extrabold rounded-xl hover:border-slate-900 hover:bg-slate-50 transition-all whitespace-nowrap shadow-sm text-sm"
              >
                Compare All {brokerCount} Platforms
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {topPlatforms.map((platform) => (
                <Link
                  key={platform.slug}
                  href={`/broker/${platform.slug}`}
                  className="p-5 md:p-6 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-full bg-slate-50 hover:bg-white relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 transform -translate-y-full group-hover:translate-y-0 transition-transform" />
                  <div>
                    <div className="flex justify-between items-start mb-4 md:mb-5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">{platform.type}</span>
                      <div className="flex items-center gap-1 text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        <Icon name="shield-check" size={12} className="text-emerald-500" />
                        {platform.feature}
                      </div>
                    </div>
                    <h4 className="font-extrabold text-lg text-slate-900 group-hover:text-amber-600 transition-colors mb-2">{platform.name}</h4>
                    <p className="text-sm font-semibold text-slate-600 mb-5 md:mb-6">
                      Brokerage / Fee: <span className="text-slate-900 block mt-1">{platform.fee}</span>
                    </p>
                  </div>
                  <div className="flex items-center text-sm font-extrabold text-slate-900 group-hover:text-amber-600 bg-white border border-slate-200 p-2.5 rounded-lg justify-center transition-colors shadow-sm">
                    View Offer <Icon name="chevron-right" size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 6. CROSS-SELLING JOURNEY ═══════ */}
      <ScrollFadeIn>
        <section className="py-16 md:py-20 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-10 shadow-sm">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Your financial journey doesn&apos;t stop at one step</h2>
              <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-8 font-medium">Most property buyers need multiple professionals. Here&apos;s the typical path:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {[
                  { step: "1", label: "Mortgage Broker", desc: "Secure your home loan", href: "/advisors/mortgage-brokers", color: "bg-rose-50 border-rose-200 text-rose-700" },
                  { step: "2", label: "Buyer's Agent", desc: "Find the right property", href: "/advisors/buyers-agents", color: "bg-teal-50 border-teal-200 text-teal-700" },
                  { step: "3", label: "Insurance Broker", desc: "Protect your investment", href: "/advisors/insurance-brokers", color: "bg-sky-50 border-sky-200 text-sky-700" },
                  { step: "4", label: "Tax Agent", desc: "Structure for efficiency", href: "/advisors/tax-agents", color: "bg-amber-50 border-amber-200 text-amber-700" },
                ].map((item) => (
                  <Link key={item.step} href={item.href} className={`relative border rounded-2xl p-4 md:p-5 ${item.color} hover:shadow-lg transition-all group hover:-translate-y-0.5`}>
                    <span className="absolute -top-2.5 -left-2.5 w-7 h-7 bg-slate-900 text-white text-xs font-extrabold rounded-full flex items-center justify-center shadow-md">{item.step}</span>
                    <p className="font-extrabold text-sm md:text-base mt-1">{item.label}</p>
                    <p className="text-xs md:text-sm opacity-80 mt-0.5">{item.desc}</p>
                    <span className="text-xs font-extrabold mt-2 md:mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Browse <Icon name="arrow-right" size={12} />
                    </span>
                  </Link>
                ))}
              </div>
              {/* Life Events */}
              <div className="mt-6 md:mt-8 pt-5 md:pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-3 font-bold">Need help with a specific life event?</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Navigating Aged Care", href: "/advisors/aged-care-advisors" },
                    { label: "Managing an Inheritance", href: "/advisors/estate-planners" },
                    { label: "Managing Debt", href: "/advisors/debt-counsellors" },
                    { label: "Crypto & Digital Assets", href: "/advisors/crypto-specialists" },
                  ].map((event) => (
                    <Link key={event.label} href={event.href} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 hover:text-slate-900 transition-colors">
                      {event.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 7. TOOLS & CALCULATORS ═══════ */}
      <ScrollFadeIn>
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs text-slate-400 text-center uppercase tracking-widest font-extrabold mb-2">Free tools</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8 md:mb-12 text-slate-900">Investing Tools &amp; Calculators</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
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
                <Link key={tool.href} href={tool.href} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
                  <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${tool.color} rounded-xl flex items-center justify-center mb-3 md:mb-4 shadow-lg ${tool.shadow}`}>
                    <Icon name={tool.icon} size={20} className="text-white" />
                  </div>
                  <h3 className="text-sm md:text-base font-extrabold text-slate-900 mb-0.5 group-hover:text-slate-700">{tool.title}</h3>
                  <p className="text-xs md:text-sm text-slate-500">{tool.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* ═══════ 8. EMAIL CAPTURE ═══════ */}
      <ScrollFadeIn>
        <section className="py-12 md:py-16 bg-[#F8FAFC]">
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            <LeadMagnet />
          </div>
        </section>
      </ScrollFadeIn>
    </div>
  );
}
