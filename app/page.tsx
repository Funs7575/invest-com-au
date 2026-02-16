import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import MarketTicker from "@/components/MarketTicker";
import HomepageSearchBar from "@/components/HomepageSearchBar";
import HomepageComparisonTable from "@/components/HomepageComparisonTable";
import AuthorByline from "@/components/AuthorByline";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LeadMagnet from "@/components/LeadMagnet";
import SocialProofBar from "@/components/SocialProofBar";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

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

const categoryCards = [
  {
    title: "Beginners",
    description: "Low minimum deposits, easy platforms, educational resources",
    href: "/scenario/beginner",
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
    href: "/scenario/smsf",
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

  const brokerCount = brokers?.length || 40;

  return (
    <div>
      {/* Market Ticker */}
      <MarketTicker />

      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-extrabold text-green-950">
            Compare {brokerCount}+ Australian Investment Platforms
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Stop overpaying. We tracked the hidden fees of every
            ASIC-regulated broker.
          </p>
          <AuthorByline />
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 my-6">
            <Link
              href="/compare"
              className="px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm"
            >
              Compare All Brokers &rarr;
            </Link>
            <Link
              href="/quiz"
              className="px-6 py-3 border border-green-700 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition-colors text-sm"
            >
              Take the 60-sec Quiz &rarr;
            </Link>
          </div>
          <HomepageSearchBar />
          <SocialProofBar />
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
            <HomepageComparisonTable brokers={(brokers as Broker[]) || []} defaultTab="Share Trading" />
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
                  Answer 5 questions and filter brokers based on your priorities.
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
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
