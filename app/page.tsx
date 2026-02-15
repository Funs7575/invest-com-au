import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import TradingGateway from "@/components/TradingGateway";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import CountUp from "@/components/CountUp";
import LeadMagnet from "@/components/LeadMagnet";

export const metadata = {
  title: "Invest.com.au — Australia's Independent Broker Comparison",
  description: "Compare 10+ Australian share trading platforms. Real fees, real data, no bank bias. Find the broker that actually fits your situation.",
};

export default async function HomePage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false })
    .limit(5);

  const { data: dealBrokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('deal', true)
    .eq('status', 'active')
    .limit(1);

  const dealBroker = dealBrokers?.[0];

  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value');

  const settingsMap: Record<string, string> = {};
  settings?.forEach((s: { key: string; value: string | null }) => {
    if (s.value) settingsMap[s.key] = s.value;
  });

  const visitorCount = settingsMap.visitor_count || "52,000+";
  const visitorNumber = parseInt(visitorCount.replace(/[^0-9]/g, "")) || 52000;
  const userRating = settingsMap.user_rating || "4.8/5";
  const ratingNumber = parseFloat(userRating) || 4.8;
  const heroHeadlinePrefix = settingsMap.hero_headline_prefix || "Stop";
  const heroHeadlineHighlight = settingsMap.hero_headline_highlight || "Overpaying";
  const heroHeadlineSuffix = settingsMap.hero_headline_suffix || "Your Broker.";
  const heroSubtitle = settingsMap.hero_subtitle || "Compare 10+ Australian share trading platforms. Real fees, real data, no bank bias. Find the broker that actually fits your situation.";
  const mediaLogos = settingsMap.media_logos || "AFR,News.com.au";

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();
  const monthProgress = Math.round(((lastDay - daysLeft) / lastDay) * 100);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20 relative overflow-hidden">
        <svg
          className="absolute top-0 right-0 opacity-[0.04] pointer-events-none hidden md:block"
          width="400" height="400" viewBox="0 0 400 400" fill="none"
        >
          <circle cx="200" cy="200" r="150" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="200" cy="200" r="120" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="200" cy="200" r="90" stroke="#f59e0b" strokeWidth="2" />
        </svg>
        <svg
          className="absolute top-10 left-10 opacity-[0.06] pointer-events-none hidden md:block"
          width="200" height="200" viewBox="0 0 200 200" fill="none"
        >
          <rect x="20" y="160" width="30" height="20" fill="#f59e0b" />
          <rect x="60" y="130" width="30" height="50" fill="#f59e0b" />
          <rect x="100" y="100" width="30" height="80" fill="#f59e0b" />
          <rect x="140" y="60" width="30" height="120" fill="#f59e0b" />
        </svg>

        <div className="container-custom relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollFadeIn>
              <h1 className="text-5xl font-bold mb-6">
                {heroHeadlinePrefix} <em className="text-amber not-italic">{heroHeadlineHighlight}</em> {heroHeadlineSuffix}
              </h1>
            </ScrollFadeIn>
            <ScrollFadeIn delay={100}>
              <p className="text-xl text-slate-600 mb-8">
                {heroSubtitle}
              </p>
            </ScrollFadeIn>
            <ScrollFadeIn delay={200}>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link
                  href="/compare"
                  className="px-8 py-3 bg-amber text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Compare Brokers
                </Link>
                <Link
                  href="/quiz"
                  className="px-8 py-3 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Take The Quiz
                </Link>
              </div>
            </ScrollFadeIn>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-8 border-y border-slate-200 bg-white">
        <div className="container-custom">
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-center items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-brand">
                  <CountUp end={visitorNumber} suffix="+" />
                </div>
                <div className="text-xs md:text-sm text-slate-600">Australians Trust Us</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-brand">
                  <CountUp end={ratingNumber} suffix="/5" decimals={1} />
                </div>
                <div className="text-xs md:text-sm text-slate-600">Average Rating</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-brand">
                  <CountUp end={100} suffix="%" />
                </div>
                <div className="text-xs md:text-sm text-slate-600">Independent</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="text-xs font-bold text-slate-400">AS SEEN IN:</span>
              {mediaLogos.split(",").map((logo: string) => (
                <span key={logo.trim()} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[0.6rem] font-bold text-slate-400 uppercase tracking-wide">
                  {logo.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Deal of the Month Banner */}
      {dealBroker && (
        <ScrollFadeIn>
          <section className="py-16 bg-slate-50">
            <div className="container-custom">
              <div
                className="rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                }}
              >
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    🔥 Deal of the Month: {dealBroker.name}
                  </h3>
                  <p className="text-slate-800 text-lg mb-3">
                    {dealBroker.deal_text || "Exclusive offer for Invest.com.au readers"}
                  </p>
                  {/* Urgency indicator */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                      </span>
                      {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                    </div>
                    <div className="flex-1 max-w-[200px] h-2 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all"
                        style={{ width: `${monthProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
                <Link
                  href={dealBroker.affiliate_url || `/broker/${dealBroker.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  {dealBroker.cta_text || "Claim Deal →"}
                </Link>
              </div>
            </div>
          </section>
        </ScrollFadeIn>
      )}

      {/* Trading Gateway */}
      <ScrollFadeIn>
        <TradingGateway brokers={brokers || []} />
      </ScrollFadeIn>

      {/* Top Brokers */}
      <section className="py-16">
        <div className="container-custom">
          <ScrollFadeIn>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Top Rated Brokers</h2>
              <span className="text-sm text-slate-500">
                Updated {new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </span>
            </div>
          </ScrollFadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brokers?.map((broker: Broker, i: number) => (
              <ScrollFadeIn key={broker.id} delay={(i % 3) * 100 as 100 | 200 | 300}>
                <Link
                  href={`/broker/${broker.slug}`}
                  className="block border border-slate-200 rounded-lg p-6 hover-lift border-l-4"
                  style={{ borderLeftColor: broker.color || "#f59e0b" }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${broker.color}20`, color: broker.color }}
                      >
                        {broker.icon || broker.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{broker.name}</h3>
                        <p className="text-xs text-slate-500">{broker.tagline}</p>
                      </div>
                    </div>
                    {broker.rating && (
                      <div className="text-amber font-bold text-lg">
                        {broker.rating}★
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600">ASX Fee:</span>
                      <span className="font-semibold">{broker.asx_fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">US Fee:</span>
                      <span className="font-semibold">{broker.us_fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">FX Rate:</span>
                      <span className="font-semibold">{broker.fx_rate != null ? `${broker.fx_rate}%` : "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {broker.chess_sponsored && (
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                        CHESS
                      </span>
                    )}
                    {broker.smsf_support && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                        SMSF
                      </span>
                    )}
                    {broker.deal && (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200">
                        🔥 DEAL
                      </span>
                    )}
                  </div>
                </Link>
              </ScrollFadeIn>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/compare"
              className="text-amber font-semibold hover:underline"
            >
              View All Brokers →
            </Link>
          </div>
        </div>
      </section>

      {/* Email Capture */}
      <ScrollFadeIn>
        <section className="py-16 bg-slate-50">
          <div className="container-custom">
            <div className="max-w-xl mx-auto">
              <LeadMagnet />
            </div>
          </div>
        </section>
      </ScrollFadeIn>
    </div>
  );
}
