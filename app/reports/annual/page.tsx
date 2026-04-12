import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import Icon from "@/components/Icon";
import AnnualReportClient from "./AnnualReportClient";

export const revalidate = 86400; // 24 hours

export const metadata: Metadata = {
  title: `State of Investing in Australia ${CURRENT_YEAR} — Annual Report`,
  description: `The definitive ${CURRENT_YEAR} report on investing in Australia. Broker fee trends, platform popularity, new entrants, and key statistics from ${SITE_NAME}.`,
  openGraph: {
    title: `State of Investing in Australia ${CURRENT_YEAR}`,
    description: `Annual deep-dive into the Australian investing platform landscape: fees, trends, and the year ahead.`,
    images: [
      {
        url: `/api/og?title=State+of+Investing+${CURRENT_YEAR}&subtitle=Annual+Report&type=default`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/reports/annual" },
};

interface BrokerStats {
  totalBrokers: number;
  avgAsxFee: number;
  avgFxRate: number;
  zeroBrokeragePercent: number;
  platformTypes: { type: string; count: number }[];
  topRated: { name: string; slug: string; rating: number }[];
  chessSponsoredPercent: number;
}

async function fetchBrokerStats(): Promise<BrokerStats> {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("name, slug, asx_fee_value, fx_rate, rating, chess_sponsored, platform_type, year_founded")
    .eq("status", "active");

  const all = brokers || [];
  const totalBrokers = all.length;

  // Average ASX brokerage (share brokers only, excluding nulls and zeros for averages)
  const shareBrokers = all.filter((b) => b.platform_type === "share_broker");
  const asxFees = shareBrokers.filter((b) => b.asx_fee_value != null).map((b) => b.asx_fee_value!);
  const avgAsxFee = asxFees.length > 0 ? asxFees.reduce((a, b) => a + b, 0) / asxFees.length : 0;

  // Average FX rate
  const fxRates = shareBrokers.filter((b) => b.fx_rate != null && b.fx_rate > 0).map((b) => b.fx_rate!);
  const avgFxRate = fxRates.length > 0 ? fxRates.reduce((a, b) => a + b, 0) / fxRates.length : 0;

  // % offering $0 brokerage
  const zeroBrokerage = shareBrokers.filter((b) => b.asx_fee_value === 0).length;
  const zeroBrokeragePercent = shareBrokers.length > 0 ? Math.round((zeroBrokerage / shareBrokers.length) * 100) : 0;

  // CHESS sponsored %
  const chessCount = shareBrokers.filter((b) => b.chess_sponsored).length;
  const chessSponsoredPercent = shareBrokers.length > 0 ? Math.round((chessCount / shareBrokers.length) * 100) : 0;

  // Platform type counts
  const typeCounts: Record<string, number> = {};
  all.forEach((b) => {
    typeCounts[b.platform_type] = (typeCounts[b.platform_type] || 0) + 1;
  });
  const platformTypes = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Top rated
  const topRated = [...all]
    .filter((b) => b.rating != null)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5)
    .map((b) => ({ name: b.name, slug: b.slug, rating: b.rating! }));

  return {
    totalBrokers,
    avgAsxFee,
    avgFxRate,
    zeroBrokeragePercent,
    platformTypes,
    topRated,
    chessSponsoredPercent,
  };
}

export default async function AnnualReportPage() {
  const stats = await fetchBrokerStats();

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reports", url: absoluteUrl("/reports") },
    { name: `State of Investing ${CURRENT_YEAR}` },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="container-custom max-w-5xl relative py-12 md:py-20">
          <nav className="text-xs text-slate-400 mb-6 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/reports" className="hover:text-white">Reports</Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">Annual {CURRENT_YEAR}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-300 mb-4">
                <Icon name="bar-chart-2" size={14} />
                Annual Report
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-4">
                The State of Investing<br />
                in Australia <span className="text-emerald-400">{CURRENT_YEAR}</span>
              </h1>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
                A comprehensive look at Australia&apos;s investing platform landscape.
                Fee trends, new entrants, market shifts, and what it all means for your portfolio.
              </p>
            </div>

            {/* Report preview card */}
            <div className="w-full md:w-64 shrink-0">
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6 text-center">
                <Icon name="file-text" size={48} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-white mb-1">Full PDF Report</p>
                <p className="text-xs text-slate-400 mb-4">50+ pages of data and analysis</p>
                <a
                  href="#download"
                  className="block w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  Download Free
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="container-custom max-w-5xl py-10 md:py-14">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
          Key Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
          {[
            {
              label: "Platforms Tracked",
              value: String(stats.totalBrokers),
              icon: "layout",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Avg ASX Brokerage",
              value: `$${stats.avgAsxFee.toFixed(2)}`,
              icon: "dollar-sign",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Avg FX Rate",
              value: `${stats.avgFxRate.toFixed(2)}%`,
              icon: "arrow-left-right",
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "$0 Brokerage",
              value: `${stats.zeroBrokeragePercent}%`,
              icon: "trending-down",
              color: "text-purple-600",
              bg: "bg-purple-50",
              desc: "of share brokers",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-slate-200 rounded-xl p-4 md:p-5"
            >
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon name={stat.icon} size={18} className={stat.color} />
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              {stat.desc && <p className="text-[0.69rem] text-slate-400">{stat.desc}</p>}
            </div>
          ))}
        </div>

        {/* Fee Trends narrative */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-6 md:p-8 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Icon name="trending-down" size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg mb-2">Fee Trends</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                The average ASX brokerage across all tracked share brokers sits at <strong>${stats.avgAsxFee.toFixed(2)}</strong> per trade.
                <strong> {stats.zeroBrokeragePercent}%</strong> of share brokers now offer $0 brokerage on at least some trades &mdash;
                a figure that continues to climb as competition intensifies from neo-brokers.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                FX rates average <strong>{stats.avgFxRate.toFixed(2)}%</strong> for international trades.
                CHESS sponsorship remains available from <strong>{stats.chessSponsoredPercent}%</strong> of share brokers,
                though custody models are increasingly competitive on price.
              </p>
            </div>
          </div>
        </div>

        {/* Most Popular Categories */}
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
          Platform Landscape
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Icon name="pie-chart" size={16} className="text-slate-400" />
              Platforms by Category
            </h3>
            <div className="space-y-2.5">
              {stats.platformTypes.map((pt) => {
                const percentage = stats.totalBrokers > 0 ? Math.round((pt.count / stats.totalBrokers) * 100) : 0;
                return (
                  <div key={pt.type}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium capitalize">{pt.type.replace(/_/g, " ")}</span>
                      <span className="text-slate-500">{pt.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Icon name="star" size={16} className="text-amber-500" />
              Top Rated Platforms
            </h3>
            <div className="space-y-2">
              {stats.topRated.map((br, i) => (
                <Link
                  key={br.slug}
                  href={`/broker/${br.slug}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {br.name}
                  </span>
                  <span className="text-sm font-bold text-emerald-600">{br.rating}/5</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Broker Landscape */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 mb-10">
          <h3 className="font-extrabold text-slate-900 text-lg mb-3 flex items-center gap-2">
            <Icon name="map" size={20} className="text-slate-400" />
            Broker Landscape
          </h3>
          <div className="grid sm:grid-cols-2 gap-6 text-sm text-slate-700 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">New Entrants & Expansion</h4>
              <p>
                The Australian market continues to attract international entrants.
                Neo-brokers are expanding product ranges beyond equities into crypto, options,
                and managed portfolios, blurring the lines between platform categories.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Major Changes</h4>
              <p>
                Fee compression continues across all categories.
                Several established brokers have launched tiered pricing models,
                while others have introduced zero-brokerage tiers to compete with fintech challengers.
              </p>
            </div>
          </div>
        </div>

        {/* Email Gate / Download */}
        <div id="download">
          <AnnualReportClient />
        </div>
      </section>
    </div>
  );
}
