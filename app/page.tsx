import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import MarketTicker from "@/components/MarketTicker";
import HomepageSearchBar from "@/components/HomepageSearchBar";
import HomepageComparisonTable from "@/components/HomepageComparisonTable";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import CountUp from "@/components/CountUp";
import LeadMagnet from "@/components/LeadMagnet";

export const metadata = {
  title: "Compare Australian Brokers — Invest.com.au",
  description:
    "Compare 40+ Australian share trading platforms side-by-side. Real fees, real data, updated daily. Find the broker that fits your situation.",
};

const categoryCards = [
  {
    title: "Beginners",
    description: "Low minimum deposits, easy platforms, educational resources",
    href: "/scenarios/beginner",
    emoji: "🌱",
    color: "bg-green-50 border-green-200 text-green-800",
  },
  {
    title: "Lowest Fees",
    description: "$0 brokerage and low-cost options for active traders",
    href: "/compare",
    emoji: "💰",
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
  {
    title: "SMSF",
    description: "CHESS-sponsored brokers with SMSF account support",
    href: "/scenarios/smsf",
    emoji: "🏦",
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  {
    title: "Crypto",
    description: "Australian-regulated crypto exchanges for BTC, ETH & more",
    href: "/compare",
    emoji: "₿",
    color: "bg-purple-50 border-purple-200 text-purple-800",
  },
];

export default async function HomePage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .order("rating", { ascending: false });

  const { data: settings } = await supabase
    .from("site_settings")
    .select("key, value");

  const settingsMap: Record<string, string> = {};
  settings?.forEach((s: { key: string; value: string | null }) => {
    if (s.value) settingsMap[s.key] = s.value;
  });

  const visitorCount = settingsMap.visitor_count || "52,000+";
  const visitorNumber =
    parseInt(visitorCount.replace(/[^0-9]/g, "")) || 52000;
  const userRating = settingsMap.user_rating || "4.8/5";
  const ratingNumber = parseFloat(userRating) || 4.8;

  const brokerCount = brokers?.length || 40;

  return (
    <div>
      {/* Market Ticker */}
      <MarketTicker />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-green-50 to-white py-16 md:py-20 relative overflow-hidden">
        {/* Decorative gold accent circles */}
        <svg
          className="absolute top-0 right-0 opacity-[0.06] pointer-events-none hidden md:block"
          width="400" height="400" viewBox="0 0 400 400" fill="none"
        >
          <circle cx="200" cy="200" r="150" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="200" cy="200" r="120" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="200" cy="200" r="90" stroke="#15803d" strokeWidth="2" />
        </svg>
        <div className="container-custom relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollFadeIn>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight text-green-900">
                Compare{" "}
                <span className="text-amber-500">{brokerCount}+</span>{" "}
                Australian Investment Platforms
              </h1>
            </ScrollFadeIn>
            <ScrollFadeIn delay={100}>
              <p className="text-lg text-slate-600 mb-8">
                Real fees. Real data. Updated daily. Find the broker that fits
                your situation.
              </p>
            </ScrollFadeIn>
            <ScrollFadeIn delay={200}>
              <HomepageSearchBar />
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-6 border-y border-green-100 bg-white">
        <div className="container-custom">
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-center items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-green-800">
                  <CountUp end={visitorNumber} suffix="+" />
                </div>
                <div className="text-xs md:text-sm text-slate-600">
                  Australians Compare Here
                </div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-green-100"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-green-800">
                  <CountUp end={ratingNumber} suffix="/5" decimals={1} />
                </div>
                <div className="text-xs md:text-sm text-slate-600">
                  Average Rating
                </div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-green-100"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-green-800">
                  <CountUp end={100} suffix="%" />
                </div>
                <div className="text-xs md:text-sm text-slate-600">
                  Independent
                </div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-green-100"></div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-amber-100 border border-amber-200 rounded text-[0.6rem] font-bold text-amber-700 uppercase tracking-wide">
                🇦🇺 Aussie-Owned
              </span>
              <span className="px-2 py-1 bg-green-50 border border-green-200 rounded text-[0.6rem] font-bold text-green-700 uppercase tracking-wide">
                No Bank Bias
              </span>
            </div>
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
              <span className="text-sm text-slate-500">
                Updated{" "}
                {new Date().toLocaleDateString("en-AU", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <HomepageComparisonTable brokers={(brokers as Broker[]) || []} />
            <div className="text-center mt-6">
              <Link
                href="/compare"
                className="inline-block px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm"
              >
                View All {brokerCount}+ Brokers →
              </Link>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Category Cards */}
      <ScrollFadeIn>
        <section className="py-12 bg-slate-50">
          <div className="container-custom">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Compare by Category
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`block border rounded-xl p-5 hover-lift ${card.color}`}
                >
                  <div className="text-2xl mb-2">{card.emoji}</div>
                  <h3 className="font-bold mb-1">{card.title}</h3>
                  <p className="text-sm opacity-80">{card.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* Quick Links */}
      <ScrollFadeIn>
        <section className="py-12">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <Link
                href="/quiz"
                className="block border border-slate-200 rounded-xl p-6 hover-lift"
              >
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-bold mb-1">Broker Quiz</h3>
                <p className="text-sm text-slate-600">
                  Answer 5 questions and get matched to the right broker for you.
                </p>
              </Link>
              <Link
                href="/versus"
                className="block border border-slate-200 rounded-xl p-6 hover-lift"
              >
                <div className="text-3xl mb-2">⚔️</div>
                <h3 className="font-bold mb-1">Head-to-Head</h3>
                <p className="text-sm text-slate-600">
                  Compare any two brokers side-by-side on fees, features, and safety.
                </p>
              </Link>
              <Link
                href="/calculators"
                className="block border border-slate-200 rounded-xl p-6 hover-lift"
              >
                <div className="text-3xl mb-2">🧮</div>
                <h3 className="font-bold mb-1">Fee Calculators</h3>
                <p className="text-sm text-slate-600">
                  Calculate your real costs — brokerage, FX fees, and franking credits.
                </p>
              </Link>
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
          <p className="text-[0.65rem] text-slate-400 text-center leading-relaxed max-w-3xl mx-auto">
            <strong className="text-slate-500">General Advice Warning:</strong>{" "}
            The information on Invest.com.au is general in nature and does not
            take into account your personal financial situation. It is not
            financial advice. You should consider whether the information is
            appropriate to your needs, and where appropriate, seek professional
            advice from a financial adviser. Past performance is not a reliable
            indicator of future performance.
          </p>
        </div>
      </section>
    </div>
  );
}
