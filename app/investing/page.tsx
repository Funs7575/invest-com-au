import type { Metadata } from "next";
import Link from "next/link";
import { CITIES } from "@/lib/cities";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  ORGANIZATION_JSONLD,
  CURRENT_YEAR,
} from "@/lib/seo";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Investing in Australia by City (${CURRENT_YEAR}) — Compare Platforms & Advisors`,
  description: `Explore investing resources for Australia's major cities. Compare share trading platforms, financial advisors, and investment options in Sydney, Melbourne, Brisbane, Perth, and more.`,
  alternates: { canonical: "/investing" },
  openGraph: {
    title: `Investing in Australia by City (${CURRENT_YEAR})`,
    description: `Explore investing resources for Australia's major cities. Compare platforms and find local financial advisors.`,
    url: absoluteUrl("/investing"),
  },
  twitter: { card: "summary_large_image" },
};

export default function InvestingHubPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Investing" },
  ]);

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Investing in Australia by City",
    description: metadata.description,
    url: absoluteUrl("/investing"),
    publisher: ORGANIZATION_JSONLD,
    dateModified: new Date().toISOString().split("T")[0],
  };

  const verticals = [
    { label: "Share Trading", href: "/share-trading", icon: "trending-up" },
    { label: "Crypto Exchanges", href: "/crypto", icon: "bitcoin" },
    { label: "Savings Accounts", href: "/savings", icon: "piggy-bank" },
    { label: "Super Funds", href: "/super", icon: "shield" },
    { label: "CFD & Forex", href: "/cfd", icon: "bar-chart" },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Investing</span>
          </nav>

          {/* Hero */}
          <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
            Investing in Australia by City
          </h1>
          <p className="text-xs md:text-base text-slate-600 mb-6 md:mb-8 max-w-2xl leading-relaxed">
            Explore investing resources tailored to Australia&apos;s major
            cities. Every online broker and platform serves all of Australia, but
            local context matters — from finding nearby financial advisors to
            understanding how your city&apos;s economy shapes investment
            opportunities.
          </p>

          {/* City Grid */}
          <h2 className="text-lg md:text-xl font-bold mb-3">
            Choose Your City
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12">
            {CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/investing/${city.slug}`}
                className="block p-4 md:p-5 border border-slate-200 rounded-xl hover:border-slate-400 hover:shadow-lg hover:scale-[1.02] transition-all bg-white group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base md:text-lg font-bold text-slate-900 group-hover:text-slate-800">
                    {city.name}
                  </h3>
                  <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {city.stateShort}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {city.intro.split(".").slice(0, 1).join(".")}.
                </p>
                <div className="flex items-center gap-2 mt-2 text-[0.6rem] text-slate-400">
                  <span>Pop. {city.population}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Verticals */}
          <h2 className="text-lg md:text-xl font-bold mb-3">
            Browse by Investment Type
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-8 md:mb-10">
            {verticals.map((v) => (
              <Link
                key={v.href}
                href={v.href}
                className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon
                    name={v.icon}
                    size={16}
                    className="text-slate-600"
                  />
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {v.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Find Advisor */}
          <div className="bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-200/60 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1">
              Find a Financial Advisor Near You
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mb-3 leading-relaxed">
              Browse verified financial planners, SMSF accountants, and wealth
              managers across Australia. Free consultation requests, no
              obligation.
            </p>
            <Link
              href="/find-advisor"
              className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Find an Advisor &rarr;
            </Link>
          </div>

          <CompactDisclaimerLine />
        </div>
      </div>
    </>
  );
}
