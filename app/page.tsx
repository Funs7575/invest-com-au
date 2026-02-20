import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Article } from "@/lib/types";
import HomepageSearchBar from "@/components/HomepageSearchBar";
import HomepageComparisonTable from "@/components/HomepageComparisonTable";
import AuthorByline from "@/components/AuthorByline";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LeadMagnet from "@/components/LeadMagnet";
import SocialProofBar from "@/components/SocialProofBar";
import DealCard from "@/components/DealCard";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";

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
  { emoji: "🌱", title: "Best for Beginners", description: "Low fees, simple platforms, educational resources", href: "/best/beginners", color: "bg-green-50 border-green-200 text-green-800" },
  { emoji: "🇺🇸", title: "Best for US Shares", description: "Low FX fees and $0 US brokerage compared", href: "/best/us-shares", color: "bg-blue-50 border-blue-200 text-blue-800" },
  { emoji: "💰", title: "Cheapest Brokers", description: "$0 brokerage and verified low-cost options", href: "/best/low-fees", color: "bg-amber-50 border-amber-200 text-amber-800" },
  { emoji: "🔐", title: "CHESS-Sponsored", description: "Your shares held in your name on the ASX register", href: "/best/chess-sponsored", color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  { emoji: "🏦", title: "Best for SMSF", description: "Compliant custody and SMSF account support", href: "/best/smsf", color: "bg-violet-50 border-violet-200 text-violet-800" },
  { emoji: "🌏", title: "Lowest FX Fees", description: "Save on currency conversion for international trades", href: "/best/low-fx-fees", color: "bg-sky-50 border-sky-200 text-sky-800" },
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
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-950 hero-fade-up hero-fade-up-1">
            Compare {brokerCount}+ Australian Investment Platforms
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto hero-fade-up hero-fade-up-2">
            We compare the fees and features of every major Australian
            broker — so you don&apos;t have to.
          </p>
          <div className="hero-fade-up hero-fade-up-3">
            <AuthorByline />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 my-6 hero-fade-up hero-fade-up-4">
            <Link
              href="/compare"
              className="px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200 text-sm"
            >
              Compare All Brokers &rarr;
            </Link>
            <Link
              href="/quiz"
              className="px-6 py-3 border border-green-700 text-green-700 font-semibold rounded-lg hover:bg-green-50 hover:scale-105 transition-all duration-200 text-sm"
            >
              Take the 60-sec Quiz &rarr;
            </Link>
          </div>
          <div className="hero-fade-up hero-fade-up-5">
            <HomepageSearchBar />
            <SocialProofBar />
          </div>
        </div>
      </section>

      {/* Where Should I Start? — Intent-based routing for different user types */}
      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="container-custom">
          <h2 className="text-center text-lg font-bold text-slate-800 mb-6">Where should I start?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Link
              href="/quiz"
              className="block bg-white border border-slate-200 rounded-xl p-5 text-center hover:border-green-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="text-3xl mb-2">🆕</div>
              <h3 className="font-bold text-sm mb-1 group-hover:text-green-800 transition-colors">I&apos;m new to investing</h3>
              <p className="text-xs text-slate-500 mb-3">Take our 60-second quiz to find the right broker for you.</p>
              <span className="text-xs font-semibold text-green-700">Start Quiz &rarr;</span>
            </Link>
            <Link
              href="/switch"
              className="block bg-white border border-slate-200 rounded-xl p-5 text-center hover:border-green-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="font-bold text-sm mb-1 group-hover:text-green-800 transition-colors">I want to switch brokers</h3>
              <p className="text-xs text-slate-500 mb-3">See how much you could save by switching to a cheaper platform.</p>
              <span className="text-xs font-semibold text-green-700">Compare Fees &rarr;</span>
            </Link>
            <Link
              href="/compare"
              className="block bg-white border border-slate-200 rounded-xl p-5 text-center hover:border-green-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-bold text-sm mb-1 group-hover:text-green-800 transition-colors">I know what I want</h3>
              <p className="text-xs text-slate-500 mb-3">Compare all brokers side by side on fees, features, and safety.</p>
              <span className="text-xs font-semibold text-green-700">Compare All &rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <ScrollFadeIn>
        <section className="py-12 md:py-16">
          <div className="container-custom">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">
                Top Rated Brokers
              </h2>
              <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck((brokers as Broker[]) || [])} variant="badge" />
            </div>
            <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
            <div className="text-center mt-6">
              <Link
                href="/compare"
                className="inline-block px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200 text-sm"
              >
                View All {brokerCount}+ Brokers →
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
                  <div className="text-2xl mb-2">{card.emoji}</div>
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

      {/* Tools Quick Links */}
      <ScrollFadeIn>
        <section className="py-12 bg-slate-50">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <Link
                href="/quiz"
                className="block border border-slate-200 bg-white rounded-xl p-6 hover-lift stagger-item"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-bold mb-1">Broker Quiz</h3>
                <p className="text-sm text-slate-600">
                  Answer 4 questions to find the best broker for your situation.
                </p>
              </Link>
              <Link
                href="/calculators"
                className="block border border-slate-200 bg-white rounded-xl p-6 hover-lift stagger-item"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="text-3xl mb-2">🧮</div>
                <h3 className="font-bold mb-1">Fee Calculators</h3>
                <p className="text-sm text-slate-600">
                  Calculate trade costs, FX fees, CGT, and franking credits in seconds.
                </p>
              </Link>
              <Link
                href="/versus"
                className="block border border-slate-200 bg-white rounded-xl p-6 hover-lift stagger-item"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="text-3xl mb-2">⚔️</div>
                <h3 className="font-bold mb-1">Head-to-Head</h3>
                <p className="text-sm text-slate-600">
                  Pick two brokers and see who wins on fees, features, and safety.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Trust Stats Bar */}
      <ScrollFadeIn>
        <section className="py-10 bg-white border-y border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-green-800">{brokerCount}+</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Brokers Compared</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-green-800">$0</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Cost to Use</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-green-800">Daily</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Fee Verification</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-extrabold text-green-800">100%</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">Independent Ratings</div>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

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
