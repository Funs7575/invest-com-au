import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import TradingGateway from "@/components/TradingGateway";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch top 5 brokers (active, highest rated)
  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false })
    .limit(5);

  // Fetch broker with active deal
  const { data: dealBrokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('deal', true)
    .eq('status', 'active')
    .limit(1);

  const dealBroker = dealBrokers?.[0];

  // Fetch site settings for social proof
  const { data: settings } = await supabase
    .from('site_settings')
    .select('key, value');

  const settingsMap: Record<string, string> = {};
  settings?.forEach((s: { key: string; value: string | null }) => {
    if (s.value) settingsMap[s.key] = s.value;
  });

  const visitorCount = settingsMap.visitor_count || "52,000+";
  const userRating = settingsMap.user_rating || "4.8/5";
  const heroHeadlinePrefix = settingsMap.hero_headline_prefix || "Stop";
  const heroHeadlineHighlight = settingsMap.hero_headline_highlight || "Overpaying";
  const heroHeadlineSuffix = settingsMap.hero_headline_suffix || "Your Broker.";
  const heroSubtitle = settingsMap.hero_subtitle || "Compare 10+ Australian share trading platforms. Real fees, real data, no bank bias. Find the broker that actually fits your situation.";
  const mediaLogos = settingsMap.media_logos || "AFR,News.com.au";

  // Calculate days left in current month for deal banner
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-20 relative overflow-hidden">
        {/* Decorative SVGs */}
        <svg
          className="absolute top-0 right-0 opacity-[0.04] pointer-events-none hidden md:block"
          width="400"
          height="400"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle cx="200" cy="200" r="150" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="200" cy="200" r="120" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="200" cy="200" r="90" stroke="#f59e0b" strokeWidth="2" />
          <line x1="200" y1="50" x2="200" y2="70" stroke="#f59e0b" strokeWidth="2" />
          <line x1="200" y1="330" x2="200" y2="350" stroke="#f59e0b" strokeWidth="2" />
          <line x1="50" y1="200" x2="70" y2="200" stroke="#f59e0b" strokeWidth="2" />
          <line x1="330" y1="200" x2="350" y2="200" stroke="#f59e0b" strokeWidth="2" />
        </svg>

        <svg
          className="absolute top-10 left-10 opacity-[0.06] pointer-events-none hidden md:block"
          width="200"
          height="200"
          viewBox="0 0 200 200"
          fill="none"
        >
          <rect x="20" y="160" width="30" height="20" fill="#f59e0b" />
          <rect x="60" y="130" width="30" height="50" fill="#f59e0b" />
          <rect x="100" y="100" width="30" height="80" fill="#f59e0b" />
          <rect x="140" y="60" width="30" height="120" fill="#f59e0b" />
        </svg>

        <div className="container-custom relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              {heroHeadlinePrefix} <em className="text-amber not-italic">{heroHeadlineHighlight}</em> {heroHeadlineSuffix}
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              {heroSubtitle}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/compare"
                className="px-8 py-3 bg-amber text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors"
              >
                Compare Brokers
              </Link>
              <Link
                href="#quiz"
                className="px-8 py-3 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Take The Quiz
              </Link>
            </div>
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
                <div className="text-2xl md:text-3xl font-bold text-brand">{visitorCount}</div>
                <div className="text-xs md:text-sm text-slate-600">Australians Trust Us</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-brand">{userRating}</div>
                <div className="text-xs md:text-sm text-slate-600">Average Rating</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <div className="text-left">
                <div className="text-2xl md:text-3xl font-bold text-brand">100%</div>
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
                <p className="text-slate-800 text-lg mb-2">
                  {dealBroker.deal_text || "Exclusive offer for Invest.com.au readers"}
                </p>
                <p className="text-sm text-slate-700 opacity-80">
                  ⏰ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left this month
                </p>
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
      )}

      {/* Trading Gateway */}
      <TradingGateway brokers={brokers || []} />

      {/* Top Brokers */}
      <section className="py-16">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Top Rated Brokers</h2>
            <span className="text-sm text-slate-500">
              Updated {new Date().toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brokers?.map((broker: Broker) => (
              <Link
                key={broker.id}
                href={`/broker/${broker.slug}`}
                className="border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{broker.name}</h3>
                    <p className="text-sm text-slate-600">{broker.tagline}</p>
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
                    <span className="font-semibold">{broker.fx_rate}%</span>
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
                </div>
              </Link>
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
    </div>
  );
}
