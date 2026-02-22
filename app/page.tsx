import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Article } from "@/lib/types";
import HomepageSearchBar from "@/components/HomepageSearchBar";
import HomepageComparisonTable from "@/components/HomepageComparisonTable";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LeadMagnet from "@/components/LeadMagnet";
import DealCard from "@/components/DealCard";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
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
  { icon: "sprout", title: "Best for Beginners", description: "Low fees, simple platforms, educational resources", href: "/best/beginners", color: "bg-green-50 border-green-200 text-green-800" },
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

  const brokerCount = brokers?.length || 40;

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
      <section className="relative bg-gradient-to-b from-green-950 via-green-900 to-green-800 py-10 md:py-14 overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm1 1v38h38V1H1z\' fill=\'%23fff\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }} />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-green-200 mb-6 hero-fade-up hero-fade-up-1 border border-white/10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Updated {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} &middot; {brokerCount} brokers verified
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white hero-fade-up hero-fade-up-1 leading-tight">
            Find the Right Broker<br className="hidden sm:block" /> for Your Money
          </h1>
          <p className="mt-5 text-lg md:text-xl text-green-100/80 max-w-2xl mx-auto hero-fade-up hero-fade-up-2 leading-relaxed">
            Compare fees, features, and safety across {brokerCount}+ ASIC-regulated Australian investment platforms — independent, transparent, and free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 mb-2 hero-fade-up hero-fade-up-3">
            <Link
              href="/compare"
              className="px-7 py-3.5 bg-white text-green-900 font-bold rounded-xl hover:bg-green-50 hover:scale-105 hover:shadow-lg transition-all duration-200 text-sm"
            >
              Compare All Brokers &rarr;
            </Link>
            <Link
              href="/quiz"
              className="px-7 py-3.5 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 hover:border-white/50 hover:scale-105 transition-all duration-200 text-sm backdrop-blur-sm"
            >
              Take the 60-sec Quiz &rarr;
            </Link>
          </div>
          <div className="hero-fade-up hero-fade-up-4">
            <HomepageSearchBar />
          </div>
          {/* Trust signals row */}
          <div className="flex items-center justify-center gap-5 sm:gap-8 pt-6 text-xs text-green-200/70 flex-wrap hero-fade-up hero-fade-up-5">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              ASIC-regulated only
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              100% independent ratings
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
              Fees verified daily
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
              Always free
            </span>
          </div>
        </div>
      </section>

      {/* Broker Logo Strip — instant credibility */}
      <section className="py-5 bg-white border-b border-slate-100">
        <div className="container-custom">
          <p className="text-[0.65rem] uppercase tracking-widest text-slate-400 text-center mb-4 font-medium">Brokers we compare</p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {(brokers as Broker[])?.slice(0, 8).map((broker) => (
              <div key={broker.id} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.6rem] font-bold`} style={{ backgroundColor: broker.color || '#64748b' }}>
                  {broker.name?.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{broker.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <ScrollFadeIn>
        <section className="py-12 md:py-16 bg-slate-50">
          <div className="container-custom">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                  Top Rated Brokers
                </h2>
                <p className="text-sm text-slate-500 mt-1">Ranked by fees, features, and user experience</p>
              </div>
              <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="badge" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
            </div>
            <div className="text-center mt-8">
              <Link
                href="/compare"
                className="inline-block px-7 py-3.5 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_16px_rgba(21,128,61,0.3)] transition-all duration-200 text-sm"
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
          <section className="py-12 bg-gradient-to-b from-amber-50/50 to-white">
            <div className="container-custom">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Current Broker Deals</h2>
                  <p className="text-sm text-slate-500 mt-1">Verified promotions from Australian trading platforms</p>
                </div>
                <Link href="/deals" className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors">
                  View All Deals &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dealBrokers as Broker[]).map((broker) => (
                  <DealCard key={broker.id} broker={broker} />
                ))}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Best For Hub */}
      <ScrollFadeIn>
        <section className="py-12 bg-slate-50">
          <div className="container-custom">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">Find the Best Broker for You</h2>
              <p className="text-slate-500 mt-2 max-w-lg mx-auto">
                Every investor is different. Our category guides filter and rank brokers for your specific situation.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bestForCards.map((card, i) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`block border rounded-xl p-5 hover-lift ${card.color} stagger-item`}
                  style={{ animationDelay: `${0.05 + i * 0.07}s` }}
                >
                  <Icon name={card.icon} size={24} className="mb-2 opacity-80" />
                  <h3 className="font-bold mb-1">{card.title}</h3>
                  <p className="text-sm opacity-80">{card.description}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Link
                href="/best"
                className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
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
          <section className="py-12 bg-white">
            <div className="container-custom">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Investing Guides & Articles</h2>
                  <p className="text-sm text-slate-500 mt-1">Expert guides to help you make smarter decisions</p>
                </div>
                <Link href="/articles" className="text-sm font-semibold text-green-700 hover:text-green-800 transition-colors">
                  View All Articles &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(articles as Article[]).slice(0, 6).map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="block border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-green-200 transition-all duration-200 group"
                  >
                    {article.category && (
                      <span className="inline-block text-[0.6rem] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full mb-3">
                        {article.category}
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900 group-hover:text-green-800 transition-colors mb-2 leading-snug">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{article.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {article.read_time && <span>{article.read_time} min read</span>}
                      <span className="text-green-600 font-semibold group-hover:translate-x-0.5 transition-transform">Read Guide &rarr;</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Email Capture */}
      <ScrollFadeIn>
        <section className="py-12 bg-slate-50">
          <div className="container-custom">
            <div className="max-w-xl mx-auto">
              <LeadMagnet />
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* General Advice Warning */}
      <section className="py-6 bg-white border-t border-slate-100">
        <div className="container-custom">
          <p className="text-[0.7rem] text-slate-400 text-center leading-relaxed max-w-3xl mx-auto">
            <strong className="text-slate-500">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
